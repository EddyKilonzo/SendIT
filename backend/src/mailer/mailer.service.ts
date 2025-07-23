import { Injectable } from '@nestjs/common';
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

@Injectable()
export class MailerService {
  constructor(private readonly mailerService: NestMailerService) {}

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
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
  }

  //send password reset email
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
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
  }

  //send parcel status update email
  async sendParcelStatusUpdate(data: ParcelStatusEmailData): Promise<void> {
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
  }

  //send driver assignment email
  async sendDriverAssignment(data: DriverAssignmentEmailData): Promise<void> {
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
  }

  //send generic email
  async sendGenericEmail(data: EmailData): Promise<void> {
    await this.mailerService.sendMail({
      to: data.to,
      subject: data.subject,
      template: data.template,
      context: {
        ...data.context,
        baseUrl: process.env.FRONTEND_URL || 'https://sendit.com',
      },
    });
  }

  // Test method for development
  async testEmailTemplate(
    templateName: string,
    testData: Record<string, unknown>,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: 'test@example.com',
      subject: `Test - ${templateName}`,
      template: templateName,
      context: {
        ...testData,
        baseUrl: process.env.FRONTEND_URL || 'https://sendit.com',
      },
    });
  }
}
