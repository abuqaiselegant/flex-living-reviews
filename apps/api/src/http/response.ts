/**
 * HTTP response helpers for AWS Lambda proxy integration
 */

export interface APIGatewayProxyResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Default CORS headers for all responses
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

/**
 * Create a successful response
 * 
 * @param body - Response body (will be JSON stringified)
 * @param statusCode - HTTP status code (default: 200)
 * @returns Lambda proxy response
 */
export function ok(body: any, statusCode: number = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
    body: JSON.stringify(body),
  };
}

/**
 * Create a bad request error response (400)
 * 
 * @param message - Error message
 * @param details - Optional additional error details
 * @returns Lambda proxy response
 */
export function badRequest(message: string, details?: any): APIGatewayProxyResult {
  return {
    statusCode: 400,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
    body: JSON.stringify({
      error: 'Bad Request',
      message,
      ...(details && { details }),
    }),
  };
}

/**
 * Create a server error response (500)
 * 
 * @param message - Error message
 * @param details - Optional additional error details
 * @returns Lambda proxy response
 */
export function serverError(message: string, details?: any): APIGatewayProxyResult {
  return {
    statusCode: 500,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
    body: JSON.stringify({
      error: 'Internal Server Error',
      message,
      ...(details && { details }),
    }),
  };
}

/**
 * Create a not found error response (404)
 * 
 * @param message - Error message
 * @returns Lambda proxy response
 */
export function notFound(message: string = 'Resource not found'): APIGatewayProxyResult {
  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
    body: JSON.stringify({
      error: 'Not Found',
      message,
    }),
  };
}

/**
 * Create an unauthorized error response (401)
 * 
 * @param message - Error message
 * @returns Lambda proxy response
 */
export function unauthorized(message: string = 'Unauthorized'): APIGatewayProxyResult {
  return {
    statusCode: 401,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
    body: JSON.stringify({
      error: 'Unauthorized',
      message,
    }),
  };
}
