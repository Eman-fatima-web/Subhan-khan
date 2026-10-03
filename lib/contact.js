'use strict';
/**
 * Shared contact-form logic used by both server.js (Express) and api/contact.js (serverless).
 * Secrets are read ONLY from environment variables - never from frontend code.
 */
const nodemailer = require('nodemailer');

const LIMITS = { name: 100, email: 254, phone: 30, subject: 150, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+()\-.\s]{5,30}$/;

const clean = (v, max) =>
  String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const oneLine = (v) => v.replace(/[\r\n]+/g, ' ');
const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function validate(body = {}) {
  // Honeypot: real visitors never fill this hidden field. Pretend success for bots.
  if (clean(body.website, 200)) return { bot: true };

  const data = {
    name: oneLine(clean(body.name, LIMITS.name)),
    email: oneLine(clean(body.email, LIMITS.email)),
    phone: oneLine(clean(body.phone, LIMITS.phone)),
    subject: oneLine(clean(body.subject, LIMITS.subject)),
    message: clean(body.message, LIMITS.message),
  };
  const errors = {};
  if (data.name.length < 2) errors.name = 'Please enter your name.';
  if (!EMAIL_RE.test(data.email)) errors.email = 'Please enter a valid email address.';
  if (data.phone && !PHONE_RE.test(data.phone)) errors.phone = 'Please enter a valid phone number.';
  if (data.subject.length < 3) errors.subject = 'Please enter a subject.';
  if (data.message.length < 10) errors.message = 'Please write a message (at least 10 characters).';
  return Object.keys(errors).length ? { errors } : { data };
}

let transporter;
function getTransporter() {
  if (transporter) return transporter;
  const { EMAIL_USER, EMAIL_PASSWORD, EMAIL_SERVICE, EMAIL_HOST, EMAIL_PORT } = process.env;
  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    const err = new Error('Email is not configured. Set EMAIL_USER and EMAIL_PASSWORD.');
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }
  const auth = { user: EMAIL_USER, pass: EMAIL_PASSWORD };
  transporter = EMAIL_HOST
    ? nodemailer.createTransport({ host: EMAIL_HOST, port: Number(EMAIL_PORT) || 465, secure: (Number(EMAIL_PORT) || 465) === 465, auth })
    : nodemailer.createTransport({ service: EMAIL_SERVICE || 'gmail', auth });
  return transporter;
}

/** Human-readable date + time in the owner's time zone (default Istanbul). */
function formatWhen(date = new Date()) {
  const tz = process.env.EMAIL_TIMEZONE || 'Europe/Istanbul';
  const opts = { timeZone: tz };
  try {
    const day = new Intl.DateTimeFormat('en-GB', { ...opts, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    const time = new Intl.DateTimeFormat('en-GB', { ...opts, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
    const zone = new Intl.DateTimeFormat('en-GB', { ...opts, timeZoneName: 'short' }).formatToParts(date).find((p) => p.type === 'timeZoneName');
    return { date: day, time: `${time} (${tz}${zone ? ', ' + zone.value : ''})`, iso: date.toISOString() };
  } catch (e) {
    return { date: date.toUTCString(), time: '', iso: date.toISOString() };
  }
}

async function sendContactEmail(d) {
  const to = process.env.EMAIL_TO || process.env.EMAIL_USER;
  const w = formatWhen();
  const text = [
    `New message from your portfolio website`,
    ``,
    `Name:    ${d.name}`,
    `Email:   ${d.email}`,
    `Phone:   ${d.phone || '-'}`,
    `Subject: ${d.subject}`,
    `Date:    ${w.date}`,
    `Time:    ${w.time}`,
    ``,
    d.message,
  ].join('\n');
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#111">
    <h2 style="margin:0 0 12px">New portfolio message</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#666;width:90px">Name</td><td>${esc(d.name)}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Email</td><td><a href="mailto:${esc(d.email)}">${esc(d.email)}</a></td></tr>
      <tr><td style="padding:6px 0;color:#666">Phone</td><td>${esc(d.phone || '-')}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Subject</td><td>${esc(d.subject)}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Date</td><td>${esc(w.date)}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Time</td><td>${esc(w.time)}</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #ddd;margin:16px 0">
    <p style="white-space:pre-wrap;line-height:1.6;font-size:15px">${esc(d.message)}</p>
    <p style="color:#999;font-size:12px">Received ${esc(w.date)}, ${esc(w.time)} · ${esc(w.iso)}</p>
  </div>`;

  await getTransporter().sendMail({
    from: `"Portfolio Contact Form" <${process.env.EMAIL_USER}>`,
    to,
    replyTo: `"${d.name.replace(/"/g, '')}" <${d.email}>`,
    subject: `[Portfolio] ${d.subject}`,
    text,
    html,
  });
}

/** Framework-agnostic handler: takes a parsed body, returns { status, json }. */
async function handleContact(body) {
  const result = validate(body);
  if (result.bot) return { status: 200, json: { ok: true } };
  if (result.errors) return { status: 400, json: { ok: false, errors: result.errors, error: 'Please check the highlighted fields.' } };
  try {
    await sendContactEmail(result.data);
    return { status: 200, json: { ok: true } };
  } catch (err) {
    console.error('[contact] send failed:', err.code || err.message);
    const notConfigured = err.code === 'EMAIL_NOT_CONFIGURED';
    return {
      status: 500,
      json: { ok: false, error: notConfigured
        ? 'The contact form is not configured yet. Please email me directly.'
        : 'Sorry, your message could not be sent. Please try again or email me directly.' },
    };
  }
}

module.exports = { handleContact, validate, formatWhen };
