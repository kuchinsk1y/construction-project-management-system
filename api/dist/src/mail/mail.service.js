"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let MailService = MailService_1 = class MailService {
    config;
    logger = new common_1.Logger(MailService_1.name);
    transporter;
    constructor(config) {
        this.config = config;
        this.transporter = nodemailer.createTransport({
            host: this.config.getOrThrow('EMAIL_HOST'),
            port: Number(this.config.getOrThrow('EMAIL_PORT')),
            secure: false,
            auth: {
                user: this.config.getOrThrow('EMAIL_USER'),
                pass: this.config.getOrThrow('EMAIL_PASSWORD'),
            },
        });
    }
    async sendAuthCode(to, code, firstName) {
        try {
            const name = firstName?.trim() ? firstName.trim() : 'User';
            const fromName = this.config.get('EMAIL_FROM_NAME') ?? 'ERP';
            const fromEmail = this.config.getOrThrow('EMAIL_USER');
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
        }
        catch (error) {
            this.logger.error(`Failed to send auth code email to ${to}`, error);
            throw error;
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map