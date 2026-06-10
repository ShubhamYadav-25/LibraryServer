import express from "express";
import {
  get_set_csrf_token,
  google_login,
  login,
  logout,
  refresh,
  resend_verification,
  reset_password,
  signup,
  verify_email
} from "../controllers/auth.controller.js";


import {
  resendMailValidator,
  loginValidator,
  signupValidator,
  verifyEmailValidator
} from '../validators/authValidator.js'

import { validateJwtToken } from "../middlewares/validateJwt.middleware.js";
import { validateCsrfToken } from "../middlewares/validateCsrf.middleware.js";
import { validateInputs } from "../middlewares/validationMiddleware.js";
import { loginLimiter, resendMailLimiter, SignupLimiter, verifyEmailLimiter } from "../middlewares/ratelimit.middleware.js";


const router = express.Router();

// Public
router.get("/csrf-token", get_set_csrf_token);

router.post("/register",
  SignupLimiter,
  signupValidator,
  validateInputs,
  signup
);

router.post("/login",
  loginLimiter,
  loginValidator,
  validateInputs,
  login
);

router.post("/resend-verification", 
  resendMailLimiter, 
  resendMailValidator, 
  validateInputs,
  resend_verification
);

router.post(
  "/google",
  loginLimiter,
  google_login
);

router.post(
  "/verify-email",
  verifyEmailLimiter,
  verifyEmailValidator,
  validateInputs,
  verify_email
);
  
router.post("/refresh", refresh);

// Protected
router.post("/logout", validateJwtToken, logout);
router.put("/password", validateJwtToken, reset_password);

export default router;