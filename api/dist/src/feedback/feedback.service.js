"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var FeedbackService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackService = void 0;
const common_1 = require("@nestjs/common");
const form_data_1 = __importDefault(require("form-data"));
let FeedbackService = FeedbackService_1 = class FeedbackService {
    logger = new common_1.Logger(FeedbackService_1.name);
    async sendToTelegram({ description, url, user, file }) {
        const BOT_TOKEN = '1828341692:AAGxWM8o773LuqkV7qoRdyg0mICmpZVnzwU';
        const CHAT_ID = '784892922';
        const isPhoto = !!file;
        const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/${isPhoto ? 'sendPhoto' : 'sendMessage'}`;
        const message = `🚨 <b>New Bug Report / Feedback</b>\n\n<b>User:</b> ${user}\n<b>URL:</b> ${url}\n\n<b>Description:</b>\n${description}`;
        const formData = new form_data_1.default();
        formData.append('chat_id', CHAT_ID);
        if (isPhoto) {
            formData.append('caption', message);
            formData.append('photo', file.buffer, { filename: 'screenshot.png', contentType: 'image/png' });
        }
        else {
            formData.append('text', message);
        }
        formData.append('parse_mode', 'HTML');
        try {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(telegramUrl, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                const error = await response.text();
                this.logger.error(`Failed to send feedback to Telegram: ${error}`);
                throw new Error('Failed to send feedback');
            }
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Error sending feedback: ${error.message}`);
            throw error;
        }
    }
};
exports.FeedbackService = FeedbackService;
exports.FeedbackService = FeedbackService = FeedbackService_1 = __decorate([
    (0, common_1.Injectable)()
], FeedbackService);
//# sourceMappingURL=feedback.service.js.map