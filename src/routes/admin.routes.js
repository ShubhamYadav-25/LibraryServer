import express from "express";
import { validateJwtToken } from "../middlewares/validateJwt.middleware.js";
import { authorizeRoles, checkPermission } from "../middlewares/rbac.middleware.js";
import USER_ROLES from "../constants/userRoles.js";
import PERMISSIONS from "../constants/permissions.js";

import {
  get_transactions,
  get_all_activities,
  dashboard_stats,
  get_config,
  update_config,
  get_report_chart,
  get_report_table,
  sync_recommendation_model,
} from "../controllers/Admin.controller.js";

import {
  cancel_request,
  get_all_requests,
  get_students,
} from "../controllers/users.controller.js";

import { get_overdue_books } from "../controllers/books.controller.js";

const router = express.Router();

// All admin routes require login and elevated staff/librarian/admin roles
router.use(validateJwtToken);
router.use(authorizeRoles(USER_ROLES.ADMIN, USER_ROLES.LIBRARIAN, USER_ROLES.STAFF));

/* ---------- DASHBOARD & STATS ---------- */
router.get("/stats", checkPermission(PERMISSIONS.VIEW_REPORTS), dashboard_stats);

/* ---------- SYSTEM CONFIG (ADMIN ONLY) ---------- */
router.get("/config", authorizeRoles(USER_ROLES.ADMIN), get_config);
router.put("/config", authorizeRoles(USER_ROLES.ADMIN), update_config);

/* ---------- USERS MANAGEMENT ---------- */
router.get("/users", checkPermission(PERMISSIONS.MANAGE_USERS), get_students);

/* ---------- REQUESTS ---------- */
router.get("/requests", checkPermission(PERMISSIONS.MANAGE_USERS), get_all_requests);
router.put("/requests/:requestId", checkPermission(PERMISSIONS.MANAGE_USERS), cancel_request);

/* ---------- BOOKS (ADMIN / STAFF VIEW) ---------- */
router.get("/books/overdue", get_overdue_books);

/* ---------- SYSTEM ---------- */
router.get("/transactions", get_transactions);
router.get("/activities", get_all_activities);
router.post("/recommendations/sync", authorizeRoles(USER_ROLES.ADMIN), sync_recommendation_model);

/* ---------- REPORTS & ANALYTICS ---------- */
router.get("/reports/:reportType/chart", checkPermission(PERMISSIONS.VIEW_REPORTS), get_report_chart);
router.get("/reports/:reportType/table", checkPermission(PERMISSIONS.VIEW_REPORTS), get_report_table);

export default router;