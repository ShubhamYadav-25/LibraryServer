import bcrypt from "bcryptjs";
import pool from '../config/db.js';
import USER_ROLES from "../constants/userRoles.js";
import { generateAccessToken, generateRefreshToken } from '../utils/token.js';
import { assignRole, 
    getRoleId,
    getUserRole,
    saveRefreshToken,
    getStoredToken,
    deleteStoredToken,
    revokeAllUserTokens,
    updateUserPassword
} from '../repositories/authRepository.js';
import { getUser, getUserbyEmail,
    createUser, createStudent,
    getStudentId,
    getStudentSeq,
    updateStudentSeq
} from '../repositories/userRepository.js';
import ApiError from '../utils/errorHandler.js';




export const verifyRefreshToken = async (refreshToken) => {
    if (!refreshToken) {
        throw new ApiError(401, "Invalid or expired session");
    }

    const [token_id, ...rest] = refreshToken.split('.');
    const secret = rest.join('.');

    if (!token_id || !secret) {
        throw new ApiError(401, "Invalid or expired session");
    }

    const storedToken = await getStoredToken(token_id);

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
        await revokeAllUserTokens(token_id); 
        throw new ApiError(401, "Invalid or expired session");
    }

    return storedToken;
};


export const registerUser = async({firstName, lastName, email, password, role}) =>{
    const connection = await pool.getConnection();
    const name = String(firstName) + String(lastName);
    try {
        await connection.beginTransaction()

        const role_id = await getRoleId(role, connection);
        if(!role_id) throw new ApiError(400, "Invalid user role provided");

        const user_exist = await getUserbyEmail(email, connection);
        if (user_exist) throw new ApiError(409, "An account with this email already exists");

        const hashedPassword = await bcrypt.hash(password, 10);
        const user_id = await createUser(
            email, hashedPassword, connection
        );
        
        await assignRole(user_id, role_id, connection);

        switch(role){
            case USER_ROLES.STUDENT:
                const startYear = new Date().getFullYear();
                let newSeq = await getStudentSeq(startYear, connection);
                newSeq += 1
                const id = `STU${startYear}${String(newSeq).padStart(3, '0')}`;
                const batch = `${startYear}-${String(startYear + 4).slice(-2)}`;
                
                await createStudent(user_id, id, name, batch, connection);
                await updateStudentSeq(newSeq,startYear,connection);
                break;

            default:
                break;
        }

        await connection.commit();
        return user_id;

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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new ApiError(400, "Invalid credentials provided");

    const accessToken = await getAccessToken(user.id);
    const { tokenId, secret, refreshToken } = generateRefreshToken();
    const hash = await bcrypt.hash(secret, 10);
    await saveRefreshToken(user.id, tokenId, hash);

    return { accessToken, refreshToken};
};


export const logoutUser = async ({refreshToken}) => {

    if (!refreshToken) throw new ApiError(400, "Refresh token is required to logout.");
    const storedToken = await verifyRefreshToken(refreshToken);

    await deleteStoredToken(storedToken.id);
    return { message: "Logged out successfully" };
};


export const changePassword = async ({user_id, oldPassword, newPassword}) => {

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const user = await getUser(user_id);
        if (!user) throw new ApiError(404, "User profile not found");

        if (oldPassword === newPassword) throw new ApiError(400, "New password cannot be the same as the old one.");
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) throw new ApiError(401, "Incorrect current password.");

        const newHash = await bcrypt.hash(newPassword, 10);
        await updateUserPassword(user_id, newHash, connection);
        await revokeAllUserTokens(user_id, connection);
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
        
    await deleteStoredToken(storedToken.id);
    const data = generateRefreshToken();

    const hash = await bcrypt.hash(data.secret, 10);
    await saveRefreshToken(storedToken.user_id, data.tokenId, hash);

    return data.refreshToken;
}


export const getAccessToken = async (userId) => {

    const role = await getUserRole(userId);
    let payload = {
        id: userId,
        role: role.name
    };

    switch (role.name) {
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
    const newAccessToken = await getAccessToken(storedToken.user_id);
    const newRefreshToken = await rotateRefreshToken(storedToken);

    return {newAccessToken, newRefreshToken};
};
