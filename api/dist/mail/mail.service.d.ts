import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private readonly config;
    private readonly logger;
    private readonly transporter;
    constructor(config: ConfigService);
    sendAuthCode(to: string, code: string, firstName?: string | null): Promise<void>;
}
