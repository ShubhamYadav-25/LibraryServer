import express from "express";
import {
  get_set_csrf_token,
  login,
  logout,
  refresh,
  reset_password,
  signup,
} from "../controllers/auth.controller.js";

import { validateJwtToken } from "../middlewares/validateJwt.middleware.js";
import { validateCsrfToken } from "../middlewares/validateCsrf.middleware.js";

const router = express.Router();

// Public
router.get("/csrf-token", get_set_csrf_token);
router.post("/register", signup);
router.post("/login",validateCsrfToken, login);
router.post("/refresh", refresh);

// Protected
router.post("/logout", validateJwtToken, logout);
router.put("/password", validateJwtToken, reset_password);

export default router;