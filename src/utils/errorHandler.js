export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};


// This replaces your try/catch blocks
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next); // Passes the error to the global handler
  };
};


class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational; // true for expected errors, false for bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;