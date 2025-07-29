import * as Joi from 'joi';

export const assignParcelToDriverSchema = Joi.object({
  parcelId: Joi.string().required().messages({
    'any.required': 'Parcel ID is required',
  }),
  driverId: Joi.string().required().messages({
    'any.required': 'Driver ID is required',
  }),
  assignmentNotes: Joi.string().max(500).optional().messages({
    'string.max': 'Assignment notes cannot exceed 500 characters',
  }),
});

export const bulkAssignParcelsSchema = Joi.object({
  assignments: Joi.array()
    .items(
      Joi.object({
        parcelId: Joi.string().required().messages({
          'any.required': 'Parcel ID is required',
        }),
        driverId: Joi.string().required().messages({
          'any.required': 'Driver ID is required',
        }),
        assignmentNotes: Joi.string().max(500).optional().messages({
          'string.max': 'Assignment notes cannot exceed 500 characters',
        }),
      }),
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one assignment is required',
      'any.required': 'Assignments array is required',
    }),
});

export const driverManagementSchema = Joi.object({
  driverId: Joi.string().required().messages({
    'any.required': 'Driver ID is required',
  }),
  action: Joi.string()
    .valid('activate', 'deactivate', 'suspend', 'unsuspend')
    .required()
    .messages({
      'any.only': 'Action must be activate, deactivate, suspend, or unsuspend',
      'any.required': 'Action is required',
    }),
  reason: Joi.string().max(200).optional().messages({
    'string.max': 'Reason cannot exceed 200 characters',
  }),
});

export const userManagementSchema = Joi.object({
  userId: Joi.string().required().messages({
    'any.required': 'User ID is required',
  }),
  action: Joi.string()
    .valid('activate', 'deactivate', 'suspend', 'unsuspend')
    .required()
    .messages({
      'any.only': 'Action must be activate, deactivate, suspend, or unsuspend',
      'any.required': 'Action is required',
    }),
  reason: Joi.string().max(200).optional().messages({
    'string.max': 'Reason cannot exceed 200 characters',
  }),
});

export const driverApplicationManagementSchema = Joi.object({
  userId: Joi.string().optional().messages({
    'string.base': 'User ID must be a string',
  }),
  action: Joi.string().valid('approve', 'reject').required().messages({
    'any.only': 'Action must be approve or reject',
    'any.required': 'Action is required',
  }),
  reason: Joi.string().max(500).optional().messages({
    'string.max': 'Reason cannot exceed 500 characters',
  }),
});

export const parcelManagementSchema = Joi.object({
  parcelId: Joi.string().required().messages({
    'any.required': 'Parcel ID is required',
  }),
  action: Joi.string().valid('cancel', 'reassign').required().messages({
    'any.only': 'Action must be cancel or reassign',
    'any.required': 'Action is required',
  }),
  reason: Joi.string().max(200).optional().messages({
    'string.max': 'Reason cannot exceed 200 characters',
  }),
  newDriverId: Joi.string().optional().messages({
    'any.only': 'New driver ID is required when action is reassign',
  }),
});

export const driverFilterSchema = Joi.object({
  page: Joi.number().min(1).optional().default(1).messages({
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().min(1).max(100).optional().default(10).messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
  search: Joi.string().max(100).optional().messages({
    'string.max': 'Search term cannot exceed 100 characters',
  }),
  isActive: Joi.boolean().optional(),
  isAvailable: Joi.boolean().optional(),
  vehicleType: Joi.string()
    .valid('MOTORCYCLE', 'CAR', 'VAN', 'TRUCK')
    .optional()
    .messages({
      'any.only': 'Vehicle type must be MOTORCYCLE, CAR, VAN, or TRUCK',
    }),
  hasAssignedParcels: Joi.boolean().optional(),
});

export const parcelFilterSchema = Joi.object({
  page: Joi.number().min(1).optional().default(1).messages({
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().min(1).max(100).optional().default(10).messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
  search: Joi.string().max(100).optional().messages({
    'string.max': 'Search term cannot exceed 100 characters',
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
  assignedDriverId: Joi.string().optional(),
  dateFrom: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Date from must be a valid ISO date',
  }),
  dateTo: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Date to must be a valid ISO date',
  }),
});

export const userFilterSchema = Joi.object({
  page: Joi.number().min(1).optional().default(1).messages({
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().min(1).max(100).optional().default(10).messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
  search: Joi.string().max(100).optional().messages({
    'string.max': 'Search term cannot exceed 100 characters',
  }),
  role: Joi.string().valid('CUSTOMER', 'DRIVER', 'ADMIN').optional().messages({
    'any.only': 'Role must be CUSTOMER, DRIVER, or ADMIN',
  }),
  isActive: Joi.boolean().optional(),
  hasParcels: Joi.boolean().optional(),
});

export const notificationSettingsSchema = Joi.object({
  emailNotifications: Joi.boolean().required().messages({
    'any.required': 'Email notifications setting is required',
  }),
  smsNotifications: Joi.boolean().required().messages({
    'any.required': 'SMS notifications setting is required',
  }),
  pushNotifications: Joi.boolean().required().messages({
    'any.required': 'Push notifications setting is required',
  }),
  notificationTypes: Joi.object({
    newParcel: Joi.boolean().required(),
    parcelAssigned: Joi.boolean().required(),
    statusUpdate: Joi.boolean().required(),
    deliveryComplete: Joi.boolean().required(),
    systemAlerts: Joi.boolean().required(),
  })
    .required()
    .messages({
      'any.required': 'Notification types configuration is required',
    }),
});

export const systemSettingsSchema = Joi.object({
  maxParcelsPerDriver: Joi.number().min(1).max(50).required().messages({
    'number.min': 'Max parcels per driver must be at least 1',
    'number.max': 'Max parcels per driver cannot exceed 50',
    'any.required': 'Max parcels per driver is required',
  }),
  deliveryTimeLimit: Joi.number().min(1).max(168).required().messages({
    'number.min': 'Delivery time limit must be at least 1 hour',
    'number.max': 'Delivery time limit cannot exceed 168 hours (1 week)',
    'any.required': 'Delivery time limit is required',
  }),
  autoAssignmentEnabled: Joi.boolean().required().messages({
    'any.required': 'Auto assignment setting is required',
  }),
  notificationEnabled: Joi.boolean().required().messages({
    'any.required': 'Notification setting is required',
  }),
  maintenanceMode: Joi.boolean().required().messages({
    'any.required': 'Maintenance mode setting is required',
  }),
  maintenanceMessage: Joi.string().max(500).optional().messages({
    'string.max': 'Maintenance message cannot exceed 500 characters',
  }),
});
