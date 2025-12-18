/**
 * HTTP validation helpers for Lambda event processing
 */

import { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Parse JSON body from API Gateway event
 * 
 * @param event - API Gateway proxy event
 * @returns Parsed JSON body
 * @throws Error if body is missing or invalid JSON
 */
export function parseJsonBody(event: APIGatewayProxyEvent): any {
  if (!event.body) {
    throw new Error('Request body is required');
  }

  try {
    return JSON.parse(event.body);
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Require a string value and validate it
 * 
 * @param value - Value to validate
 * @param name - Field name for error messages
 * @returns The validated string value
 * @throws Error if value is not a non-empty string
 */
export function requireString(value: any, name: string): string {
  if (value === undefined || value === null) {
    throw new Error(`${name} is required`);
  }

  if (typeof value !== 'string') {
    throw new Error(`${name} must be a string`);
  }

  if (value.trim().length === 0) {
    throw new Error(`${name} cannot be empty`);
  }

  return value;
}

/**
 * Require a boolean value and validate it
 * 
 * @param value - Value to validate
 * @param name - Field name for error messages
 * @returns The validated boolean value
 * @throws Error if value is not a boolean
 */
export function requireBoolean(value: any, name: string): boolean {
  if (value === undefined || value === null) {
    throw new Error(`${name} is required`);
  }

  if (typeof value !== 'boolean') {
    throw new Error(`${name} must be a boolean`);
  }

  return value;
}

/**
 * Require a number value and validate it
 * 
 * @param value - Value to validate
 * @param name - Field name for error messages
 * @returns The validated number value
 * @throws Error if value is not a valid number
 */
export function requireNumber(value: any, name: string): number {
  if (value === undefined || value === null) {
    throw new Error(`${name} is required`);
  }

  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${name} must be a valid number`);
  }

  return value;
}

/**
 * Get an optional string value
 * 
 * @param value - Value to validate
 * @param name - Field name for error messages
 * @returns The string value or undefined
 * @throws Error if value is not a string (when provided)
 */
export function optionalString(value: any, name: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`${name} must be a string`);
  }

  return value;
}
