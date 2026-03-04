import { signHmac, calcTotal, sendEmail, escapeHtml } from '../_shared/utils.js';
import { t as emailT } from '../_shared/email-translations.js';


/**
 * GET /api/notify-payment?id=<booking_id>&token=<hmac>
 * Shows the guest a confirmation page before notifying the owner.
 * Using a page (rather than a direct action link) prevents accidental triggering by email prefetchers.
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url   = new URL(request.url);
  const id    = url.searchParams.get('id');
  const token = url.searchParams.get('token');

  const propertyName = env.PROPERTY_NAME || '[Nom du bien]';
  const err = (msg) => errorPage(msg, propertyName);

  if (!id || !token) return err('Lien invalide.');

  const expected = await signHmac('guest-paid:' + id, env.APPROVE_SECRET);
  if (expected !== token) return err('Lien invalide ou expiré.');

  const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
  if (!booking) return err('Réservation introuvable.');

  // If already notified or confirmed, show a friendly message instead of an error
  if (booking.status === 'payment_declared') {
    return new Response(alreadyDonePage(booking, propertyName, 'declared'), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }
  if (booking.status === 'paid') {
    return new Response(alreadyDonePage(booking, propertyName, 'paid'), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }
  if (booking.status !== 'approved') {
    return err(`Cette action n'est pas disponible pour cette réservation (statut : ${booking.status}).`);
  }

  const nights = Math.round((new Date(booking.checkout) - new Date(booking.checkin)) / 86400000);
  const total  = calcTotal(nights, parseFloat(env.PRICE_PER_NIGHT));

  return new Response(confirmFormHtml({ booking, nights, total, propertyName, id, token }), {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}

/**
 * POST /api/notify-payment
 * Records that the guest has declared their payment and notifies the owner.
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

  const expected = await signHmac('guest-paid:' + id, env.APPROVE_SECRET);
  if (expected !== token) return err('Lien invalide ou expiré.');

  const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
  if (!booking) return err('Réservation introuvable.');

  if (booking.status === 'payment_declared' || booking.status === 'paid') {
    return new Response(alreadyDonePage(booking, propertyName, booking.status === 'paid' ? 'paid' : 'declared'), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }
  if (booking.status !== 'approved') {
    return err(`Cette action n'est pas disponible pour cette réservation (statut : ${booking.status}).`);
  }

  // Update status
  try {
    await env.DB.prepare("UPDATE bookings SET status = 'payment_declared' WHERE id = ?").bind(id).run();
  } catch (dbErr) {
    console.error('[notify-payment] DB update failed:', dbErr);
    return err('Erreur serveur lors de la mise à jour. Veuillez réessayer.');
  }

  // Generate signed token for owner's "confirm receipt" link
  const confirmToken = await signHmac('confirm:' + id, env.APPROVE_SECRET);
  const confirmUrl   = `${env.SITE_URL}/api/confirm-payment?id=${encodeURIComponent(id)}&token=${encodeURIComponent(confirmToken)}`;

  const nights = Math.round((new Date(booking.checkout) - new Date(booking.checkin)) / 86400000);
  const total  = calcTotal(nights, parseFloat(env.PRICE_PER_NIGHT));

  // Notify owner
  try {
    await sendEmail(env.RESEND_API_KEY, {
      from:    env.FROM_EMAIL,
      to:      env.OWNER_EMAIL,
      subject: `Virement effectué — ${booking.firstname} ${booking.lastname}`,
      html:    ownerPaymentDeclaredHtml({ booking, nights, total, confirmUrl, propertyName }),
    });
  } catch (emailErr) {
    console.error('[notify-payment] Failed to email owner:', emailErr);
    // Don't fail the guest's experience — DB is updated, owner can check admin
  }

  return new Response(thankYouPage(booking, propertyName), {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}

// ─── Email templates ──────────────────────────────────────────────────────────

function ownerPaymentDeclaredHtml({ booking, nights, total, confirmUrl, propertyName }) {
  return `
<h2 style="color:#2C2520">Virement déclaré par le voyageur</h2>
<p style="font-family:sans-serif"><strong>${escapeHtml(booking.firstname)} ${escapeHtml(booking.lastname)}</strong> confirme avoir effectué le virement pour sa réservation à ${escapeHtml(propertyName)}.</p>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;margin:16px 0">
  <tr><td style="padding:6px 16px 6px 0;color:#888">Email</td><td style="padding:6px 0">${escapeHtml(booking.email)}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#888">Arrivée</td><td style="padding:6px 0">${escapeHtml(booking.checkin)}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#888">Départ</td><td style="padding:6px 0">${escapeHtml(booking.checkout)}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#888">Durée</td><td style="padding:6px 0">${nights} nuit${nights > 1 ? 's' : ''}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#888">Montant attendu</td><td style="padding:6px 0"><strong>${total.toLocaleString('fr-BE')} €</strong></td></tr>
</table>
<p style="font-family:sans-serif">Vérifiez la réception du virement sur votre compte bancaire, puis cliquez sur le bouton ci-dessous pour confirmer la réservation.</p>
<p style="margin-top:24px">
  <a href="${confirmUrl}" style="background:#4A5D44;color:#fff;padding:14px 28px;text-decoration:none;font-weight:bold;font-family:sans-serif;display:inline-block">
    Confirmer la réception du virement
  </a>
</p>
<p style="color:#999;font-size:12px;font-family:sans-serif;margin-top:12px">Ne confirmez que lorsque vous avez bien reçu le montant sur votre compte.</p>
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
    button  { width: 100%; padding: 14px 20px; font-size: 11px; font-weight: 600; font-family: 'Montserrat', sans-serif; text-transform: uppercase; letter-spacing: 0.07em; border: none; cursor: pointer; transition: opacity 0.15s; background: #D6A87C; color: #fff; margin-top: 20px; }
    button:hover { opacity: 0.82; }
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
    <h1>Confirmer votre virement</h1>
    <p class="sub">En cliquant sur le bouton ci-dessous, vous confirmez avoir effectué le virement bancaire. Le propriétaire sera notifié et vérifiera la réception avant de confirmer votre réservation.</p>
    <table>
      <tr><td>Arrivée</td><td>${escapeHtml(booking.checkin)}</td></tr>
      <tr><td>Départ</td><td>${escapeHtml(booking.checkout)}</td></tr>
      <tr><td>Durée</td><td>${nights} nuit${nights > 1 ? 's' : ''}</td></tr>
      <tr><td>Voyageurs</td><td>${escapeHtml(String(booking.guests))}</td></tr>
      <tr><td>Montant</td><td><strong>${total.toLocaleString('fr-BE')} €</strong></td></tr>
    </table>
    <form method="POST" action="/api/notify-payment">
      <input type="hidden" name="id" value="${escapeHtml(id)}">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <button type="submit">J'ai effectué le virement</button>
    </form>`;
  return pageShell({ title: 'Confirmer votre virement', propertyName, body });
}

function thankYouPage(booking, propertyName) {
  const body = `
    <h1 style="color:#4A5D44">✓ Notification envoyée</h1>
    <p class="sub" style="margin-top:12px">Merci ${escapeHtml(booking.firstname)}. Le propriétaire a été notifié de votre virement. Vous recevrez un email de confirmation dès que la réception aura été vérifiée.</p>
    <table style="margin-top:8px">
      <tr><td>Arrivée</td><td>${escapeHtml(booking.checkin)}</td></tr>
      <tr><td>Départ</td><td>${escapeHtml(booking.checkout)}</td></tr>
    </table>`;
  return pageShell({ title: 'Notification envoyée', propertyName, body });
}

function alreadyDonePage(booking, propertyName, state) {
  const msg = state === 'paid'
    ? 'Votre réservation est déjà confirmée. Vous avez dû recevoir un email de confirmation.'
    : 'Vous avez déjà notifié le propriétaire de votre virement. Vous recevrez un email de confirmation dès que la réception aura été vérifiée.';
  const body = `
    <h1>Déjà enregistré</h1>
    <p class="sub" style="margin-top:12px">${msg}</p>
    <table style="margin-top:8px">
      <tr><td>Arrivée</td><td>${escapeHtml(booking.checkin)}</td></tr>
      <tr><td>Départ</td><td>${escapeHtml(booking.checkout)}</td></tr>
    </table>`;
  return pageShell({ title: 'Déjà enregistré', propertyName, body });
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
