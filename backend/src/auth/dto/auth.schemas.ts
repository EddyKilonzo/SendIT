import * as Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required',
  }),
  name: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters',
    'any.required': 'Name is required',
  }),
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-()]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
  address: Joi.string().max(200).optional().messages({
    'string.max': 'Address cannot exceed 200 characters',
  }),
  role: Joi.string()
    .valid('CUSTOMER', 'DRIVER', 'ADMIN')
    .optional()
    .default('CUSTOMER')
    .messages({
      'any.only': 'Role must be either CUSTOMER, DRIVER, or ADMIN',
    }),

  // Driver-specific fields (only required for DRIVER role)
  licenseNumber: Joi.when('role', {
    is: 'DRIVER',
    then: Joi.string().min(5).max(20).required().messages({
      'string.min': 'License number must be at least 5 characters long',
      'string.max': 'License number cannot exceed 20 characters',
      'any.required': 'License number is required for drivers',
    }),
    otherwise: Joi.string().optional(),
  }),
  vehicleNumber: Joi.string().max(20).optional().messages({
    'string.max': 'Vehicle number cannot exceed 20 characters',
  }),
  vehicleType: Joi.string()
    .valid('MOTORCYCLE', 'CAR', 'VAN', 'TRUCK')
    .optional()
    .messages({
      'any.only': 'Vehicle type must be MOTORCYCLE, CAR, VAN, or TRUCK',
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

export const driverApplicationSchema = Joi.object({
  licenseNumber: Joi.string().min(5).max(20).required().messages({
    'string.min': 'License number must be at least 5 characters long',
    'string.max': 'License number cannot exceed 20 characters',
    'any.required': 'License number is required',
  }),
  vehicleNumber: Joi.string().max(20).optional().messages({
    'string.max': 'Vehicle number cannot exceed 20 characters',
  }),
  vehicleType: Joi.string()
    .valid('MOTORCYCLE', 'CAR', 'VAN', 'TRUCK')
    .optional()
    .messages({
      'any.only': 'Vehicle type must be MOTORCYCLE, CAR, VAN, or TRUCK',
    }),
  reason: Joi.string().max(500).optional().messages({
    'string.max': 'Reason cannot exceed 500 characters',
  }),
});

// Password Reset Schemas
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
});

export const verifyResetTokenSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  token: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'Token must be exactly 6 digits',
      'string.pattern.base': 'Token must contain only numbers',
      'any.required': 'Token is required',
    }),
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  token: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'Token must be exactly 6 digits',
      'string.pattern.base': 'Token must contain only numbers',
      'any.required': 'Token is required',
    }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'New password is required',
  }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'New password is required',
  }),
});
