// Custom Error Class
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global Error Handler Middleware
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.error('ERROR 💥', err);

  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    // Tampilkan stack trace hanya di development
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};