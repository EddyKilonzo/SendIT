import * as Joi from 'joi';

export const createReviewSchema = Joi.object({
  parcelId: Joi.string().required().messages({
    'any.required': 'Parcel ID is required',
    'string.base': 'Parcel ID must be a string',
  }),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'any.required': 'Rating is required',
    'number.base': 'Rating must be a number',
    'number.integer': 'Rating must be a whole number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
  }),
  comment: Joi.string().max(500).optional().messages({
    'string.max': 'Comment cannot exceed 500 characters',
  }),
});

export const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional().messages({
    'number.base': 'Rating must be a number',
    'number.integer': 'Rating must be a whole number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
  }),
  comment: Joi.string().max(500).optional().messages({
    'string.max': 'Comment cannot exceed 500 characters',
  }),
});

export const reviewsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be a whole number',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).max(100).optional().messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be a whole number',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
  parcelId: Joi.string().optional().messages({
    'string.base': 'Parcel ID must be a string',
  }),
  reviewerId: Joi.string().optional().messages({
    'string.base': 'Reviewer ID must be a string',
  }),
  rating: Joi.number().integer().min(1).max(5).optional().messages({
    'number.base': 'Rating must be a number',
    'number.integer': 'Rating must be a whole number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
  }),
  minRating: Joi.number().integer().min(1).max(5).optional().messages({
    'number.base': 'Minimum rating must be a number',
    'number.integer': 'Minimum rating must be a whole number',
    'number.min': 'Minimum rating must be at least 1',
    'number.max': 'Minimum rating cannot exceed 5',
  }),
  maxRating: Joi.number().integer().min(1).max(5).optional().messages({
    'number.base': 'Maximum rating must be a number',
    'number.integer': 'Maximum rating must be a whole number',
    'number.min': 'Maximum rating must be at least 1',
    'number.max': 'Maximum rating cannot exceed 5',
  }),
  sortBy: Joi.string().valid('createdAt', 'rating').optional().messages({
    'any.only': 'Sort by must be either createdAt or rating',
  }),
  sortOrder: Joi.string().valid('asc', 'desc').optional().messages({
    'any.only': 'Sort order must be either asc or desc',
  }),
}); 