import dotenv from "dotenv";
import ApiError from "./errorHandler.js";

dotenv.config();

const requiredEnv = [
  "BREVO_API_KEY",
  "EMAIL_FROM_ADDRESS",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required email env variable: ${key}`);
  }
}

export const verifyEmailTransporter = async () => {
  try {
    const response = await fetch("https://api.brevo.com/v3/account", {
      method: "GET",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Brevo API verification failed:", data);
      return;
    }

    console.log("Brevo API verified successfully");
  } catch (error) {
    console.error("Brevo API verification failed:", {
      message: error.message,
      cause: error.cause,
    });
  }
};

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: process.env.EMAIL_FROM_NAME || "LibraryMS",
          email: process.env.EMAIL_FROM_ADDRESS,
        },
        to: [
          {
            email: to,
          },
        ],
        subject,
        htmlContent: html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Brevo email sending failed:", data);

      throw new ApiError(
        500,
        data.message || "Failed to send email. Please try again later.",
        false
      );
    }

    return data;
  } catch (error) {
    console.error("Email sending failed:", {
      message: error.message,
      cause: error.cause,
    });

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      500,
      "Failed to send email. Please try again later.",
      false
    );
  }
};