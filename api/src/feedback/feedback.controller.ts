import { Controller, Post, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) { }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async sendFeedback(
    @Body('description') description: string,
    @Body('url') url: string,
    @Body('user') user: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.feedbackService.sendToTelegram({ description, url, user, file });
  }
}
