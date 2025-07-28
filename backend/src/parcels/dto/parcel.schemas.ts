import * as Joi from 'joi';

export const createParcelSchema = Joi.object({
  // Sender info (optional - if not provided, current user will be used)
  senderName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Sender name must be at least 2 characters long',
    'string.max': 'Sender name cannot exceed 50 characters',
  }),
  senderEmail: Joi.string().email().optional().messages({
    'string.email': 'Please provide a valid sender email address',
  }),
  senderPhone: Joi.string()
    .pattern(/^\+?[\d\s\-()]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid sender phone number',
    }),
  senderId: Joi.string().optional().messages({
    'string.base': 'Sender ID must be a string',
  }),

  // Recipient info
  recipientName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Recipient name must be at least 2 characters long',
    'string.max': 'Recipient name cannot exceed 50 characters',
    'any.required': 'Recipient name is required',
  }),
  recipientEmail: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid recipient email address',
    'any.required': 'Recipient email is required',
  }),
  recipientPhone: Joi.string()
    .pattern(/^\+?[\d\s\-()]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid recipient phone number',
      'any.required': 'Recipient phone is required',
    }),
  recipientId: Joi.string().optional().messages({
    'string.base': 'Recipient ID must be a string',
  }),

  pickupAddress: Joi.string().min(10).max(200).required().messages({
    'string.min': 'Pickup address must be at least 10 characters long',
    'string.max': 'Pickup address cannot exceed 200 characters',
    'any.required': 'Pickup address is required',
  }),
  deliveryAddress: Joi.string().min(10).max(200).required().messages({
    'string.min': 'Delivery address must be at least 10 characters long',
    'string.max': 'Delivery address cannot exceed 200 characters',
    'any.required': 'Delivery address is required',
  }),
  weight: Joi.number().positive().max(1000).required().messages({
    'number.base': 'Weight must be a number',
    'number.positive': 'Weight must be positive',
    'number.max': 'Weight cannot exceed 1000 kg',
    'any.required': 'Weight is required',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Description cannot exceed 500 characters',
  }),
  value: Joi.number().positive().max(100000).optional().messages({
    'number.base': 'Value must be a number',
    'number.positive': 'Value must be positive',
    'number.max': 'Value cannot exceed 100,000',
  }),
  deliveryInstructions: Joi.string().max(300).optional().messages({
    'string.max': 'Delivery instructions cannot exceed 300 characters',
  }),
});

export const updateParcelStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      'pending',
      'assigned',
      'picked_up',
      'in_transit',
      'delivered_to_recipient',
      'delivered',
      'completed',
      'cancelled',
    )
    .required()
    .messages({
      'any.only':
        'Status must be pending, assigned, picked_up, in_transit, delivered_to_recipient, delivered, completed, or cancelled',
      'any.required': 'Status is required',
    }),
  notes: Joi.string().max(300).optional().messages({
    'string.max': 'Notes cannot exceed 300 characters',
  }),
});

export const parcelsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
  status: Joi.string()
    .valid(
      'pending',
      'assigned',
      'picked_up',
      'in_transit',
      'delivered_to_recipient',
      'delivered',
      'completed',
      'cancelled',
    )
    .optional()
    .messages({
      'any.only':
        'Status must be pending, assigned, picked_up, in_transit, delivered_to_recipient, delivered, completed, or cancelled',
    }),
  search: Joi.string().max(100).optional().messages({
    'string.max': 'Search term cannot exceed 100 characters',
  }),
  sortBy: Joi.string()
    .valid('createdAt', 'status', 'weight')
    .optional()
    .default('createdAt')
    .messages({
      'any.only': 'Sort by must be createdAt, status, or weight',
    }),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('desc')
    .messages({
      'any.only': 'Sort order must be asc or desc',
    }),
});
