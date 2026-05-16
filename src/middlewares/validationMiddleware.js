import { validationResult } from "express-validator";
import ApiError from "../utils/errorHandler.js";

export const validateInputs = (req, res, next) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

        const formattedErrors = errors.array().map(err => ({
            field: err.path,
            message: err.msg
        }));

        return next(
            new ApiError(400, formattedErrors)
        );
    }
    next();
};