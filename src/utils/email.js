import dotenv from "dotenv";
import nodemailer from "nodemailer";
import ApiError from "./errorHandler.js";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

export const sendEmail = async ({
  to,
  subject,
  html,
}) => {
  try {

    const response = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    return response;
  } catch (error) {

    throw new ApiError(
      500,
      "Failed to send email. Please try again later.",
      false
    );
  }
};