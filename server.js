'use strict';
require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { handleContact } = require('./lib/contact');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:'],
        'media-src': ["'self'"],
        'connect-src': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'self'"],
        'object-src': ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json({ limit: '10kb' }));

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many messages. Please try again in a few minutes.' },
});

app.post('/api/contact', contactLimiter, async (req, res) => {
  const { status, json } = await handleContact(req.body);
  res.status(status).json(json);
});

app.use('/assets', express.static(path.join(PUBLIC, 'assets'), { maxAge: '30d', immutable: true }));
app.use(express.static(PUBLIC, { maxAge: '1h', extensions: ['html'] }));

app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC, '404.html')));

app.listen(PORT, () => console.log(`Portfolio running on http://localhost:${PORT}`));
