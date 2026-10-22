import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  BRAND,
  button,
  detailsTable,
  escapeHtml,
  highlight,
  note,
  paragraph,
  renderEmail,
} from './email-layout';

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

  private get from(): string {
    const fromName = this.config.get<string>('EMAIL_FROM_NAME') ?? 'ERP';
    const fromEmail = this.config.getOrThrow<string>('EMAIL_USER');
    return `"${fromName}" <${fromEmail}>`;
  }

  private greeting(firstName: string | null | undefined): string {
    const name = firstName?.trim();
    return name ? `Cześć ${escapeHtml(name)},` : 'Cześć,';
  }

  async sendAuthCode(
    to: string,
    code: string,
    firstName?: string | null,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: `Kod logowania do ERP: ${code}`,
        html: renderEmail({
          preheader: `Twój kod logowania: ${code}. Ważny przez 10 minut.`,
          eyebrow: 'Logowanie',
          title: 'Twój kod logowania',
          body: [
            paragraph(this.greeting(firstName)),
            paragraph(
              'Użyj poniższego kodu, aby zalogować się do systemu ERP.',
            ),
            highlight('Kod weryfikacyjny', escapeHtml(code), {
              mono: true,
              size: 34,
            }),
            paragraph(
              `Kod jest ważny przez <strong style="color:${BRAND.ink};">10 minut</strong> i można go użyć tylko raz.`,
            ),
            note(
              'Jeśli to nie Ty próbujesz się zalogować, zignoruj tę wiadomość — Twoje konto pozostaje bezpieczne.',
            ),
          ].join(''),
          footerNote:
            'Otrzymujesz tę wiadomość, ponieważ ktoś poprosił o kod logowania na ten adres.',
        }),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send auth code email to ${to}`,
        error as Error,
      );
      throw error;
    }
  }

  async sendProjectAssignmentEmail(
    to: string,
    firstName: string | null | undefined,
    projectName: string,
    projectUrl: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: `Zostałeś kierownikiem projektu: ${projectName}`,
        html: renderEmail({
          preheader: `Zostałeś wyznaczony jako kierownik projektu ${projectName}.`,
          eyebrow: 'Nowy projekt',
          title: 'Zostałeś kierownikiem projektu',
          body: [
            paragraph(this.greeting(firstName)),
            paragraph(
              `Zostałeś wyznaczony jako kierownik projektu <strong style="color:${BRAND.ink};">${escapeHtml(projectName)}</strong>. Możesz już przeglądać harmonogram, etapy, roboty i rozliczenia projektu.`,
            ),
            button('Przejdź do projektu', projectUrl),
            note(
              `Jeśli przycisk nie działa, skopiuj ten link do przeglądarki:<br><a href="${projectUrl}" style="color:${BRAND.primary};word-break:break-all;">${escapeHtml(projectUrl)}</a>`,
            ),
          ].join(''),
          footerNote:
            'Otrzymujesz tę wiadomość, ponieważ przypisano Cię do projektu w systemie ERP.',
        }),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send project assignment email to ${to}`,
        error as Error,
      );
      throw error;
    }
  }

  async sendInvoiceRequestEmail(
    to: string,
    firstName: string | null | undefined,
    details: {
      projectName: string;
      milestoneNo: string;
      milestoneDescription: string;
      netValue: string;
      requestedBy: string;
      issuedDate: string | null;
      note: string | null;
      invoicesUrl: string;
    },
  ): Promise<void> {
    try {
      const rows: Array<[string, string]> = [
        ['Projekt', escapeHtml(details.projectName)],
        [
          'Etap',
          `${escapeHtml(details.milestoneNo)} – ${escapeHtml(details.milestoneDescription)}`,
        ],
        ['Zgłaszający', escapeHtml(details.requestedBy)],
      ];
      if (details.issuedDate)
        rows.push(['Data wystawienia', escapeHtml(details.issuedDate)]);
      if (details.note)
        rows.push(['Uwagi', escapeHtml(details.note).replace(/\n/g, '<br>')]);

      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: `Prośba o wystawienie faktury: ${details.projectName} – ${details.milestoneNo}`,
        html: renderEmail({
          preheader: `${details.requestedBy} prosi o fakturę na ${details.netValue} netto (${details.projectName}).`,
          eyebrow: 'Faktury',
          title: 'Prośba o wystawienie faktury',
          body: [
            paragraph(this.greeting(firstName)),
            paragraph(
              `<strong style="color:${BRAND.ink};">${escapeHtml(details.requestedBy)}</strong> prosi o wystawienie faktury dla projektu <strong style="color:${BRAND.ink};">${escapeHtml(details.projectName)}</strong>.`,
            ),
            highlight('Kwota netto', escapeHtml(details.netValue)),
            detailsTable(rows),
            button('Przejdź do faktur projektu', details.invoicesUrl),
          ].join(''),
          footerNote:
            'Otrzymujesz tę wiadomość, ponieważ jesteś Dyrektorem finansowym w systemie ERP.',
        }),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send invoice request email to ${to}`,
        error as Error,
      );
      throw error;
    }
  }

  async sendSyncErrorEmail(
    tableName: string,
    action: string,
    errorMsg: string,
    payload: string,
  ): Promise<void> {
    try {
      // Hardcoded admin email as requested, or can be configured via env
      const adminEmail = 'tymur.kuchynskyi@ispik.eu';

      await this.transporter.sendMail({
        from: this.from,
        to: adminEmail,
        subject: `⚠️ Błąd synchronizacji Google Sheets: ${tableName}`,
        html: renderEmail({
          preheader: `Błąd zapisu do arkusza ${tableName} (${action}).`,
          eyebrow: 'Alert systemowy',
          title: 'Błąd synchronizacji z Google Sheets',
          body: [
            paragraph(
              'Wystąpił błąd podczas próby zapisu danych do Google Sheets.',
            ),
            detailsTable([
              ['Tabela / arkusz', escapeHtml(tableName)],
              ['Akcja', escapeHtml(action)],
              [
                'Błąd',
                `<span style="color:${BRAND.danger};">${escapeHtml(errorMsg)}</span>`,
              ],
            ]),
            `<div style="margin-top:18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${BRAND.muted};">Payload</div>`,
            `<pre style="margin:8px 0 0;padding:14px;background:${BRAND.page};border:1px solid ${BRAND.line};border-radius:10px;font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;color:${BRAND.text};white-space:pre-wrap;word-break:break-all;">${escapeHtml(payload)}</pre>`,
          ].join(''),
          footerNote: 'Alert techniczny dla administratora systemu ERP.',
        }),
      });
    } catch (error) {
      this.logger.error('Failed to send sync error email', error as Error);
    }
  }
}
