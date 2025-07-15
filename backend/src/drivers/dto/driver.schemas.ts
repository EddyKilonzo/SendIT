import * as Joi from 'joi';

export const updateLocationSchema = Joi.object({
  currentLat: Joi.number().min(-90).max(90).required().messages({
    'number.min': 'Latitude must be between -90 and 90',
    'number.max': 'Latitude must be between -90 and 90',
    'any.required': 'Latitude is required',
  }),
  currentLng: Joi.number().min(-180).max(180).required().messages({
    'number.min': 'Longitude must be between -180 and 180',
    'number.max': 'Longitude must be between -180 and 180',
    'any.required': 'Longitude is required',
  }),
});

export const updateAvailabilitySchema = Joi.object({
  isAvailable: Joi.boolean().required().messages({
    'any.required': 'Availability status is required',
  }),
});

export const updateDriverProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters',
  }),
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-()]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
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

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'New password must be at least 6 characters long',
    'any.required': 'New password is required',
  }),
});

export const updateParcelStatusSchema = Joi.object({
  status: Joi.string()
    .valid('picked_up', 'in_transit', 'delivered', 'cancelled')
    .required()
    .messages({
      'any.only':
        'Status must be picked_up, in_transit, delivered, or cancelled',
      'any.required': 'Status is required',
    }),
  currentLocation: Joi.string().max(200).optional().messages({
    'string.max': 'Current location cannot exceed 200 characters',
  }),
  latitude: Joi.number().min(-90).max(90).optional().messages({
    'number.min': 'Latitude must be between -90 and 90',
    'number.max': 'Latitude must be between -90 and 90',
  }),
  longitude: Joi.number().min(-180).max(180).optional().messages({
    'number.min': 'Longitude must be between -180 and 180',
    'number.max': 'Longitude must be between -180 and 180',
  }),
  notes: Joi.string().max(500).optional().messages({
    'string.max': 'Notes cannot exceed 500 characters',
  }),
});

export const driverQuerySchema = Joi.object({
  page: Joi.number().min(1).optional().default(1).messages({
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().min(1).max(100).optional().default(10).messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
  status: Joi.string()
    .valid(
      'pending',
      'assigned',
      'picked_up',
      'in_transit',
      'delivered',
      'cancelled',
    )
    .optional()
    .messages({
      'any.only':
        'Status must be pending, assigned, picked_up, in_transit, delivered, or cancelled',
    }),
  dateFrom: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Date from must be a valid ISO date',
  }),
  dateTo: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Date to must be a valid ISO date',
  }),
});
