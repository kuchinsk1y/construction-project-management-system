import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('EMAIL_HOST'),
      port: Number(this.config.getOrThrow<string>('EMAIL_PORT')),
      secure: false,
      auth: {
        user: this.config.getOrThrow<string>('EMAIL_USER'),
        pass: this.config.getOrThrow<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async sendAuthCode(to: string, code: string, firstName?: string | null): Promise<void> {
    try {
      const name = firstName?.trim() ? firstName.trim() : 'User';
      const fromName = this.config.get<string>('EMAIL_FROM_NAME') ?? 'ERP';
      const fromEmail = this.config.getOrThrow<string>('EMAIL_USER');

      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: `Your verification code: ${code}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #111; margin: 0 0 12px;">Hello, ${name}!</h2>
            <p style="margin: 0 0 12px; color: #444;">Use the code below to sign in to ERP:</p>
            <div style="font-size: 34px; font-weight: bold; letter-spacing: 8px; text-align: center;
                        padding: 20px; background: #f5f5f5; border-radius: 10px; margin: 20px 0; color: #111;">
              ${code}
            </div>
            <p style="margin: 0; color: #666;">This code expires in <strong>10 minutes</strong>.</p>
            <p style="margin: 16px 0 0; color: #999; font-size: 12px;">
              If you did not request this code, simply ignore this email.
            </p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send auth code email to ${to}`, error as Error);
      throw error;
    }
  }
}
