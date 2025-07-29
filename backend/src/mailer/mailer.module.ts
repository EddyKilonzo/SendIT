import { Module, forwardRef } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';
import { join } from 'path';
import { MailerService } from './mailer.service';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.MAIL_PORT || '587'),
        secure: process.env.MAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.MAIL_USER || '',
          pass: process.env.MAIL_PASSWORD || '',
        },
        // Add connection timeout and retry settings
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000, // 30 seconds
        socketTimeout: 60000, // 60 seconds
        // Add TLS settings for better compatibility
        tls: {
          rejectUnauthorized: false,
        },
      },
      defaults: {
        from:
          process.env.MAIL_FROM ||
          `"SendIT" <${process.env.MAIL_USER || 'noreply@sendit.com'}>`,
      },
      template: {
        dir: join(__dirname, 'templates'),
        adapter: new EjsAdapter(),
        options: {
          strict: false, // Changed from true to false to be more permissive
          debug: false, // Disable debug mode to prevent HTML logging
        },
      },
    }),
    forwardRef(() => AuthModule),
    CommonModule,
  ],
  providers: [MailerService],
  exports: [MailerService],
})
export class SendITMailerModule {}
