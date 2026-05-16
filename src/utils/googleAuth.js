import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
import ApiError from './errorHandler.js';


dotenv.config();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleToken(token) {
    
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new ApiError(401, "Invalid Google token");
    }
  
    return {
      googleId: payload.sub,
      email: payload.email,
      fullName: payload.name,
      emailVerified: payload.email_verified,
    }
};