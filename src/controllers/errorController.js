export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  // Log everything for the developer
  console.error("ERROR: ", err);

  if (process.env.NODE_ENV === "development") {
    // In dev, show everything
    res.status(err.statusCode).json({
      error: err.message,
      stack: err.stack,
    });
  } else {
    // In production, shield the user
    const message = err.isOperational ? err.message : "Something went wrong!";
    res.status(err.statusCode).json({
      status: "error",
      message: message,
    });
  }
};