import dotenv from "dotenv";
import nodemailer from "nodemailer";
import ApiError from "./errorHandler.js";

dotenv.config();

const requiredEnv = [
  "BREVO_USER",
  "BREVO_SMTP_KEY",
  "EMAIL_FROM",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required email env variable: ${key}`);
  }
}

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,

  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },

  requireTLS: true,

  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

export const verifyEmailTransporter = async () => {
  try {
    await transporter.verify();
    console.log("Email SMTP transporter verified");
  } catch (error) {
    console.error("Email SMTP verification failed:", {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      message: error.message,
    });
  }
};

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    return info;
  } catch (error) {
    console.error("Email sending failed:", {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      message: error.message,
    });

    throw new ApiError(
      500,
      "Failed to send email. Please try again later.",
      false
    );
  }
};