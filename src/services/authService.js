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



export const verifyRefreshToken = async (refreshToken) => {
    if (!refreshToken) throw new Error("No token provided");

    const parts = refreshToken.split('.');
    if (parts.length !== 2) throw new Error("Bad format");

    const [token_id, secret] = parts;

    const storedToken = await getStoredToken(token_id);
    if (!storedToken) throw new Error("Invalid token");

    if(storedToken?.revoked === 1){
        await revokeAllUserTokens(storedToken.user_id);
        throw new Error("Token compromissed");
    }

    if (new Date(storedToken.expires_at) < new Date()) {
        throw new Error("Refresh token expired");
    }

    const isValid = await bcrypt.compare(secret, storedToken.token_hash);

    if (!isValid) {
        throw new Error("Invalid token secret");
    }

    return storedToken;
};


export const registerUser = async({firstName, lastName, email, password, role}) =>{
    const connection = await pool.getConnection();
    const name = String(firstName) + String(lastName);
    try {
        await connection.beginTransaction()

        const role_id = await getRoleId(role, connection);

        if(!role_id) throw new Error("Invalid role provided");

        const user_exist = await getUserbyEmail(email, connection);

        if (user_exist) throw new Error("Account Already exist");

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

    const user = await getUserbyEmail(email);
    if (!user) throw new Error("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");


    const accessToken = await getAccessToken(user.id);
    // console.log(accessToken);

    const { tokenId, secret, refreshToken } = generateRefreshToken();

    const hash = await bcrypt.hash(secret, 10);
    await saveRefreshToken(user.id, tokenId, hash);

    return { accessToken, refreshToken};
};


export const logoutUser = async ({refreshToken}) => {

    const storedToken = await  verifyRefreshToken(refreshToken);

    // 🗑 delete token (logout)
    await deleteStoredToken(storedToken.id);

    return { message: "Logged out successfully" };
};


export const changePassword = async ({user_id, oldPassword, newPassword}) => {

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const user = await getUser(user_id);
        if (!user) throw new Error("User not found");

        if (oldPassword === newPassword) {
            throw new Error("new password should be different");
        }
        // 🔍 verify old password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) throw new Error("Incorrect old password");

        // 🔐 hash new password
        const newHash = await bcrypt.hash(newPassword, 10);

        // 💾 update password
        await updateUserPassword(user_id, newHash, connection);

        // 🚨 invalidate ALL sessions
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


export const tokenRefresh = async(refreshToken)=>{
    const storedToken = await verifyRefreshToken(refreshToken);

    if(!storedToken?.user_id){
        throw new Error("Invalid refresh token, hi");
    }
    const newAccessToken = await getAccessToken(storedToken.user_id);
    const newRefreshToken = await rotateRefreshToken(storedToken);

    return {newAccessToken, newRefreshToken};

}
