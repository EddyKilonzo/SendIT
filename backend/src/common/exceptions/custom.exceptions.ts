import { HttpException, HttpStatus } from '@nestjs/common';

// Base custom exception
export abstract class BaseCustomException extends HttpException {
  abstract readonly code: string;
  abstract readonly context: string;

  constructor(
    message: string,
    status: HttpStatus,
    metadata?: Record<string, unknown>,
  ) {
    super(
      {
        message,
        code: 'UNKNOWN_ERROR',
        context: 'Unknown',
        metadata,
        timestamp: new Date(),
      },
      status,
    );
  }
}

// Authentication related exceptions
export class InvalidCredentialsException extends BaseCustomException {
  readonly code = 'INVALID_CREDENTIALS';
  readonly context = 'Authentication';

  constructor(message = 'Invalid email or password') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class TokenExpiredException extends BaseCustomException {
  readonly code = 'TOKEN_EXPIRED';
  readonly context = 'Authentication';

  constructor(message = 'Token has expired') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class InsufficientPermissionsException extends BaseCustomException {
  readonly code = 'INSUFFICIENT_PERMISSIONS';
  readonly context = 'Authorization';

  constructor(message = 'Insufficient permissions for this action') {
    super(message, HttpStatus.FORBIDDEN);
  }
}

// User related exceptions
export class UserNotFoundException extends BaseCustomException {
  readonly code = 'USER_NOT_FOUND';
  readonly context = 'User';

  constructor(identifier: string) {
    super(`User not found: ${identifier}`, HttpStatus.NOT_FOUND, {
      identifier,
    });
  }
}

export class UserAlreadyExistsException extends BaseCustomException {
  readonly code = 'USER_ALREADY_EXISTS';
  readonly context = 'User';

  constructor(email: string) {
    super(`User with email ${email} already exists`, HttpStatus.CONFLICT, {
      email,
    });
  }
}

export class UserInactiveException extends BaseCustomException {
  readonly code = 'USER_INACTIVE';
  readonly context = 'User';

  constructor(message = 'User account is inactive') {
    super(message, HttpStatus.FORBIDDEN);
  }
}
