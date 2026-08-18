import express from "express";
import { validateJwtToken } from "../middlewares/validateJwt.middleware.js";
import { optionalAuth } from "../middlewares/optionalAuth.middleware.js";
import { checkPermission } from "../middlewares/rbac.middleware.js";
import PERMISSIONS from "../constants/permissions.js";

import {
  add_book,
  add_copies,
  delete_comment,
  get_book,
  get_book_rating,
  get_books,
  get_comments,
  get_overdue_books,
  issue_book,
  like_unlike_comment,
  like_dislike_book,
  new_arrivals,
  popular_books,
  rate_book,
  renew_book,
  request_book,
  return_book,
  trending_books,
  unrate_book,
  update_comment,
  write_comment,
  get_genre,
} from "../controllers/books.controller.js";

const router = express.Router();

/* ---------- PUBLIC ROUTES ---------- */
router.get("/", optionalAuth, get_books);
router.get("/new-arrivals", optionalAuth, new_arrivals);
router.get("/trending", optionalAuth, trending_books);
router.get("/popular", optionalAuth, popular_books);
router.get("/genre", optionalAuth, get_genre);

/* ---------- OVERDUE (ADMIN/STAFF VIEW) ---------- */
router.get("/overdue", validateJwtToken, checkPermission(PERMISSIONS.VIEW_REPORTS), get_overdue_books);

/* ---------- INDIVIDUAL BOOK (PUBLIC / OPTIONAL AUTH) ---------- */
router.get("/:bookId", optionalAuth, get_book);
router.get("/:bookId/comments", get_comments);
router.get("/:bookId/rating", get_book_rating);

/* ---------- PROTECTED ROUTES ---------- */
router.use(validateJwtToken);

/* ---------- CATALOG & INVENTORY (ADMIN / LIBRARIAN) ---------- */
router.post("/", checkPermission(PERMISSIONS.ADD_BOOK), add_book);
router.post("/:bookId/copy", checkPermission(PERMISSIONS.ADD_BOOK), add_copies);

/* ---------- CIRCULATION DESK (ADMIN / LIBRARIAN / STAFF) ---------- */
router.post("/:bookId/issues", checkPermission(PERMISSIONS.ISSUE_BOOK), issue_book);
router.patch("/:bookId/returns", checkPermission(PERMISSIONS.RETURN_BOOK), return_book);
router.put("/:bookId/copy/:copyId", checkPermission(PERMISSIONS.ISSUE_BOOK), renew_book);

/* ---------- STUDENT BOOK REQUESTS ---------- */
router.post("/:bookId/requests", checkPermission(PERMISSIONS.RESERVE_BOOK), request_book);

/* ---------- SOCIAL, RATINGS & REVIEWS (AUTHENTICATED) ---------- */
router.post("/:bookId/like", like_dislike_book);
router.post("/:bookId/rating", rate_book);
router.delete("/:bookId/rating", unrate_book);

router.post("/:bookId/comments", write_comment);
router.put("/:bookId/comments/:commentId", update_comment);
router.delete("/:bookId/comments/:commentId", delete_comment);
router.post("/:bookId/comments/:commentId/like", like_unlike_comment);

export default router;
