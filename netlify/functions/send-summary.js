import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'text/plain' }, body: 'Method Not Allowed' };
  }

  try {
    const { prospectEmail, summary } = JSON.parse(event.body || '{}');

    // Champs requis
    if (!prospectEmail || !summary || !summary.text || !summary.idDevis) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Champs manquants' })
      };
    }

    // >>> AUCUN DNS NECESSAIRE
    const from    = 'Célébrason <onboarding@resend.dev>';
    const replyTo = 'contact@celebrason.fr';
    const toAdmin = 'contact@celebrason.fr';
    const subject = `Résumé configurateur — ${summary.idDevis}`;

    // Sécurise l'affichage HTML du résumé
    const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const plain = summary.text;
    const html  = `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111;">
      <h2>Résumé de configuration</h2>
      <pre style="white-space:pre-wrap;background:#f7f7f7;padding:12px;border-radius:8px;border:1px solid #eee;">${esc(plain)}</pre>
      <p style="font-size:13px;color:#666;">NB : Résumé indicatif – un devis signé fera foi.</p>
    </div>`;

    // 1) Envoi AU PROSPECT
    const p = await resend.emails.send({ from, to: prospectEmail, subject, text: plain, html, replyTo });
    if (!p?.data?.id) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, target: 'prospect', error: p?.error?.message || 'Resend a refusé l’envoi' })
      };
    }

    // 2) Copie interne
    const a = await resend.emails.send({
      from,
      to: toAdmin,
      subject: `[COPIE] ${subject}`,
      text: `Prospect: ${prospectEmail}\n\n${plain}`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111;"><p><strong>Prospect :</strong> ${esc(prospectEmail)}</p>${html}</div>`,
      replyTo
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, ids: { prospect: p.data.id, admin: a?.data?.id || null } })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: e?.message || 'Erreur inconnue' })
    };
  }
}
