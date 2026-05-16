import dotenv from "dotenv";
import ApiError from './errorHandler.js';
import { Resend } from "resend";



dotenv.config();
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({
  to,
  subject,
  html,
}) => {

    const response =
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to,
        subject,
        html,
      });

    return response;
};