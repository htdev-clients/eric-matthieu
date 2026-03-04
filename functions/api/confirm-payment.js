import { signHmac, calcTotal, sendEmail, escapeHtml } from '../_shared/utils.js';
import { t as emailT } from '../_shared/email-translations.js';


/**
 * GET /api/confirm-payment?id=<booking_id>&token=<hmac>
 * Shows the owner a confirmation page before marking the booking as paid.
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url   = new URL(request.url);
  const id    = url.searchParams.get('id');
  const token = url.searchParams.get('token');

  const propertyName = env.PROPERTY_NAME || '[Nom du bien]';
  const err = (msg) => errorPage(msg, propertyName);

  if (!id || !token) return err('Lien invalide.');

  const expected = await signHmac('confirm:' + id, env.APPROVE_SECRET);
  if (expected !== token) return err('Lien invalide ou expiré.');

  const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
  if (!booking) return err('Réservation introuvable.');

  if (booking.status === 'paid') {
    return new Response(alreadyConfirmedPage(booking, propertyName), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }
  if (booking.status !== 'payment_declared') {
    return err(`Cette action n'est pas disponible pour cette réservation (statut : ${booking.status}).`);
  }

  const nights = Math.round((new Date(booking.checkout) - new Date(booking.checkin)) / 86400000);
  const total  = calcTotal(nights, parseFloat(env.PRICE_PER_NIGHT));

  return new Response(confirmFormHtml({ booking, nights, total, propertyName, id, token }), {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}

/**
 * POST /api/confirm-payment
 * Marks the booking as paid, sends confirmation emails to both guest and owner.
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  const propertyName = env.PROPERTY_NAME || '[Nom du bien]';
  const err = (msg) => errorPage(msg, propertyName);

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return err('Requête invalide.');
  }

  const id    = formData.get('id');
  const token = formData.get('token');

  if (!id || !token) return err('Requête invalide.');

  const expected = await signHmac('confirm:' + id, env.APPROVE_SECRET);
  if (expected !== token) return err('Lien invalide ou expiré.');

  const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
  if (!booking) return err('Réservation introuvable.');

  if (booking.status === 'paid') {
    return new Response(alreadyConfirmedPage(booking, propertyName), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }
  if (booking.status !== 'payment_declared') {
    return err(`Cette action n'est pas disponible pour cette réservation (statut : ${booking.status}).`);
  }

  // Mark booking as paid
  try {
    await env.DB.prepare("UPDATE bookings SET status = 'paid' WHERE id = ?").bind(id).run();
  } catch (dbErr) {
    console.error('[confirm-payment] DB update failed:', dbErr);
    return err('Erreur serveur lors de la mise à jour. Veuillez réessayer.');
  }

  const nights = Math.round((new Date(booking.checkout) - new Date(booking.checkin)) / 86400000);
  const total  = calcTotal(nights, parseFloat(env.PRICE_PER_NIGHT));
  const T = emailT(booking.lang);

  // Send confirmation emails to guest and owner in parallel
  try {
    await Promise.all([
      sendEmail(env.RESEND_API_KEY, {
        from:    env.FROM_EMAIL,
        to:      booking.email,
        subject: T.conf_subject(propertyName),
        html:    guestConfirmationHtml({ booking, nights, total, propertyName, T }),
      }),
      sendEmail(env.RESEND_API_KEY, {
        from:    env.FROM_EMAIL,
        to:      env.OWNER_EMAIL,
        subject: `Réservation confirmée — ${booking.firstname} ${booking.lastname}`,
        html:    ownerConfirmationHtml({ booking, nights, total, propertyName }),
      }),
    ]);
  } catch (emailErr) {
    // DB is already updated — log but don't fail the page
    console.error('[confirm-payment] Failed to send confirmation emails:', emailErr);
  }

  return new Response(successPage(booking, nights, total, propertyName), {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}

// ─── Email templates ──────────────────────────────────────────────────────────

function guestConfirmationHtml({ booking, nights, total, propertyName, T }) {
  return `
<h2 style="color:#4A5D44">${T.conf_heading}</h2>
<p style="font-family:sans-serif">${T.conf_greeting(escapeHtml(booking.firstname))}</p>
<p style="font-family:sans-serif">${T.conf_body(escapeHtml(propertyName))}</p>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
  <tr><td style="padding:6px 16px 6px 0;color:#888">${T.conf_col_checkin}</td><td style="padding:6px 0">${escapeHtml(booking.checkin)}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#888">${T.conf_col_checkout}</td><td style="padding:6px 0">${escapeHtml(booking.checkout)}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#888">${T.conf_col_nights}</td><td style="padding:6px 0">${T.conf_nights(nights)}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#888">${T.conf_col_guests}</td><td style="padding:6px 0">${escapeHtml(String(booking.guests))}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#888">${T.conf_col_total}</td><td style="padding:6px 0"><strong>${total.toLocaleString('fr-BE')} €</strong></td></tr>
</table>
<p style="font-family:sans-serif;margin-top:16px">${T.conf_closing}</p>
`;
}

function ownerConfirmationHtml({ booking, nights, total, propertyName }) {
  return `
<h2 style="color:#2C2520">Réservation confirmée ✓</h2>
<p style="font-family:sans-serif">Le virement de <strong>${escapeHtml(booking.firstname)} ${escapeHtml(booking.lastname)}</strong> a été confirmé. La réservation est désormais active.</p>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;margin-top:16px">
  <tr><td style="padding:6px 16px 6px 0;color:#888">Email</td><td style="padding:6px 0">${escapeHtml(booking.email)}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#888">Arrivée</td><td style="padding:6px 0">${escapeHtml(booking.checkin)}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#888">Départ</td><td style="padding:6px 0">${escapeHtml(booking.checkout)}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#888">Durée</td><td style="padding:6px 0">${nights} nuit${nights > 1 ? 's' : ''}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#888">Voyageurs</td><td style="padding:6px 0">${escapeHtml(String(booking.guests))}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#888">Montant reçu</td><td style="padding:6px 0"><strong>${total.toLocaleString('fr-BE')} €</strong></td></tr>
</table>
`;
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function pageShell({ title, propertyName, body, footerNote = '' }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} — ${escapeHtml(propertyName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Montserrat:wght@400;500;600&display=swap">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body    { font-family: 'Montserrat', sans-serif; background: #F2F0E9; color: #2C2520; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; }
    .card   { background: #FAF8F3; border: 1px solid #E5E2D9; width: 100%; max-width: 560px; padding: 40px; }
    .brand  { font-family: 'Cormorant Garamond', serif; font-size: 0.85rem; letter-spacing: 0.12em; text-transform: uppercase; color: #D6A87C; margin-bottom: 28px; }
    h1      { font-family: 'Cormorant Garamond', serif; font-size: 1.75rem; font-weight: 600; margin-bottom: 6px; line-height: 1.2; }
    .sub    { font-size: 0.8rem; color: #999; margin-bottom: 28px; line-height: 1.5; }
    table   { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
    td      { padding: 8px 0; border-bottom: 1px solid #E5E2D9; }
    td:first-child { color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; width: 38%; }
    .note   { font-size: 11px; color: #bbb; text-align: center; margin-top: 20px; }
    button  { width: 100%; padding: 14px 20px; font-size: 11px; font-weight: 600; font-family: 'Montserrat', sans-serif; text-transform: uppercase; letter-spacing: 0.07em; border: none; cursor: pointer; transition: opacity 0.15s; background: #4A5D44; color: #fff; margin-top: 20px; }
    button:hover { opacity: 0.82; }
    .caution { background: #FEF3C7; border-left: 4px solid #D97706; padding: 12px 16px; font-size: 13px; color: #92400E; margin-bottom: 20px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">${escapeHtml(propertyName)}</div>
    ${body}
  </div>
  ${footerNote ? `<p class="note">${footerNote}</p>` : ''}
</body>
</html>`;
}

function confirmFormHtml({ booking, nights, total, propertyName, id, token }) {
  const body = `
    <h1>Confirmer la réception du virement</h1>
    <p class="sub">Vérifiez que le montant a bien été crédité sur votre compte avant de confirmer.</p>
    <table>
      <tr><td>Voyageur</td><td><strong>${escapeHtml(booking.firstname)} ${escapeHtml(booking.lastname)}</strong></td></tr>
      <tr><td>Email</td><td>${escapeHtml(booking.email)}</td></tr>
      <tr><td>Arrivée</td><td>${escapeHtml(booking.checkin)}</td></tr>
      <tr><td>Départ</td><td>${escapeHtml(booking.checkout)}</td></tr>
      <tr><td>Durée</td><td>${nights} nuit${nights > 1 ? 's' : ''}</td></tr>
      <tr><td>Voyageurs</td><td>${escapeHtml(String(booking.guests))}</td></tr>
      <tr><td>Montant attendu</td><td><strong>${total.toLocaleString('fr-BE')} €</strong></td></tr>
    </table>
    <div class="caution">⚠ Cette action est irréversible. Ne confirmez que si vous avez bien reçu le montant.</div>
    <form method="POST" action="/api/confirm-payment">
      <input type="hidden" name="id" value="${escapeHtml(id)}">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <button type="submit">✓ Confirmer la réception du virement</button>
    </form>`;
  return pageShell({ title: 'Confirmer la réception', propertyName, body });
}

function successPage(booking, nights, total, propertyName) {
  const body = `
    <h1 style="color:#4A5D44">✓ Réservation confirmée</h1>
    <p class="sub" style="margin-top:12px">Le paiement a été enregistré et un email de confirmation a été envoyé à <strong>${escapeHtml(booking.email)}</strong>.</p>
    <table style="margin-top:8px">
      <tr><td>Voyageur</td><td>${escapeHtml(booking.firstname)} ${escapeHtml(booking.lastname)}</td></tr>
      <tr><td>Dates</td><td>${escapeHtml(booking.checkin)} → ${escapeHtml(booking.checkout)}</td></tr>
      <tr><td>Montant</td><td><strong>${total.toLocaleString('fr-BE')} €</strong></td></tr>
    </table>`;
  return pageShell({ title: 'Réservation confirmée', propertyName, body });
}

function alreadyConfirmedPage(booking, propertyName) {
  const body = `
    <h1>Déjà confirmée</h1>
    <p class="sub" style="margin-top:12px">Cette réservation a déjà été confirmée. Un email de confirmation a été envoyé au voyageur.</p>
    <table style="margin-top:8px">
      <tr><td>Voyageur</td><td>${escapeHtml(booking.firstname)} ${escapeHtml(booking.lastname)}</td></tr>
      <tr><td>Dates</td><td>${escapeHtml(booking.checkin)} → ${escapeHtml(booking.checkout)}</td></tr>
    </table>`;
  return pageShell({ title: 'Déjà confirmée', propertyName, body });
}

function errorPage(message, propertyName = '[Nom du bien]') {
  const body = `
    <h1 style="color:#c0392b">Une erreur est survenue</h1>
    <p class="sub" style="margin-top:12px">${escapeHtml(message)}</p>`;
  return new Response(
    pageShell({ title: 'Erreur', propertyName, body }),
    { status: 400, headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
  );
}
