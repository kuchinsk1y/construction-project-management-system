import { FeedbackService } from './feedback.service';
export declare class FeedbackController {
    private readonly feedbackService;
    constructor(feedbackService: FeedbackService);
    sendFeedback(description: string, url: string, user: string, file: Express.Multer.File): Promise<{
        success: boolean;
    }>;
}
