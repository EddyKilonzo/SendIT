import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Schema } from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: Schema) {}

  transform(value: unknown) {
    const result = this.schema.validate(value, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (result.error) {
      const errorMessages = result.error.details.map(
        (detail) => detail.message,
      );
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errorMessages,
      });
    }

    return result.value as unknown;
  }
}

// Factory function to create validation pipes with specific schemas
export const createJoiValidationPipe = (schema: Schema) => {
  return new JoiValidationPipe(schema);
};
