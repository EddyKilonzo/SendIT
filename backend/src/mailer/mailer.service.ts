import { Injectable, Logger } from '@nestjs/common';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

export interface EmailData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

export interface WelcomeEmailData {
  to: string;
  name: string;
  profilePicture?: string;
  verificationToken?: string;
}

export interface PasswordResetEmailData {
  to: string;
  name: string;
  profilePicture?: string;
  resetToken: string;
}

export interface ParcelStatusEmailData {
  to: string;
  name: string;
  profilePicture?: string;
  parcelId: string;
  status: string;
  trackingNumber: string;
  estimatedDelivery?: string;
}

export interface DriverAssignmentEmailData {
  to: string;
  name: string;
  profilePicture?: string;
  parcelId: string;
  trackingNumber: string;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedDelivery: string;
}

export interface ApplicationApprovedEmailData {
  to: string;
  name: string;
  profilePicture?: string;
  applicationId: string;
}

export interface ApplicationRejectedEmailData {
  to: string;
  name: string;
  profilePicture?: string;
  applicationId: string;
  reason?: string;
}

export interface SuspendedEmailData {
  to: string;
  name: string;
  profilePicture?: string;
  reason?: string;
}

export interface ParcelCreatedEmailData {
  to: string;
  name: string;
  profilePicture?: string;
  parcelId: string;
  trackingNumber: string;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedDelivery: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private emailStats = {
    totalSent: 0,
    totalFailed: 0,
    lastSent: null as Date | null,
    lastFailed: null as Date | null,
  };

  constructor(private readonly mailerService: NestMailerService) {
    // Enhanced SMTP configuration logging
    this.logger.log('🚀 MailerService initializing...');
    this.logger.log('📧 SMTP Configuration:');
    this.logger.log(`   Host: ${process.env.MAIL_HOST || 'smtp.gmail.com'}`);
    this.logger.log(`   Port: ${process.env.MAIL_PORT || '587'}`);
    this.logger.log(
      `   User: ${process.env.MAIL_USER ? '✅ SET' : '❌ NOT SET'}`,
    );
    this.logger.log(
      `   Password: ${process.env.MAIL_PASSWORD ? '✅ SET' : '❌ NOT SET'}`,
    );
    this.logger.log(`   From: ${process.env.MAIL_FROM || 'NOT SET'}`);
    this.logger.log(
      `   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:4200'}`,
    );

    // Debug: Show actual values (masked password)
    if (process.env.MAIL_USER) {
      this.logger.log(`   Debug - MAIL_USER: ${process.env.MAIL_USER}`);
    }
    if (process.env.MAIL_PASSWORD) {
      this.logger.log(
        `   Debug - MAIL_PASSWORD: ${process.env.MAIL_PASSWORD.substring(
          0,
          4,
        )}...`,
      );
    }

    // Verify configuration for production
    if (!process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
      this.logger.error(
        '❌ SMTP credentials not configured - emails will not be sent!',
      );
      this.logger.error(
        'Please set MAIL_USER and MAIL_PASSWORD environment variables',
      );
    } else {
      this.logger.log(
        '✅ SMTP configuration verified - emails will be sent to real recipients',
      );
    }

    this.logger.log('🎯 MailerService initialized successfully');
  }

  private logEmailStats(success: boolean): void {
    if (success) {
      this.emailStats.totalSent++;
      this.emailStats.lastSent = new Date();
      this.logger.log(
        `📊 Email Stats - Total Sent: ${this.emailStats.totalSent}, Last Sent: ${this.emailStats.lastSent.toISOString()}`,
      );
    } else {
      this.emailStats.totalFailed++;
      this.emailStats.lastFailed = new Date();
      this.logger.log(
        `📊 Email Stats - Total Failed: ${this.emailStats.totalFailed}, Last Failed: ${this.emailStats.lastFailed.toISOString()}`,
      );
    }
  }

  // Test email method for debugging
  async sendTestEmail(to: string): Promise<void> {
    try {
      this.logger.log(`🧪 Sending test email to: ${to}`);

      const testToken = this.generateSixDigitToken();

      await this.mailerService.sendMail({
        to: to,
        subject: '🧪 SendIT Test Email - Password Reset',
        template: 'password-reset',
        context: {
          name: 'Test User',
          resetToken: testToken,
          baseUrl: process.env.FRONTEND_URL || 'https://sendit.com',
        },
      });

      this.logger.log(`✅ Test email sent successfully to: ${to}`);
      this.logger.log(`🧪 Test token generated: ${testToken}`);
      this.logEmailStats(true);
    } catch (error) {
      this.logger.error(`❌ Failed to send test email to ${to}:`, error);
      this.logger.error(
        `❌ Error details: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      this.logger.error(
        `❌ Error stack: ${
          error instanceof Error ? error.stack : 'No stack trace'
        }`,
      );
      this.logEmailStats(false);
      throw error;
    }
  }

  private generateSixDigitToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    try {
      this.logger.log(`Attempting to send welcome email to: ${data.to}`);

      await this.mailerService.sendMail({
        to: data.to,
        subject: 'Welcome to SendIT - Your Account is Ready!',
        template: 'welcome',
        context: {
          name: data.name,
          profilePicture: data.profilePicture,
          verificationToken: data.verificationToken,
          baseUrl: process.env.FRONTEND_URL || 'https://sendit.com',
        },
      });

      this.logger.log(`✅ Welcome email sent successfully to: ${data.to}`);
      this.logEmailStats(true);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send welcome email to ${data.to}:`,
        error,
      );
      this.logEmailStats(false);
      throw error;
    }
  }

  //send password reset email
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
    try {
      this.logger.log(`Attempting to send password reset email to: ${data.to}`);

      await this.mailerService.sendMail({
        to: data.to,
        subject: 'Password Reset Request - SendIT',
        template: 'password-reset',
        context: {
          name: data.name,
          profilePicture: data.profilePicture,
          resetToken: data.resetToken,
          baseUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
        },
      });

      this.logger.log(
        `✅ Password reset email sent successfully to: ${data.to}`,
      );
      this.logEmailStats(true);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send password reset email to ${data.to}:`,
        error,
      );
      this.logEmailStats(false);
      throw error;
    }
  }

  //send parcel status update email
  async sendParcelStatusUpdate(data: ParcelStatusEmailData): Promise<void> {
    try {
      this.logger.log(
        `Attempting to send parcel status update email to: ${data.to} for parcel ${data.parcelId} (${data.trackingNumber})`,
      );

      await this.mailerService.sendMail({
        to: data.to,
        subject: `Parcel Status Update - ${data.status}`,
        template: 'parcel-status',
        context: {
          name: data.name,
          profilePicture: data.profilePicture,
          parcelId: data.parcelId,
          status: data.status,
          trackingNumber: data.trackingNumber,
          estimatedDelivery: data.estimatedDelivery,
          baseUrl: process.env.FRONTEND_URL || 'https://sendit.com',
        },
      });

      this.logger.log(
        `✅ Parcel status update email sent successfully to: ${data.to} for parcel ${data.parcelId}`,
      );
      this.logEmailStats(true);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send parcel status update email to ${data.to} for parcel ${data.parcelId}:`,
        error,
      );
      this.logEmailStats(false);
      throw error;
    }
  }

  //send driver assignment email
  async sendDriverAssignment(data: DriverAssignmentEmailData): Promise<void> {
    try {
      this.logger.log(
        `Attempting to send driver assignment email to: ${data.to} for parcel ${data.parcelId} (${data.trackingNumber})`,
      );

      await this.mailerService.sendMail({
        to: data.to,
        subject: 'New Parcel Assignment - SendIT',
        template: 'driver-assignment',
        context: {
          name: data.name,
          profilePicture: data.profilePicture,
          parcelId: data.parcelId,
          trackingNumber: data.trackingNumber,
          pickupAddress: data.pickupAddress,
          deliveryAddress: data.deliveryAddress,
          estimatedDelivery: data.estimatedDelivery,
          baseUrl: process.env.FRONTEND_URL || 'https://sendit.com',
        },
      });

      this.logger.log(
        `✅ Driver assignment email sent successfully to: ${data.to} for parcel ${data.parcelId}`,
      );
      this.logEmailStats(true);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send driver assignment email to ${data.to} for parcel ${data.parcelId}:`,
        error,
      );
      this.logEmailStats(false);
      throw error;
    }
  }

  //send generic email
  async sendGenericEmail(data: EmailData): Promise<void> {
    try {
      this.logger.log(
        `Attempting to send generic email to: ${data.to} with subject: "${data.subject}"`,
      );

      await this.mailerService.sendMail({
        to: data.to,
        subject: data.subject,
        template: data.template,
        context: {
          ...data.context,
          baseUrl: process.env.FRONTEND_URL || 'https://sendit.com',
        },
      });

      this.logger.log(
        `✅ Generic email sent successfully to: ${data.to} with subject: "${data.subject}"`,
      );
      this.logEmailStats(true);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send generic email to ${data.to} with subject "${data.subject}":`,
        error,
      );
      this.logEmailStats(false);
      throw error;
    }
  }

  //send application approved email
  async sendApplicationApprovedEmail(
    data: ApplicationApprovedEmailData,
  ): Promise<void> {
    try {
      this.logger.log(
        `Attempting to send application approved email to: ${data.to} for application ${data.applicationId}`,
      );

      await this.mailerService.sendMail({
        to: data.to,
        subject: 'Driver Application Approved - SendIT',
        template: 'application-approved',
        context: {
          name: data.name,
          profilePicture: data.profilePicture,
          applicationId: data.applicationId,
          baseUrl: process.env.FRONTEND_URL || 'https://sendit.com',
        },
      });

      this.logger.log(
        `✅ Application approved email sent successfully to: ${data.to} for application ${data.applicationId}`,
      );
      this.logEmailStats(true);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send application approved email to ${data.to} for application ${data.applicationId}:`,
        error,
      );
      this.logEmailStats(false);
      throw error;
    }
  }

  //send application rejected email
  async sendApplicationRejectedEmail(
    data: ApplicationRejectedEmailData,
  ): Promise<void> {
    try {
      this.logger.log(
        `Attempting to send application rejected email to: ${data.to} for application ${data.applicationId}`,
      );

      await this.mailerService.sendMail({
        to: data.to,
        subject: 'Driver Application Status - SendIT',
        template: 'application-rejected',
        context: {
          name: data.name,
          profilePicture: data.profilePicture,
          applicationId: data.applicationId,
          reason: data.reason,
          baseUrl: process.env.FRONTEND_URL || 'https://sendit.com',
        },
      });

      this.logger.log(
        `✅ Application rejected email sent successfully to: ${data.to} for application ${data.applicationId}`,
      );
      this.logEmailStats(true);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send application rejected email to ${data.to} for application ${data.applicationId}:`,
        error,
      );
      this.logEmailStats(false);
      throw error;
    }
  }

  //send suspended email
  async sendSuspendedEmail(data: SuspendedEmailData): Promise<void> {
    try {
      this.logger.log(`Attempting to send suspended email to: ${data.to}`);

      await this.mailerService.sendMail({
        to: data.to,
        subject: 'Account Suspended - SendIT',
        template: 'suspended',
        context: {
          name: data.name,
          profilePicture: data.profilePicture,
          reason: data.reason,
          baseUrl: process.env.FRONTEND_URL || 'https://sendit.com',
        },
      });

      this.logger.log(`✅ Suspended email sent successfully to: ${data.to}`);
      this.logEmailStats(true);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send suspended email to ${data.to}:`,
        error,
      );
      this.logEmailStats(false);
      throw error;
    }
  }

  //send parcel created email
  async sendParcelCreatedEmail(data: ParcelCreatedEmailData): Promise<void> {
    try {
      this.logger.log(
        `Attempting to send parcel created email to: ${data.to} for parcel ${data.parcelId} (${data.trackingNumber})`,
      );

      await this.mailerService.sendMail({
        to: data.to,
        subject: 'Parcel Created Successfully - SendIT',
        template: 'parcel-created',
        context: {
          name: data.name,
          profilePicture: data.profilePicture,
          parcelId: data.parcelId,
          trackingNumber: data.trackingNumber,
          pickupAddress: data.pickupAddress,
          deliveryAddress: data.deliveryAddress,
          estimatedDelivery: data.estimatedDelivery,
          baseUrl: process.env.FRONTEND_URL || 'https://sendit.com',
        },
      });

      this.logger.log(
        `✅ Parcel created email sent successfully to: ${data.to} for parcel ${data.parcelId}`,
      );
      this.logEmailStats(true);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send parcel created email to ${data.to} for parcel ${data.parcelId}:`,
        error,
      );
      this.logEmailStats(false);
      throw error;
    }
  }
}
