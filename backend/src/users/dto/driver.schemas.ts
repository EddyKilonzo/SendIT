import * as Joi from 'joi';

export const driverApplicationSchema = Joi.object({
  licenseNumber: Joi.string().required().messages({
    'any.required': 'License number is required',
  }),
  vehicleNumber: Joi.string().optional().messages({
    'string.base': 'Vehicle number must be a string',
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

export const assignParcelSchema = Joi.object({
  driverId: Joi.string().required().messages({
    'any.required': 'Driver ID is required',
  }),
  parcelId: Joi.string().required().messages({
    'any.required': 'Parcel ID is required',
  }),
  assignmentNotes: Joi.string().max(500).optional().messages({
    'string.max': 'Assignment notes cannot exceed 500 characters',
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
