import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'text/plain' }, body: 'Method Not Allowed' };
  }

  try {
    const { prospectEmail, summary } = JSON.parse(event.body || '{}');
    if (!prospectEmail || !summary?.text || !summary?.idDevis) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Missing required fields' })
      };
    }

    // Uniquement contact@celebrason.fr
    const toAdmin = process.env.DEFAULT_TO || 'contact@celebrason.fr';
    const from    = process.env.DEFAULT_FROM || 'contact@celebrason.fr';
    const replyTo = 'contact@celebrason.fr';
    const subject = `Résumé configurateur — ${summary.idDevis}`;

    const escapeHtml = (str = '') =>
      str.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

    const plain = summary.text;
    const htmlBlock = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111;">
        <h2>Résumé de configuration</h2>
        <pre style="white-space:pre-wrap;background:#f7f7f7;padding:12px;border-radius:8px;border:1px solid #eee;">${escapeHtml(plain)}</pre>
        <p style="font-size:13px;color:#666;">NB : Résumé indicatif – un devis signé fera foi.</p>
      </div>
    `;

    // 1) Envoi AU PROSPECT — on remonte l'erreur si Resend refuse
    const rProspect = await resend.emails.send({
      from,
      to: prospectEmail,
      subject,
      text: plain,
      html: htmlBlock,
      replyTo
    });

    if (!rProspect?.data?.id) {
