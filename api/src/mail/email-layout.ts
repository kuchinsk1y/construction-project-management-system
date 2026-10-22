/**
 * Shared, email-client-safe layout for all ERP emails (blue brand theme).
 * Table-based markup + inline styles so it renders the same in Gmail, Outlook and Apple Mail.
 */

export const BRAND = {
  primary: '#0891b2', // cyan-600 — the app's default "blue" theme colour
  primaryDark: '#0e7490',
  primarySoft: '#ecfeff',
  primaryBorder: '#a5f3fc',
  ink: '#0f172a',
  text: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  line: '#e2e8f0',
  page: '#f1f5f9',
  card: '#ffffff',
  danger: '#e11d48',
  dangerSoft: '#fff1f2',
};

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Bulletproof call-to-action button (works in Outlook too) */
export function button(label: string, href: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
    <tr>
      <td align="center" bgcolor="${BRAND.primary}" style="border-radius:10px;">
        <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
          ${escapeHtml(label)}&nbsp;&rarr;
        </a>
      </td>
    </tr>
  </table>`;
}

/** Key/value rows, e.g. project details */
export function detailsTable(rows: Array<[string, string]>): string {
  const body = rows
    .map(
      ([label, value], i) => `
      <tr>
        <td style="padding:12px 16px;font-family:${FONT};font-size:13px;color:${BRAND.muted};width:42%;vertical-align:top;${i > 0 ? `border-top:1px solid ${BRAND.line};` : ''}">${label}</td>
        <td style="padding:12px 16px;font-family:${FONT};font-size:13px;color:${BRAND.ink};font-weight:600;vertical-align:top;${i > 0 ? `border-top:1px solid ${BRAND.line};` : ''}">${value}</td>
      </tr>`,
    )
    .join('');
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px;border:1px solid ${BRAND.line};border-radius:12px;border-collapse:separate;">
    ${body}
  </table>`;
}

/** Highlighted figure (amount, code…) in a soft brand-coloured panel */
export function highlight(
  label: string,
  value: string,
  opts: { mono?: boolean; size?: number } = {},
): string {
  const size = opts.size ?? 30;
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td align="center" bgcolor="${BRAND.primarySoft}" style="padding:22px 16px;border:1px solid ${BRAND.primaryBorder};border-radius:14px;">
        <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${BRAND.primaryDark};margin-bottom:8px;">${label}</div>
        <div style="font-family:${opts.mono ? "'SF Mono', ui-monospace, Menlo, Consolas, monospace" : FONT};font-size:${size}px;line-height:1.2;font-weight:800;color:${BRAND.ink};${opts.mono ? 'letter-spacing:10px;padding-left:10px;' : ''}">${value}</div>
      </td>
    </tr>
  </table>`;
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.65;color:${BRAND.text};">${html}</p>`;
}

export function note(html: string): string {
  return `<p style="margin:16px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${BRAND.muted};">${html}</p>`;
}

type LayoutOptions = {
  /** Shown as the preview line in the inbox list */
  preheader: string;
  /** Small label above the title, e.g. "Logowanie" */
  eyebrow: string;
  title: string;
  /** Inner HTML built from the helpers above */
  body: string;
  /** Why the recipient gets this email */
  footerNote: string;
};

export function renderEmail({
  preheader,
  eyebrow,
  title,
  body,
  footerNote,
}: LayoutOptions): string {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(title)}</title>
  <style>
    /* Clients that support media queries (Apple Mail, Gmail app, iOS) get tighter padding on phones */
    @media (max-width: 600px) {
      .erp-card-pad { padding: 28px 22px !important; }
      .erp-outer { padding: 24px 10px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.page}">
    <tr>
      <td class="erp-outer" align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Brand -->
          <tr>
            <td style="padding:0 4px 18px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="${BRAND.primary}" width="34" height="34" align="center" style="border-radius:9px;font-family:${FONT};font-size:15px;font-weight:800;color:#ffffff;">E</td>
                  <td style="padding-left:10px;font-family:${FONT};font-size:17px;font-weight:800;letter-spacing:-0.3px;color:${BRAND.ink};">ERP<span style="color:${BRAND.primary};">.</span></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td bgcolor="${BRAND.card}" style="border-radius:18px;border:1px solid ${BRAND.line};overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td height="5" bgcolor="${BRAND.primary}" style="font-size:0;line-height:0;border-radius:18px 18px 0 0;">&nbsp;</td></tr>
                <tr>
                  <td class="erp-card-pad" style="padding:36px 40px 36px;">
                    <div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${BRAND.primary};margin-bottom:10px;">${escapeHtml(eyebrow)}</div>
                    <h1 style="margin:0 0 18px;font-family:${FONT};font-size:24px;line-height:1.3;font-weight:800;letter-spacing:-0.4px;color:${BRAND.ink};">${escapeHtml(title)}</h1>
                    ${body}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 12px 0;text-align:center;font-family:${FONT};font-size:12px;line-height:1.6;color:${BRAND.faint};">
              ${footerNote}<br>
              &copy; ${year} ERP · Wiadomość wygenerowana automatycznie — nie odpowiadaj na nią.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
