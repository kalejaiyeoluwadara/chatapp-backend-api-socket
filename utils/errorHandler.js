const { validationResult } = require("express-validator");

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array(),
    });
  }
  next();
};

// Generic error handler
const handleError = (error, res, customMessage = "An error occurred") => {
  console.error(error);
  res.status(500).json({
    error: "Internal server error",
    message: customMessage,
  });
};

// Not found error handler
const handleNotFound = (res, message = "Resource not found") => {
  res.status(404).json({
    error: "Not found",
    message,
  });
};

// Unauthorized error handler
const handleUnauthorized = (res, message = "Access denied") => {
  res.status(401).json({
    error: "Unauthorized",
    message,
  });
};

// Forbidden error handler
const handleForbidden = (res, message = "Access denied") => {
  res.status(403).json({
    error: "Forbidden",
    message,
  });
};

// Bad request error handler
const handleBadRequest = (res, message = "Invalid request") => {
  res.status(400).json({
    error: "Bad request",
    message,
  });
};

module.exports = {
  handleValidationErrors,
  handleError,
  handleNotFound,
  handleUnauthorized,
  handleForbidden,
  handleBadRequest,
};
