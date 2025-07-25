import * as Joi from 'joi';

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters',
  }),
  email: Joi.string().email().optional().messages({
    'string.email': 'Please provide a valid email address',
  }),
  phone: Joi.string().optional().messages({
    'string.base': 'Phone must be a string',
  }),
  address: Joi.string().max(200).optional().messages({
    'string.max': 'Address cannot exceed 200 characters',
  }),
  role: Joi.string().valid('CUSTOMER', 'DRIVER', 'ADMIN').optional().messages({
    'any.only': 'Role must be either CUSTOMER, DRIVER, or ADMIN',
  }),
  isActive: Joi.boolean().optional(),

  // Driver-specific fields
  licenseNumber: Joi.string().min(5).max(20).optional().messages({
    'string.min': 'License number must be at least 5 characters long',
    'string.max': 'License number cannot exceed 20 characters',
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
  isAvailable: Joi.boolean().optional(),
  currentLat: Joi.number().min(-90).max(90).optional().messages({
    'number.min': 'Latitude must be between -90 and 90',
    'number.max': 'Latitude must be between -90 and 90',
  }),
  currentLng: Joi.number().min(-180).max(180).optional().messages({
    'number.min': 'Longitude must be between -180 and 180',
    'number.max': 'Longitude must be between -180 and 180',
  }),
});
