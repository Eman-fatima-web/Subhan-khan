'use strict';
// Offline test: stubs nodemailer so no real email is sent.
const Module = require('module');
const sent = [];
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'nodemailer') {
    return { createTransport: () => ({ sendMail: async (m) => { sent.push(m); } }) };
  }
  return origLoad.call(this, request, ...rest);
};
process.env.EMAIL_USER = 'sender@example.com';
process.env.EMAIL_PASSWORD = 'x';
process.env.EMAIL_TO = 'owner@example.com';

const assert = require('assert');
const { handleContact } = require('../lib/contact');

(async () => {
  let r = await handleContact({ name: '', email: 'bad', subject: '', message: 'short' });
  assert.strictEqual(r.status, 400); assert.ok(r.json.errors.name && r.json.errors.email && r.json.errors.subject && r.json.errors.message);

  r = await handleContact({ name: 'Ali', email: 'ali@example.com', subject: 'Hi\r\nBcc: evil@x.com', message: 'Hello, I need a logo <b>please</b>' });
  assert.strictEqual(r.status, 200); assert.strictEqual(sent.length, 1);
  assert.ok(!/[\r\n]/.test(sent[0].subject), 'header injection blocked');
  assert.strictEqual(sent[0].to, 'owner@example.com');
  assert.ok(sent[0].html.includes('&lt;b&gt;'), 'html escaped');

  r = await handleContact({ name: 'Bot', email: 'b@example.com', subject: 'spam', message: 'spam spam spam', website: 'http://spam' });
  assert.strictEqual(r.status, 200); assert.strictEqual(sent.length, 1, 'honeypot sends nothing');
  console.log('contact tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
