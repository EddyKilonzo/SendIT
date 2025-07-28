import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Schema } from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: Schema) {}

  transform(value: unknown) {
    console.log(
      '🔍 DEBUG - JoiValidationPipe - Input value:',
      JSON.stringify(value, null, 2),
    );
    console.log(
      '🔍 DEBUG - JoiValidationPipe - Schema:',
      this.schema.describe(),
    );

    const result = this.schema.validate(value, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (result.error) {
      console.log(
        '🔍 DEBUG - JoiValidationPipe - Validation errors:',
        result.error.details,
      );
      const errorMessages = result.error.details.map(
        (detail) => detail.message,
      );
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errorMessages,
      });
    }

    console.log(
      '🔍 DEBUG - JoiValidationPipe - Validation successful, result:',
      result.value,
    );
    return result.value as unknown;
  }
}

// Factory function to create validation pipes with specific schemas
export const createJoiValidationPipe = (schema: Schema) => {
  return new JoiValidationPipe(schema);
};
