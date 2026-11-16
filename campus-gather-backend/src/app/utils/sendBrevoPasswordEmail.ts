import status from "http-status";
import { envVars } from "../config/env.js";
import AppError from "../errorHelpers/AppError.js";

export const sendBrevoPasswordEmail = async (
    toEmail: string,
    toName: string,
    studentId: string | null | undefined,
    tempPassword: string
): Promise<void> => {
    const apiKey = envVars.BREVO_API_KEY || process.env.BREVO_API_KEY;

    console.log(
        `[DEV BREVO EMAIL] To: ${toEmail} (${studentId || "No ID"}) | Generated Password: ${tempPassword}`
    );

    if (apiKey && apiKey.trim().length > 0) {
        const senderEmail =
            envVars.BREVO_SENDER_EMAIL ||
            process.env.BREVO_SENDER_EMAIL ||
            "noreply@csefest.com";

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #1e1b4b; padding: 24px; text-align: center; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 999px; color: #a5b4fc; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .title { color: #ffffff; font-size: 20px; font-weight: 800; margin: 8px 0 0; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px; }
    .password-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0; }
    .password-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; margin-bottom: 6px; }
    .password-value { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 24px; font-weight: 800; color: #4338ca; letter-spacing: 0.1em; }
    .tip { font-size: 12px; color: #64748b; background: #f8fafc; border-left: 3px solid #6366f1; padding: 10px 12px; border-radius: 4px; margin-top: 16px; }
    .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">NUBTK CSE Fest 2026</span>
      <h1 class="title">Projonmo '23 Account Recovery</h1>
    </div>
    <div class="content">
      <div class="greeting">Hello, ${toName}!</div>
      <p class="text">
        We received a password reset request for your account ${studentId ? `(Student ID: <strong>${studentId}</strong>)` : ""}.
      </p>
      <div class="password-box">
        <div class="password-label">Your New Generated Password</div>
        <div class="password-value">${tempPassword}</div>
      </div>
      <div class="tip">
        <strong>Next Steps:</strong> You can now log in using your Student ID or Email along with this new password. After logging in, you can change your password anytime in the <strong>My Fest Pass</strong> tab.
      </div>
    </div>
    <div class="footer">
      Northern University Bangladesh — Department of Computer Science & Engineering
    </div>
  </div>
</body>
</html>
        `.trim();

        try {
            const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "api-key": apiKey,
                    "Content-Type": "application/json",
                    accept: "application/json",
                },
                body: JSON.stringify({
                    sender: {
                        name: "NUBTK CSE Fest — Projonmo '23",
                        email: senderEmail,
                    },
                    to: [{ email: toEmail, name: toName }],
                    subject: "Your New Password — NUBTK CSE Fest 2026 (Projonmo '23)",
                    htmlContent,
                }),
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error("[BREVO ERROR]", response.status, errorData);
                throw new AppError(
                    status.BAD_GATEWAY,
                    "Failed to send recovery email via Brevo. Please try again later."
                );
            }
        } catch (err: any) {
            if (err instanceof AppError) {
                throw err;
            }
            console.error("[BREVO FETCH ERROR]", err);
            throw new AppError(
                status.BAD_GATEWAY,
                "Failed to send recovery email via Brevo. Please try again later."
            );
        }
    } else {
        console.log(
            `[DEV BREVO EMAIL] To: ${toEmail} (${studentId || "No ID"}) | Generated Password: ${tempPassword}`
        );
    }
};
