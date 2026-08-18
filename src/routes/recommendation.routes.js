import express from "express";
import {
  get_recommendation_model_health,
  get_recommendations,
  get_similar_books,
} from "../controllers/recommendation.controller.js";
import { optionalAuth } from "../middlewares/optionalAuth.middleware.js";
import { validateJwtToken } from "../middlewares/validateJwt.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";
import USER_ROLES from "../constants/userRoles.js";

const router = express.Router();

router.get("/", optionalAuth, get_recommendations);
router.get(
  "/health",
  validateJwtToken,
  authorizeRoles(USER_ROLES.ADMIN, USER_ROLES.LIBRARIAN),
  get_recommendation_model_health
);
router.get("/books/:bookId/similar", optionalAuth, get_similar_books);

export default router;
