/**
 * Email string translations for guest-facing emails.
 * Owner emails are always in French (owner is always the Belgian host).
 * Usage: emailT[booking.lang] — falls back to 'fr' if lang is unrecognised.
 */

export const emailT = {
  fr: {
    // Guest acknowledgment (sent immediately on booking request)
    ack_subject:     (propertyName) => `Votre demande de réservation — ${propertyName}`,
    ack_heading:     'Votre demande a bien été reçue',
    ack_greeting:    (firstname) => `Bonjour ${firstname},`,
    ack_body:        (propertyName, ttlHours) =>
      `Nous avons bien reçu votre demande de réservation pour ${propertyName}. Le propriétaire vous répondra dans les <strong>${ttlHours}h</strong>.`,
    ack_col_checkin: 'Arrivée',
    ack_col_checkout:'Départ',
    ack_col_nights:  'Durée',
    ack_col_guests:  'Voyageurs',
    ack_nights:      (n) => `${n} nuit${n > 1 ? 's' : ''}`,
    ack_footer:      "Cet email est un accusé de réception automatique — aucune réservation n'est encore confirmée.",

    // Guest payment instructions (sent on owner approval — bank transfer)
    pay_subject:              (propertyName) => `Votre demande est approuvée — effectuez votre virement — ${propertyName}`,
    pay_heading:              'Votre demande est approuvée !',
    pay_greeting:             (firstname) => `Bonjour ${firstname},`,
    pay_body:                 (propertyName) => `Le propriétaire de ${propertyName} a approuvé votre demande. Pour confirmer votre réservation, veuillez effectuer un virement bancaire dans les délais indiqués.`,
    pay_col_checkin:          'Arrivée',
    pay_col_checkout:         'Départ',
    pay_col_nights:           'Durée',
    pay_col_guests:           'Voyageurs',
    pay_col_total:            'Total',
    pay_nights:               (n) => `${n} nuit${n > 1 ? 's' : ''}`,
    pay_instructions_heading: 'Coordonnées bancaires',
    pay_iban_label:           'IBAN',
    pay_ref_label:            'Communication',
    pay_amount_label:         'Montant',
    pay_deadline:             (hours) => `⏱ Effectuez le virement dans les ${hours}h pour garantir votre réservation.`,
    pay_cta:                  "J'ai effectué le virement",
    pay_cta_note:             "Cliquez sur ce bouton uniquement après avoir effectué votre virement. Le propriétaire vérifiera la réception avant de confirmer définitivement votre réservation.",

    // Guest rejection
    rej_subject:     (propertyName) => `Votre demande de réservation — ${propertyName}`,
    rej_heading:     'Votre demande de réservation',
    rej_greeting:    (firstname) => `Bonjour ${firstname},`,
    rej_body:        (propertyName) =>
      `Après examen de votre demande, le propriétaire de ${propertyName} n'est malheureusement pas en mesure d'accepter votre séjour pour les dates suivantes :`,
    rej_col_checkin: 'Arrivée',
    rej_col_checkout:'Départ',
    rej_col_nights:  'Durée',
    rej_col_guests:  'Voyageurs',
    rej_nights:      (n) => `${n} nuit${n > 1 ? 's' : ''}`,
    rej_footer:      "N'hésitez pas à consulter d'autres disponibilités sur notre site.",

    // Guest booking confirmation (sent after owner confirms receipt of bank transfer)
    conf_subject:    (propertyName) => `Confirmation de votre réservation — ${propertyName}`,
    conf_heading:    'Votre réservation est confirmée !',
    conf_greeting:   (firstname) => `Bonjour ${firstname},`,
    conf_body:       (propertyName) => `Votre virement a bien été reçu. Votre séjour à ${propertyName} est confirmé.`,
    conf_col_checkin:'Arrivée',
    conf_col_checkout:'Départ',
    conf_col_nights: 'Durée',
    conf_col_guests: 'Voyageurs',
    conf_col_total:  'Total payé',
    conf_nights:     (n) => `${n} nuit${n > 1 ? 's' : ''}`,
    conf_closing:    'Nous vous souhaitons un excellent séjour !',

    // Success URL after booking confirmation (used for any redirect if needed)
    success_path:    '/reservation-confirmee',
  },

  en: {
    // Guest acknowledgment
    ack_subject:     (propertyName) => `Your booking request — ${propertyName}`,
    ack_heading:     'Your request has been received',
    ack_greeting:    (firstname) => `Hello ${firstname},`,
    ack_body:        (propertyName, ttlHours) =>
      `We have received your booking request for ${propertyName}. The owner will get back to you within <strong>${ttlHours}h</strong>.`,
    ack_col_checkin: 'Check-in',
    ack_col_checkout:'Check-out',
    ack_col_nights:  'Duration',
    ack_col_guests:  'Guests',
    ack_nights:      (n) => `${n} night${n > 1 ? 's' : ''}`,
    ack_footer:      'This email is an automatic acknowledgment — no booking has been confirmed yet.',

    // Guest payment instructions (bank transfer)
    pay_subject:              (propertyName) => `Your request is approved — please make your bank transfer — ${propertyName}`,
    pay_heading:              'Your request is approved!',
    pay_greeting:             (firstname) => `Hello ${firstname},`,
    pay_body:                 (propertyName) => `The owner of ${propertyName} has approved your request. To secure your booking, please make a bank transfer within the deadline below.`,
    pay_col_checkin:          'Check-in',
    pay_col_checkout:         'Check-out',
    pay_col_nights:           'Duration',
    pay_col_guests:           'Guests',
    pay_col_total:            'Total',
    pay_nights:               (n) => `${n} night${n > 1 ? 's' : ''}`,
    pay_instructions_heading: 'Bank transfer details',
    pay_iban_label:           'IBAN',
    pay_ref_label:            'Reference',
    pay_amount_label:         'Amount',
    pay_deadline:             (hours) => `⏱ Please complete your transfer within ${hours} hours to secure your booking.`,
    pay_cta:                  "I've made the transfer",
    pay_cta_note:             "Only click this button after completing your bank transfer. The owner will verify receipt before issuing your booking confirmation.",

    // Guest rejection
    rej_subject:     (propertyName) => `Your booking request — ${propertyName}`,
    rej_heading:     'Your booking request',
    rej_greeting:    (firstname) => `Hello ${firstname},`,
    rej_body:        (propertyName) =>
      `After reviewing your request, the owner of ${propertyName} is unfortunately unable to accommodate your stay for the following dates:`,
    rej_col_checkin: 'Check-in',
    rej_col_checkout:'Check-out',
    rej_col_nights:  'Duration',
    rej_col_guests:  'Guests',
    rej_nights:      (n) => `${n} night${n > 1 ? 's' : ''}`,
    rej_footer:      'Feel free to check other availability on our website.',

    // Guest booking confirmation
    conf_subject:    (propertyName) => `Booking confirmation — ${propertyName}`,
    conf_heading:    'Your booking is confirmed!',
    conf_greeting:   (firstname) => `Hello ${firstname},`,
    conf_body:       (propertyName) => `Your bank transfer has been received. Your stay at ${propertyName} is confirmed.`,
    conf_col_checkin:'Check-in',
    conf_col_checkout:'Check-out',
    conf_col_nights: 'Duration',
    conf_col_guests: 'Guests',
    conf_col_total:  'Total paid',
    conf_nights:     (n) => `${n} night${n > 1 ? 's' : ''}`,
    conf_closing:    'We wish you an excellent stay!',

    // Success URL
    success_path:    '/en/reservation-confirmee',
  },
};

/** Returns the translation object for the given lang, falling back to French. */
export function t(lang) {
  return emailT[lang] ?? emailT.fr;
}
