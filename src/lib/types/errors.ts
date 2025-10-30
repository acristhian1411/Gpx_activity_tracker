/**
 * Error types and constants for GPX Activity Tracker
 */

export interface AppError {
  code: string;
  message: string;
  details?: any;
}

export const ERROR_CODES = {
  INVALID_GPX: 'INVALID_GPX_FILE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  ACTIVITY_NOT_FOUND: 'ACTIVITY_NOT_FOUND',
  NOT_FOUND: 'ACTIVITY_NOT_FOUND', // Alias for backward compatibility
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export class GPXActivityError extends Error implements AppError {
  public readonly code: ErrorCode;
  public readonly details?: any;

  constructor(code: ErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'GPXActivityError';
    this.code = code;
    this.details = details;
  }
}