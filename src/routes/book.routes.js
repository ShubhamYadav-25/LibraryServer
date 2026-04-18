import express from "express";
import { validateJwtToken } from "../middlewares/validateJwt.middleware.js";
import { optionalAuth } from "../middlewares/optionalAuth.middleware.js"
import {
  delete_comment,
  get_book,
  get_book_rating,
  get_books,
  get_comments,
  get_overdue_books,
  issue_book,
  like_dislike_book,
  new_arrivals,
  popular_books,
  rate_book,
  request_book,
  return_book,
  trending_books,
  update_comment,
  write_comment,
} from "../controllers/books.controller.js";

const router = express.Router();

/* ---------- PUBLIC ROUTES ---------- */
router.get("/", optionalAuth, get_books);
router.get("/new-arrivals", optionalAuth, new_arrivals);
router.get("/trending", optionalAuth, trending_books);
router.get("/overdue", validateJwtToken, get_overdue_books);
router.get("/popular", validateJwtToken, popular_books)

router.get("/:bookId", optionalAuth, get_book);
router.get("/:bookId/comments", get_comments);
router.get("/:bookId/rating", get_book_rating);

/* ---------- PROTECTED ROUTES ---------- */
router.use(validateJwtToken);

// actions (state changes)
router.post("/:bookId/issues", issue_book);
router.patch("/:bookId/returns", return_book);
router.post("/:bookId/likes", like_dislike_book);
router.post("/:bookId/requests", request_book);

router.post("/:bookId/rating", rate_book);

// comments
router.post("/:bookId/comments", write_comment);
router.put("/:bookId/comments/:commentId", update_comment);
router.delete("/:bookId/comments/:commentId", delete_comment);

export default router;