/**
 * Error Handling Middleware
 * 
 * This utility provides centralized error handling for API endpoints.
 */

/**
 * Error response helper
 * @param {Error} error - The error object
 * @param {number} defaultStatus - Default status code to use (default: 500)
 * @returns {Response} - Formatted error response
 */
export function errorResponse(error, defaultStatus = 500) {
  console.error('API Error:', error);
  
  // Determine if this is a known error type with a specific status code
  let status = defaultStatus;
  let message = error.message || 'An unexpected error occurred';
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    status = 400;
  } else if (error.name === 'AuthenticationError') {
    status = 401;
  } else if (error.name === 'AuthorizationError') {
    status = 403;
  } else if (error.name === 'NotFoundError') {
    status = 404;
  }
  
  // Return formatted error response
  return new Response(JSON.stringify({
    error: message,
    code: status,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Error classes for different types of API errors
 */

// Validation error - for invalid input
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Authentication error - for invalid credentials
export class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Authorization error - for insufficient permissions
export class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// Not found error - for resources that don't exist
export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Wraps an async handler function with error handling
 * @param {Function} handler - The async handler function
 * @returns {Function} - Wrapped handler with error handling
 */
export function withErrorHandling(handler) {
  return async (request, ...args) => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
