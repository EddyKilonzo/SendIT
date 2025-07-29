import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Enable CORS
    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:4200',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['*'],
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // API prefix
    app.setGlobalPrefix('api');

    const port = process.env.PORT ?? 3000;
    await app.listen(port);

    logger.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    logger.error(
      'Failed to start application',
      error instanceof Error ? error.stack : error,
    );
    process.exit(1);
  }
}

void bootstrap();
