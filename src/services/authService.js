import bcrypt from "bcryptjs";
import pool from '../config/db.js';
import USER_ROLES from "../constants/userRoles.js";
import { generateAccessToken, generateCsrfToken, generateRefreshToken } from '../utils/token.js';
import * as authRepository from '../repositories/authRepository.js';
import { getUser, getUserbyEmail,
    createUser, createStudent,
    getStudentId,
    getStudentSeq,
    updateStudentSeq
} from '../repositories/userRepository.js';
import ApiError from '../utils/errorHandler.js';
import { verifyGoogleToken } from '../utils/googleAuth.js'
import { sendEmail } from "../utils/email.js";
import { verificationTemplate, welcomeTemplate } from "../constants/mailTemplate.js";
import crypto from 'crypto';




const normalizeRequestedRole = (role) => {
    const normalizedRole = String(role || "").trim().toLowerCase();

    switch (normalizedRole) {
        case "admin":
            return USER_ROLES.ADMIN;
        case "student":
            return USER_ROLES.STUDENT;
        case "librarian":
            return USER_ROLES.LIBRARIAN;
        case "staff":
            return USER_ROLES.STAFF;
        default:
            throw new ApiError(400, "Invalid user role provided");
    }
};


export const verifyRefreshToken = async (refreshToken) => {
    if (!refreshToken) {
        throw new ApiError(401, "Invalid or expired session");
    }

    const [token_id, ...rest] = refreshToken.split('.');
    const secret = rest.join('.');

    if (!token_id || !secret) {
        throw new ApiError(401, "Invalid or expired session");
    }

    const storedToken = await authRepository.getStoredToken(token_id);

    const dummyHash = "$2b$10$invalidinvalidinvalidinvalidinv";
    const hashToCompare = storedToken?.token_hash || dummyHash;

    const isValid = await bcrypt.compare(secret, hashToCompare);

    if (!storedToken || !isValid) {
        throw new ApiError(401, "Invalid or expired session");
    }

    const now = Date.now();
    if (
        storedToken.revoked === 1 ||
        new Date(storedToken.expires_at).getTime() < now
    ) {
        await authRepository.revokeAllUserTokens(token_id); 
        throw new ApiError(401, "Invalid or expired session");
    }

    return storedToken;
};


export const registerUser = async({firstName, lastName, email, password, role}) =>{
    const connection = await pool.getConnection();
    const name = `${firstName} ${lastName}`;
    const normalizedRole = normalizeRequestedRole(role);
    try {
        await connection.beginTransaction()

        const role_id = await authRepository.getRoleId(normalizedRole, connection);
        if(!role_id) throw new ApiError(400, "Invalid user role provided");

        const user_exist = await getUserbyEmail(email, connection);
        if (user_exist) throw new ApiError(409, "An account with this email already exists");

        const hashedPassword = await bcrypt.hash(password, 10);
        const user_id = await createUser(
        {
          email,
          password: hashedPassword,
          name,
          authProvider: "local",
          isVerified: false,
        },
        connection
        );
        
        await authRepository.assignRole(user_id, role_id, connection);

        switch(normalizedRole){
            case USER_ROLES.STUDENT:
                const startYear = new Date().getFullYear();
                let newSeq = await getStudentSeq(startYear, connection);
                newSeq += 1
                const id = `STU${startYear}${String(newSeq).padStart(3, '0')}`;
                const batch = `${startYear}-${String(startYear + 4).slice(-2)}`;
                
                await createStudent(user_id, id, batch, connection);
                await updateStudentSeq(newSeq,startYear,connection);
                break;

            default:
                break;
        }

        const rawVerificationToken = generateCsrfToken();
        const hashedVerificationToken = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");
        const expiresAt = new Date( Date.now() + 1000 * 60 * 15); // 15 min

        await authRepository.createVerificationToken(
        {
          userId: user_id,
          tokenHash: hashedVerificationToken,
          expiresAt,
        },
            connection
        );
        
        const verificationUrl =`${process.env.FRONTEND_URL}` + `/verify-email?token=${rawVerificationToken}`;

        await sendEmail({
          to: email,
          subject: "Verify your email",
          html: verificationTemplate({
            name,
            verificationUrl,
          }),
        });

        await connection.commit();

        return {
          success: true,
          message:
            "If the email is valid, a verification link has been sent."
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally{
        connection.release();
    }
};


export const loginUser = async ({ email, password }) => {

    if (!email || !password) throw new ApiError(400, "Email and password are required");

    const user = await getUserbyEmail(email);
    if (!user) throw new ApiError(400, "Invalid credentials provided");

    if(!user.is_verified) throw new ApiError(400, "plz verify your gmail" );

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new ApiError(400, "Invalid credentials provided");

    const accessToken = await getAccessToken(user.id, user.role);
    const { tokenId, secret, refreshToken } = generateRefreshToken();
    const hash = await bcrypt.hash(secret, 10);
    await authRepository.saveRefreshToken(user.id, tokenId, hash);

    const payload ={
      userId:user.id,
      role: user.role,
      name: user.full_name
    }

    return { accessToken, refreshToken, payload};
};


export const logoutUser = async ({refreshToken}) => {

    if (!refreshToken) throw new ApiError(400, "Refresh token is required to logout.");
    const storedToken = await verifyRefreshToken(refreshToken);

    await authRepository.deleteStoredToken(storedToken.id);
    return { message: "Logged out successfully" };
};


export const changePassword = async ({user_id, currentPassword, newPassword}) => {

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const user = await getUser(user_id);
        if (!user) throw new ApiError(404, "User profile not found");

        if (currentPassword === newPassword ){ 
            throw new ApiError(400, "New password cannot be the same as the old one.");
        }
        
        if(user.auth_provider === "google"){
            throw new ApiError(404, "Can't change password for google logged users.")
        }
        
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) throw new ApiError(401, "Incorrect current password.");

        const newHash = await bcrypt.hash(newPassword, 10);
        await authRepository.updateUserPassword(user_id, newHash, connection);
        await authRepository.revokeAllUserTokens(user_id, connection);
        await connection.commit();

        return { message: "Password changed successfully. Please login again." };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally{
        connection.release();
    }
};


export const rotateRefreshToken = async(storedToken)=>{
        
    await authRepository.deleteStoredToken(storedToken.id);
    const data = generateRefreshToken();

    const hash = await bcrypt.hash(data.secret, 10);
    await authRepository.saveRefreshToken(storedToken.user_id, data.tokenId, hash);

    return data.refreshToken;
}


export const getAccessToken = async (userId, role) => {

    let payload = {
        id: userId,
        role: role
    };

    switch (role) {
        case USER_ROLES.STUDENT:
            payload.student_id = await getStudentId(userId);
            break;

        default:
            break;
    };

    return generateAccessToken(payload);
};


export const tokenRefresh = async({refreshToken})=>{

    if (!refreshToken) throw new ApiError(401, "Authentication required. Please provide valid credentials.");
    const storedToken = await verifyRefreshToken(refreshToken);

    if(!storedToken?.user_id)throw new ApiError(401, "Session invalid. Please log in again.");
    const user = await getUser(storedToken.user_id);
    const newAccessToken = await getAccessToken(user.id, user.role);
    const newRefreshToken = await rotateRefreshToken(storedToken);

    return {newAccessToken, newRefreshToken};
};


export const loginWithGoogle = async ({ idToken, role }) => {
    const googleUser = await verifyGoogleToken(idToken);
    const normalizedRole = role ? normalizeRequestedRole(role) : null;

    const connection = await pool.getConnection();

    let transactionStarted = false;

    try {
        // Fetch existing user with roles
        let user = await getUserbyEmail(googleUser.email);

        if (user && !user.google_id) {
            await authRepository.linkGoogleAccount(
                user.id,
                googleUser.googleId
            );

            user.google_id = googleUser.googleId;
        }

        if (!user) {
            await connection.beginTransaction();
            transactionStarted = true;

            const userId = await authRepository.createGoogleUser(
                {
                    email: googleUser.email,
                    googleId: googleUser.googleId,
                    fullName: googleUser.fullName,
                },
                connection
            );

            const roleId = await authRepository.getRoleId(
                normalizedRole,
                connection
            );

            if (!roleId) {
                throw new ApiError(
                    400,
                    "Invalid user role provided"
                );
            }

            // Assign role
            await authRepository.assignRole(
                userId,
                roleId,
                connection
            );

            switch (normalizedRole) {
                case USER_ROLES.STUDENT: {
                    const startYear = new Date().getFullYear();

                    let newSeq = await getStudentSeq(
                        startYear,
                        connection
                    );

                    newSeq += 1;

                    const studentId =
                        `STU${startYear}${String(newSeq).padStart(3, "0")}`;

                    const batch =
                        `${startYear}-${String(startYear + 4).slice(-2)}`;

                    await createStudent(
                        userId,
                        studentId,
                        googleUser.fullName,
                        batch,
                        connection
                    );

                    await updateStudentSeq(
                        newSeq,
                        startYear,
                        connection
                    );

                    break;
                }

                case USER_ROLES.LIBRARIAN:
                    // TODO: create librarian profile
                    break;

                case USER_ROLES.STAFF:
                    // TODO: create staff profile
                    break;

                case USER_ROLES.ADMIN:
                    // TODO: create admin profile
                    break;

                default:
                    throw new ApiError(
                        400,
                        "Unsupported user role"
                    );
            }

            await connection.commit();
            transactionStarted = false;

            user = {
                id: userId,
                email: googleUser.email,
                full_name: googleUser.fullName,
                google_id: googleUser.googleId,
                role: normalizedRole,
            };
        }

        if (!user.role ) {
            throw new ApiError(
                403,
                "User role information missing"
            );
        }

        const accessToken = await getAccessToken(
            user.id,
            user.role
        );

        const {
            tokenId,
            secret,
            refreshToken,
        } = generateRefreshToken();

        const hash = await bcrypt.hash(secret, 10);

        await authRepository.saveRefreshToken(
            user.id,
            tokenId,
            hash
        );

        const payload = {
            name: user.full_name,
            email: user.email,
            role: user.role,
        };

        return {
            accessToken,
            refreshToken,
            payload,
        };

    } catch (error) {

        if (transactionStarted) {
            await connection.rollback();
        }
        throw error;

    } finally {
        connection.release();
    }
};


export const resendVerificationEmail = async ({email}) => {

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const user = await getUserbyEmail( email, connection);

      if (!user) {
        return ;
      }

      if (user.is_verified) {
        return;
      }

      const recentToken =
        await authRepository.getRecentVerificationToken(
          user.id,
          connection
        );

      if (recentToken) {
        return;
      }

      const rawToken = generateCsrfToken();
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      const expiresAt = new Date( Date.now() + 1000 * 60 * 15);

      await authRepository.deleteUserVerificationTokens(
        user.id,
        connection
      );

      await authRepository.createVerificationToken(
        {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
        connection
      );

      const verificationUrl =`${process.env.FRONTEND_URL}` + `/verify-email?token=${rawToken}`;

      const name = user.full_name || "User";

      try {

        await sendEmail({
          to: user.email,
          subject: "Verify your email",
          html:
            verificationTemplate({
              name,
              verificationUrl,
            }),
        });

      } catch (error) {

        await connection.rollback();
        console.error(
          "Resend verification email failed:",
          error
        );
        throw error
      }

      await connection.commit();

      return {
        success: true,
        message: "If the email is valid, a verification link has been sent."
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
};


export const verifyEmailToken = async (rawToken) => {
    
    if (!rawToken) throw new ApiError(400,"Invalid verification link");
    
    const connection = await pool.getConnection();

    try {

      await connection.beginTransaction();

      const tokenHash =  crypto.createHash("sha256").update(rawToken).digest("hex");

      const verificationRecord = await authRepository.getVerificationToken(tokenHash, connection);

      if (!verificationRecord){
        throw new ApiError( 400,"Invalid or expired verification link");
      }
      const isExpired =new Date( verificationRecord.expires_at) < new Date();

      if (isExpired){
        throw new ApiError( 400, "Invalid or expired verification link");
      }

      await authRepository.markUserVerified(
        verificationRecord.user_id,
        connection
      );

      await authRepository.deleteUserVerificationTokens(
        verificationRecord.user_id,
        connection
      );

      const user =
        await getUser(
          verificationRecord.user_id,
          connection
        );

      await connection.commit();

      try {

        await sendEmail({
          to: user.email,
          subject: "Welcome to LibraryMS",
          html: welcomeTemplate({
              name: user.full_name || "User",
            }),
        });

      } catch (error) {

        console.error(
          "Welcome email failed:",
          error
        );
      }

    } catch (error) {

      await connection.rollback();
      throw error;

    } finally {
      connection.release();
    }
};
