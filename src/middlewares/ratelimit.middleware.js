import rateLimit from "express-rate-limit";


export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 5 attempts per IP
    message: {
        status: "Error",
        message: "Too many login attempts. Try again after 15 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false
});


export const SignupLimiter = rateLimit({
    windowMs: 3 * 60 * 60 * 1000, // 3 hours
    max: 5, // 5 attempts per IP
    message: {
        status: "Error",
        message: "Too many signup attempts. Try again after 3 hours."
    },
    standardHeaders: true,
    legacyHeaders: false
});


export const ForgetPasswordLimiter = rateLimit({
    windowMs: 3 * 60 * 60 * 1000, // 3 hours
    max: 3, // 3 attempts per IP
    message: {
        status: "Error",
        message: "Too many attempts. Try again after 3 hours."
    },
    standardHeaders: true,
    legacyHeaders: false
});


export const resendMailLimiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 3, // 3 attempts per IP
    message: {
        status: "Error",
        message: "Too many attempts. Try again after 2 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false
});


export const verifyEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many verification attempts. Please try again later.",
    },
});