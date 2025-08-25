import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { prospectEmail, summary } = JSON.parse(event.body || '{}');

    if (!prospectEmail || !summary?.text || !summary?.idDevis) {
      return { statusCode: 400, body: 'Missing required fields' };
    }

    const toAdmin = process.env.DEFAULT_TO || 'contact@celebrason.fr';
    const from    = process.env.DEFAULT_FROM || 'devis@celebrason.fr';
    const subject = `Résumé configurateur — ${summary.idDevis}`;

    const escapeHtml = (str = '') =>
      str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

    const plain = summary.text;
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111;">
        <h2>Résumé de configuration</h2>
        <pre style="white-space:pre-wrap;background:#f7f7f7;padding:12px;border-radius:8px;border:1px solid #eee;">${escapeHtml(plain)}</pre>
        <p style="font-size:13px;color:#666;">NB : Résumé indicatif – un devis signé fera foi.</p>
      </div>
    `;

    await resend.emails.send({ from, to: prospectEmail, subject, text: plain, html });

    await resend.emails.send({
      from,
      to: toAdmin,
      subject: `[COPIE] ${subject}`,
      text: `Prospect: ${prospectEmail}

${plain}`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111;">
              <p><strong>Prospect :</strong> ${escapeHtml(prospectEmail)}</p>${html}
             </div>`
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err?.message || 'Unknown error' }) };
  }
}
