import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface UploadOptions {
  folder?: string;
  transformation?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: number | string;
  };
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    try {
      const uploadOptions = {
        folder: options.folder || 'sendit-profiles',
        transformation: {
          width: options.transformation?.width || 400,
          height: options.transformation?.height || 400,
          crop: options.transformation?.crop || 'fill',
          quality: options.transformation?.quality || 'auto',
        },
      };

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              this.logger.error('Cloudinary upload failed:', error);
              reject(new Error('Failed to upload image'));
            } else if (result) {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format,
                size: result.bytes,
              });
            } else {
              reject(new Error('Upload result is undefined'));
            }
          },
        );

        // Convert buffer to stream
        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
      });
    } catch (error) {
      this.logger.error('Image upload error:', error);
      throw new Error('Failed to process image upload');
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Image deleted successfully: ${publicId}`);
    } catch (error) {
      this.logger.error('Failed to delete image:', error);
      throw new Error('Failed to delete image');
    }
  }

  async updateProfilePicture(
    file: Express.Multer.File,
    currentPublicId?: string,
  ): Promise<UploadResult> {
    try {
      // Delete old image if it exists
      if (currentPublicId) {
        try {
          await this.deleteImage(currentPublicId);
        } catch (error) {
          this.logger.warn('Failed to delete old profile picture:', error);
          // Continue with upload even if deletion fails
        }
      }

      // Upload new image
      return await this.uploadImage(file, {
        folder: 'sendit-profiles',
        transformation: {
          width: 400,
          height: 400,
          crop: 'fill',
          quality: 'auto',
        },
      });
    } catch (error) {
      this.logger.error('Profile picture update failed:', error);
      throw new Error('Failed to update profile picture');
    }
  }
}
