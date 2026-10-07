export declare class FeedbackService {
    private readonly logger;
    sendToTelegram({ description, url, user, file }: {
        description: string;
        url: string;
        user: string;
        file: Express.Multer.File;
    }): Promise<{
        success: boolean;
    }>;
}
