// utils/token.js
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export const generateAccessToken = (user) => {

    return jwt.sign(
        {user},
        process.env.JWT_AUTH_TOKEN,
        { expiresIn: '30m' }
    );
};


export const generateRefreshToken = () => {
    const tokenId = uuidv4();
    const secret = crypto.randomBytes(32).toString('hex');

    const refreshToken = `${tokenId}.${secret}`;

    return { tokenId, secret, refreshToken };
};


export const generateCsrfToken = () => {

    const csrfToken = crypto.randomBytes(32).toString('hex');
    return csrfToken;
};