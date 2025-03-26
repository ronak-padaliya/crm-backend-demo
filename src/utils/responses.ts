export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

/**
 * Creates a standardized success response
 * @param message Success message
 * @param data Optional data to include in response
 */
export const successResponse = (message: string, data?: any): ApiResponse => ({
  success: true,
  message,
  data
});

/**
 * Creates a standardized error response
 * @param message Error message
 * @param error Optional error details
 */
export const errorResponse = (message: string, error?: any): ApiResponse => ({
  success: false,
  message,
  error: process.env.NODE_ENV === 'development' ? error : undefined
});

/**
 * Common response messages
 */
export const ResponseMessages = {
  AUTH: {
    LOGIN_SUCCESS: 'Login successful',
    LOGIN_FAILED: 'Invalid credentials',
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied',
    INVALID_TOKEN: 'Invalid token',
    PASSWORD_CHANGED: 'Password changed successfully',
    PASSWORD_RESET_SENT: 'Password reset instructions sent',
    PASSWORD_RESET_SUCCESS: 'Password reset successful',
    INVALID_OTP: 'Invalid or expired OTP',
    USER_CREATED: 'User created successfully',
    USER_NOT_FOUND: 'User not found'
  },
  SERVER: {
    ERROR: 'Internal Server error',
    VALIDATION_ERROR: 'Validation error',
    SUCCESS: 'Operation successful',
    SERVER_ERROR: 'Server error occurred',
  },
  ADMIN: {
    NOT_FOUND: 'Admin not found',
    FOUND: 'Admin found',
    CREATED: 'Admin created successfully',
    UPDATED: 'Admin updated successfully',
    DELETED: 'Admin deleted successfully',
    EMAIL_EXISTS: 'Email already exists',
  },
  SUPERVISOR: {
    NOT_FOUND: 'Supervisor not found',
    FOUND: 'Supervisor found',
    CREATED: 'Supervisor created successfully',
    UPDATED: 'Supervisor updated successfully',
    DELETED: 'Supervisor deleted successfully',
    EMAIL_EXISTS: 'Email already exists',
  },
  SALESPERSON: {
    NOT_FOUND: 'Salesperson not found',
    FOUND: 'Salesperson found',
    CREATED: 'Salesperson created successfully',
    UPDATED: 'Salesperson updated successfully',
    DELETED: 'Salesperson deleted successfully',
    EMAIL_EXISTS: 'Email already exists',
  },
  ORGANIZATION: {
    FOUND: 'Organization found',
    NOT_FOUND: 'Organization not found',
    NAME_REQUIRED: 'Organization name is required',
    CREATED: 'Organization created successfully',
    UPDATED: 'Organization updated successfully',
    DELETED: 'Organization deleted successfully',
  },
  VALIDATION: {
    FAILED: 'Validation failed',
  },
  NOTIFICATION: {
    NOT_FOUND: 'Notification not found.',
    ACCEPTED: 'Notification accepted.',
    REJECTED: 'Notification rejected.',
  },
};
