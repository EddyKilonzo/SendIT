import * as Joi from 'joi';

export interface ProfilePictureUploadDto {
  file: Express.Multer.File;
}

export interface ProfilePictureResponseDto {
  id: string;
  profilePicture: string;
  message: string;
}

export const profilePictureUploadSchema = Joi.object({
  file: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string()
      .valid('image/jpeg', 'image/png', 'image/gif', 'image/webp')
      .required(),
    size: Joi.number()
      .max(5 * 1024 * 1024)
      .required(), // 5MB max
    buffer: Joi.binary().required(),
  }).required(),
});
