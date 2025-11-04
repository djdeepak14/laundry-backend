class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    details = [],
    stack = ""
  ) {
    super(message); // Pass the message to the parent Error class
    this.statusCode = statusCode;
    this.message = message;
    this.success = false;
    this.details = details;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };