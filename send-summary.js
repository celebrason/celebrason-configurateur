// netlify/functions/send-summary.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// HTML escape helper
const esc = (s = '') =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const json = (code, body) => ({
  statusCode: code,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    // CORS to allow requests from your site / previews
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
  body: JSON.stringify(body),
});

export async function handler(event) {
  // Preflight CORS
  if (event.httpMethod === 'OPTIONS') return json(204, { ok: true });

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method Not Allowed' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const prospectEmail = (payload?.prospectEmail || '').trim();
    const summary = payload?.summary || {};
    const text = (summary?.text || '').trim();
    const idDevis = (summary?.idDevis || '').trim();

    if (!prospectEmail || !text || !idDevis) {
      return json(400, {
        ok: false,
        error: 'Champs manquants (prospectEmail, summary.text, summary.idDevis).',
      });
    }

    // Fixed parameters — no surprises
    const toAdmin = 'contact@celebrason.fr';
    const subject = `Résumé configurateur — ${idDevis}`;

    // Works without DNS: sender uses resend.dev, Reply-To is your address.
    const from = 'Célébrason <onboarding@resend.dev>';
    const replyTo = ['contact@celebrason.fr'];

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111;">
        <h2>Résumé de configuration</h2>
        <pre style="white-space:pre-wrap;background:#f7f7f7;padding:12px;border-radius:8px;border:1px solid #eee;">${esc(text)}</pre>
        <p style="font-size:13px;color:#666;">NB : Résumé indicatif – un devis signé fera foi.</p>
      </div>
    `;

    // 1) Send to prospect
    const rProspect = await resend.emails.send({
      from,
      to: [prospectEmail],
      replyTo,
      subject,
      text,
      html,
    });

    // 2) Copy to admin
    const rAdmin = await resend.emails.send({
      from,
      to: ['contact@celebrason.fr'],
      replyTo,
      subject: `[COPIE] ${subject}`,
      text: `Prospect: ${prospectEmail}\n\n${text}`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111;"><p><strong>Prospect :</strong> ${esc(prospectEmail)}</p>${html}</div>`,
    });

    console.log('Resend IDs:', rProspect?.data?.id, rAdmin?.data?.id);

    return json(200, {
      ok: true,
      ids: {
        prospect: rProspect?.data?.id || null,
        admin: rAdmin?.data?.id || null,
      },
    });
  } catch (err) {
    console.error('Send error:', err?.message || err);
    return json(500, { ok: false, error: err?.message || 'Erreur inconnue' });
  }
}

/* To switch the visible sender later (after verifying your domain on Resend),
   change:
     const from = 'Célébrason <onboarding@resend.dev>';
   to:
     const from = 'Célébrason <contact@celebrason.fr>';
*/