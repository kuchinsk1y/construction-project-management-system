import { Injectable, Logger } from '@nestjs/common';
import FormData from 'form-data';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  async sendToTelegram({ description, url, user, file }: { description: string, url: string, user: string, file: Express.Multer.File }) {
    const BOT_TOKEN = '1828341692:AAGxWM8o773LuqkV7qoRdyg0mICmpZVnzwU';
    const CHAT_ID = '784892922';
    const isPhoto = !!file;
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/${isPhoto ? 'sendPhoto' : 'sendMessage'}`;

    const message = `🚨 <b>New Bug Report / Feedback</b>\n\n<b>User:</b> ${user}\n<b>URL:</b> ${url}\n\n<b>Description:</b>\n${description}`;

    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    
    if (isPhoto) {
      formData.append('caption', message);
      formData.append('photo', file.buffer, { filename: 'screenshot.png', contentType: 'image/png' });
    } else {
      formData.append('text', message);
    }
    
    formData.append('parse_mode', 'HTML');

    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(telegramUrl, {
        method: 'POST',
        body: formData as any,
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Failed to send feedback to Telegram: ${error}`);
        throw new Error('Failed to send feedback');
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error sending feedback: ${error.message}`);
      throw error;
    }
  }
}
