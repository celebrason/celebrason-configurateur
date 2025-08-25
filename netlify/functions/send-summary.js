import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'text/plain' }, body: 'Method Not Allowed' };
  }

  try {
    const { prospectEmail, summary } = JSON.parse(event.body || '{}');

    if (!prospectEmail || !summary || !summary.text || !summary.idDevis) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Missing required fields' })
      };
    }

    // Uniquement contact@celebrason.fr (comme demandé)
    const from    = process.env.DEFAULT_FROM || 'contact@celebrason.fr';
    const toAdmin = process.env.DEFAULT_TO   || 'contact@celebrason.fr';
    const replyTo = 'contact@celebrason.fr';
    const subject = `Résumé configurateur — ${summary.idDevis}`;

    const escapeHtml = (s = '') =>
      s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

    const plain = summary.text;
    const htmlBlock = `
<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111;">
  <h2>Résumé de configuration</h2>
  <pre style="white-space:pre-wrap;background:#f7f7f7;padding:12px;border-radius:8px;border:1px solid #eee;">${escapeHtml(plain)}</pre>
  <p style="font-size:13px;color:#666;">NB : Résumé indicatif – un devis signé fera foi.</p>
</div>`;

    // 1) Envoi au prospect
    const rProspect = await resend.emails.send({
      from,
      to: prospectEmail,
      subject,
      text: plain,
      html: htmlBlock,
      replyTo
    });

    // Si Resend refuse l’envoi, on renvoie l’erreur clairement
    if (!rProspect?.data?.id) {
      console.error('Prospect send error:', rProspect?.error || rProspect);
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          target: 'prospect',
          error: rProspect?.error?.message || 'Resend did not accept the message'
        })
      };
    }

    // 2) Copie interne
    const rAdmin = await resend.emails.send({
      from,
      to: toAdmin,
      subject: `[COPIE] ${subject}`,
      text: `Prospect: ${prospectEmail}\n\n${plain}`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111;">
               <p><strong>Prospect :</strong> ${escapeHtml(prospectEmail)}</p>${htmlBlock}
             </div>`,
      replyTo
    });

    console.log('Resend IDs:', rProspect.data.id, rAdmin?.data?.id || null);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        ids: { prospect: rProspect.data.id, admin: rAdmin?.data?.id || null }
      })
    };
  } catch (err) {
    console.error('Handler error:', err?.message || err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err?.message || 'Unknown error' })
    };
  }
}
