/**
 * Standard API response helpers.
 */

export function success(res, data = null, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

export function created(res, data = null, message = 'Created') {
  return success(res, data, message, 201);
}

export function error(res, message = 'Internal Server Error', statusCode = 500, details = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    details,
    timestamp: new Date().toISOString(),
  });
}

export function notFound(res, message = 'Resource not found') {
  return error(res, message, 404);
}

export function badRequest(res, message = 'Bad request', details = null) {
  return error(res, message, 400, details);
}

export function tooManyRequests(res, message = 'Too many requests, please try again later') {
  return error(res, message, 429);
}

export default { success, created, error, notFound, badRequest, tooManyRequests };
