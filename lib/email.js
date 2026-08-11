const DEFAULT_EMAIL_API_URL = "http://80.225.238.243:3000/api";

function getEmailApiUrl() {
  return (process.env.EMAIL_API_URL || DEFAULT_EMAIL_API_URL).replace(/\/$/, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendPasswordResetEmail({ email, resetUrl }) {
  const safeUrl = escapeHtml(resetUrl);
  const htmlContent = `<!doctype html>
<html lang="tr">
  <body style="margin:0;background:#f4f5f2;font-family:Arial,sans-serif;color:#1f2421">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #d8ddd6;border-radius:10px;padding:28px">
          <tr><td><h1 style="font-size:22px;margin:0 0 16px">Şifrenizi sıfırlayın</h1></td></tr>
          <tr><td><p style="line-height:1.6;margin:0 0 22px">Ayvatullu Ev Boya hesabınız için şifre sıfırlama isteği aldık. Aşağıdaki bağlantı bir saat geçerlidir.</p></td></tr>
          <tr><td><a href="${safeUrl}" style="display:inline-block;background:#b44134;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">Yeni şifre belirle</a></td></tr>
          <tr><td><p style="color:#6c746d;font-size:13px;line-height:1.5;margin:24px 0 0">Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p></td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const response = await fetch(`${getEmailApiUrl()}/mail/send-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      htmlContent,
      recipient: email,
      subject: "Ayvatullu Ev Boya - Şifre sıfırlama",
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `E-posta servisi ${response.status} yanıtını verdi${message ? `: ${message}` : ""}`
    );
  }
}
