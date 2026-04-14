import express from "express";
import { validateJwtToken } from "../middlewares/validateJwt.middleware.js";

import {
  get_fines,
  get_requests,
  get_student_activities,
  get_user_detail,
  get_student_stats,
  update_student,
} from "../controllers/users.controller.js";

import { get_user_issued_books } from "../controllers/books.controller.js";

const router = express.Router();

// All user routes require login
router.use(validateJwtToken);

/* ---------- CURRENT USER (SAFE) ---------- */
router.get("/me", get_user_detail);
router.put("/me", update_student);

router.get("/me/activities", get_student_activities);
router.get("/me/stats", get_student_stats);

router.get("/me/books", get_user_issued_books);
router.get("/me/requests", get_requests);
router.get("/me/fines", get_fines);


/* ---------- ADMIN / SHARED ACCESS ---------- */
// (can later protect with RBAC middleware)

router.get("/:userId", get_user_detail);
router.put("/:userId", update_student);

router.get("/:userId/activities", get_student_activities);
router.get("/:userId/stats", get_student_stats);

router.get("/:userId/books", get_user_issued_books);
router.get("/:userId/requests", get_requests);
router.get("/:userId/fines", get_fines);

export default router;
