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
          <div style="background-color: #0c0a09; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; box-sizing: border-box;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #1c1917; border: 1px solid #2e2a24; border-top: 4px solid #84cc16; border-radius: 16px; padding: 32px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
              <!-- Logo / Brand Header -->
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-weight: 800; font-size: 24px; color: #ffffff; letter-spacing: -0.5px;">
                  ERP<span style="color: #84cc16;">.</span>
                </span>
              </div>

              <!-- Divider -->
              <div style="height: 1px; background: linear-gradient(90deg, transparent, #44403c, transparent); margin-bottom: 28px;"></div>

              <h2 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 12px; text-align: center; letter-spacing: -0.2px;">
                Cześć, ${name}!
              </h2>
              <p style="margin: 0 0 28px; color: #a8a29e; font-size: 14px; line-height: 1.5; text-align: center;">
                Użyj poniższego bezpiecznego kodu weryfikacyjnego, aby zalogować się do panelu ERP.
              </p>

              <!-- Code Block -->
              <div style="background-color: #0c0a09; border: 1px solid #44403c; border-radius: 12px; padding: 24px; margin: 28px 0; text-align: center;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #a3e635; font-weight: 700; margin-bottom: 8px;">
                  Kod weryfikacyjny
                </div>
                <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #84cc16; margin: 0; padding-left: 10px; text-shadow: 0 0 10px rgba(132, 204, 22, 0.2);">
                  ${code}
                </div>
              </div>

              <p style="margin: 28px 0 0; color: #78716c; font-size: 13px; text-align: center; line-height: 1.5;">
                Ten kod jest ważny przez <strong style="color: #e7e5e4;">10 minut</strong>.
              </p>

              <!-- Divider -->
              <div style="height: 1px; background: #2e2a24; margin: 24px 0 16px 0;"></div>

              <p style="margin: 0; color: #57534e; font-size: 11px; text-align: center; line-height: 1.4;">
                Jeśli nie prosiłeś o ten kod, możesz bezpiecznie zignorować ten e-mail.
              </p>
            </div>
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