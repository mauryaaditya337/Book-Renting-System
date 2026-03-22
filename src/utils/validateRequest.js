const { validationResult } = require("express-validator");

const validateRequest = (req) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation failed");
    error.statusCode = 400;
    error.details = errors.array().map((item) => ({
      field: item.path,
      message: item.msg
    }));
    throw error;
  }
};

module.exports = validateRequest;
