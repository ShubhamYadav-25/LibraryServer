import express from "express";
import { validateJwtToken } from "../middlewares/validateJwt.middleware.js";

// later add RBAC middleware
// import { authorizeRole } from "../middlewares/rbac.middleware.js";


import {
  get_transactions,
  get_all_activities,
  dashboard_stats,
  get_config,
  update_config,
} from "../controllers/Admin.controller.js";

import {
  cancel_request,
  get_all_requests,
  get_students,
} from "../controllers/users.controller.js";

import { get_overdue_books } from "../controllers/books.controller.js";

const router = express.Router();

// All admin routes require login
router.use(validateJwtToken);
// router.use(authorizeRole("admin"));

/* ---------- DASHBOARD ---------- */
router.get("/stats", dashboard_stats);
router.get("/config", get_config);
router.put("/config", update_config);

/* ---------- USERS MANAGEMENT ---------- */
router.get("/users", get_students);

/* ---------- REQUESTS ---------- */
router.get("/requests", get_all_requests);
router.patch("/requests/:requestId", cancel_request);

/* ---------- BOOKS (ADMIN VIEW) ---------- */
router.get("/books/overdue", get_overdue_books);

/* ---------- SYSTEM ---------- */
router.get("/transactions", get_transactions);
router.get("/activities", get_all_activities);

export default router;