import { Controller, Post, Body } from '@nestjs/common';
import { MailerService } from './mailer.service';

@Controller('mailer')
export class MailerController {
  constructor(private readonly mailerService: MailerService) {}

  @Post('test')
  async testEmailTemplate(@Body() body: { template: string; data: Record<string, unknown> }) {
    try {
      await this.mailerService.testEmailTemplate(body.template, body.data);
      return { success: true, message: 'Test email sent successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
} 