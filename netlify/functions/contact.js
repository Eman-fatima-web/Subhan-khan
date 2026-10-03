const { handleContact } = require('../../lib/contact');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed.' }) };
  }
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) {}
  const { status, json } = await handleContact(body);
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json) };
};