import { body } from "express-validator";
import { query } from "express-validator";


export const signupValidator = [

    body("firstName")
        .trim()
        .notEmpty()
        .withMessage("First name is required")
        .isLength({ min: 2, max: 50 })
        .withMessage("First name must be 2-50 characters"),

    body("lastName")
        .trim()
        .notEmpty()
        .withMessage("Last name is required")
        .isLength({ min: 2, max: 50 })
        .withMessage("Last name must be 2-50 characters"),

    body("email")
        .trim()
        .normalizeEmail()
        .isEmail()
        .withMessage("Invalid email address"),

    body("password")
        .trim()
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters"),

    body("role")
        .trim()
        .toLowerCase()
        .isIn(["student", "admin", "librarian", "staff"])
        .withMessage("Invalid role")
];

export const loginValidator = [

    body("email")
        .trim()
        .normalizeEmail()
        .isEmail()
        .withMessage("Invalid email"),

    body("password")
        .trim()
        .notEmpty()
        .withMessage("Password required"),

    body("role")
        .optional()
        .trim()
        .toLowerCase()
        .isIn(["student", "admin", "librarian", "staff"])
        .withMessage("Invalid role")

];


export const resendMailValidator = [
  body("email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage("Valid email required"),
];


export const verifyEmailValidator = [

  body("token")
  .notEmpty()
  .withMessage("Verification token required")
  .bail()

  .isLength({ min: 64, max: 64 })
  .withMessage("Invalid verification token")
  .bail()

  .matches(/^[a-f0-9]+$/i)
  .withMessage("Invalid verification token"),
];
