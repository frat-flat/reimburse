import { Resend } from 'resend';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tatekaeta.vercel.app';
const FROM_EMAIL = process.env.FROM_EMAIL || 'TaTekæTa <onboarding@resend.dev>';

interface SendNotificationEmailParams {
  to: string;
  toName: string;
  title: string;
  message: string;
  link?: string | null;
  senderName?: string | null;
  type?: string;
}

/**
 * 登録メールアドレスへ通知メールを送信
 */
export async function sendNotificationEmail({
  to,
  toName,
  title,
  message,
  link,
  senderName,
  type = 'SYSTEM',
}: SendNotificationEmailParams) {
  if (!to || !to.includes('@')) {
    console.warn(`[Email] Invalid recipient email address: ${to}`);
    return { success: false, error: 'Invalid email' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fullLink = link
    ? link.startsWith('http')
      ? link
      : `${APP_URL}${link.startsWith('/') ? link : `/${link}`}`
    : APP_URL;

  // カテゴリバッジのラベルと色
  let categoryLabel = 'お知らせ';
  let badgeColor = '#4f46e5';

  switch (type) {
    case 'SYSTEM':
    case 'RECEIPT_REISSUE_REQUEST':
      categoryLabel = '運営からのお知らせ';
      badgeColor = '#7c3aed';
      break;
    case 'MATE_REQUEST':
    case 'MATE_ACCEPTED':
      categoryLabel = 'Mate（フレンド）通知';
      badgeColor = '#059669';
      break;
    case 'SETTLEMENT_PAID':
      categoryLabel = '精算受取完了';
      badgeColor = '#0d9488';
      break;
    case 'RECEIPT_ISSUED':
      categoryLabel = '領収書発行';
      badgeColor = '#4f46e5';
      break;
    case 'PROJECT_SHARE':
      categoryLabel = 'イベント共有';
      badgeColor = '#d97706';
      break;
  }

  const subject = `【TaTekæTa】${title}`;

  // プレーンテキスト本文
  const textContent = `
${toName} 様

いつもTaTekæTa（タテカエタ）をご利用いただきありがとうございます。

新しいお知らせが届きました。
----------------------------------------
【${categoryLabel}】
${title}
${senderName ? `送信者: ${senderName}` : ''}
----------------------------------------

${message}

----------------------------------------
▼ 以下のリンクからアプリで詳細をご確認いただけます:
${fullLink}

----------------------------------------
TaTekæTa - 割り勘・精算最適化システム
https://tatekaeta.vercel.app
※本メールは送信専用アドレスから自動配信されています。
`.trim();

  // レスポンシブHTMLメールテンプレート
  const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 24px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      padding: 24px 32px;
      color: #ffffff;
    }
    .header-logo {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin: 0;
      display: inline-block;
    }
    .content {
      padding: 32px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 800;
      border-radius: 6px;
      color: #ffffff;
      background-color: ${badgeColor};
      margin-bottom: 12px;
    }
    .title {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.4;
      margin: 0 0 16px 0;
    }
    .sender-box {
      background-color: #f1f5f9;
      border-left: 3px solid ${badgeColor};
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .message-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      font-size: 14px;
      line-height: 1.7;
      color: #334155;
      white-space: pre-wrap;
      margin-bottom: 28px;
    }
    .btn-container {
      text-align: center;
      margin-bottom: 28px;
    }
    .btn {
      display: inline-block;
      background-color: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 800;
      padding: 14px 32px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 20px 32px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">TaTekæTa</div>
    </div>
    <div class="content">
      <div class="badge">${categoryLabel}</div>
      <h1 class="title">${title}</h1>

      <p style="font-size: 13px; color: #64748b; margin-top: 0; margin-bottom: 16px;">
        ${toName} 様
      </p>

      ${
        senderName
          ? `<div class="sender-box">送信者: <strong>${senderName}</strong></div>`
          : ''
      }

      <div class="message-box">${message}</div>

      <div class="btn-container">
        <a href="${fullLink}" class="btn" target="_blank" rel="noopener noreferrer">
          アプリで詳細を確認する
        </a>
      </div>
    </div>
    <div class="footer">
      本メールは「TaTekæTa - 割り勘・精算最適化システム」より自動配信されています。<br>
      ご不明な点がございましたら運営までお問い合わせください。<br>
      &copy; 2026 TaTekæTa. All rights reserved.
    </div>
  </div>
</body>
</html>
`.trim();

  // RESEND_API_KEY が設定されている場合は Resend 経由で送信
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[Email] Successfully sent email to ${to}:`, result);
      return { success: true, data: result };
    } catch (error) {
      console.error(`[Email] Failed to send email via Resend to ${to}:`, error);
      return { success: false, error };
    }
  } else {
    // APIキー未設定時はコンソールに出力（安全フォールバック）
    console.log(`[Email Mock (Set RESEND_API_KEY to send live)] To: ${to} | Subject: ${subject}`);
    return { success: true, mock: true };
  }
}
