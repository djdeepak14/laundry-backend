class ApiError extends Error {
    constructor(
        statusCode,
        messasge = "something went wrong",
        details = [],
        stack = ""
    ) {
        this.statusCode = statusCode
        this.message = messasge
        this.success = false
        this.details = details

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export { ApiError }