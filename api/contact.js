'use strict';
// Serverless entry (Vercel / Netlify-style). Same logic as the Express route.
const { handleContact } = require('../lib/contact');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { status, json } = await handleContact(body);
  res.status(status).json(json);
};
