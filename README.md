# Subhan Khan — Graphic Designer & Web Developer Portfolio

A fast, responsive, dependency-free front end (plain HTML/CSS/JS) with a small Node.js + Express backend that
sends the contact form to Gmail through Nodemailer.

## Quick start

```bash
npm install
cp .env.example .env      # then fill in the values (see below)
npm start                 # http://localhost:3000
npm test                  # offline test of the contact-form logic (no email is sent)
```

## Contact form → Gmail

1. Turn on **2-Step Verification** for the Gmail account that will send the mail.
2. Create an **App Password**: https://myaccount.google.com/apppasswords (16 characters).
3. Put it in `.env`:

| Variable | Meaning |
|---|---|
| `EMAIL_USER` | Gmail address that sends the mail |
| `EMAIL_PASSWORD` | Gmail **App Password** (not the normal password) |
| `EMAIL_SERVICE` | `gmail` |
| `EMAIL_TO` | Inbox that receives messages (`hr.skdigitalsolution@gmail.com`) |
| `EMAIL_TIMEZONE` | Time zone for the date/time inside each email (default `Europe/Istanbul`) |
| `PORT` | Server port (default 3000) |
| `TRUST_PROXY` | Set to `1` behind a proxy/load balancer so rate-limiting sees real IPs |

Secrets live only in `.env` / hosting environment variables — never in frontend code. `.env` is git-ignored.

Security built in: server-side validation, HTML escaping, header-injection protection, hidden honeypot field,
10 KB body limit, rate limit (5 messages / 15 min / IP), Helmet security headers + CSP.
Every email you receive shows the visitor's name, email, phone, subject, message and the **date and time** it was sent (Istanbul time).
Visitors' email is set as **Reply-To**, so you can reply straight from Gmail.

## Deploy

* **Node host (Render, Railway, VPS…)** — run `npm start`, add the env variables in the dashboard.
* **Netlify** — `netlify.toml` and `netlify/functions/contact.js` are already included; set the env variables in Site settings → Environment variables.
* **Vercel** — `api/contact.js` is a ready serverless endpoint; the `public/` folder is served statically.
  Add the env variables in project settings. (The Express rate limiter is not used there.)

Plain static hosting (GitHub Pages, etc.) cannot send email — it needs one of the options above.

After deploying, change the `og:image` / `twitter:image` URLs in `public/index.html` to absolute URLs
(e.g. `https://yourdomain.com/assets/og-image.jpg`) so link previews work everywhere.

## Editing content

Everything is in `public/index.html` (sections are clearly commented), styles in `public/css/styles.css`,
behaviour in `public/js/main.js`.

* **Design gallery** — each piece is one `<button class="g-item" data-cat="…">`. Add images to
  `public/assets/img/design/` (WebP recommended) and copy an existing item. Valid `data-cat` values:
  `youtube`, `social`, `ads`, `print`, `creative` (add a matching filter button for new categories).
* **Web projects** — copy a `<article class="w-card">`. To show buttons, add inside `.w-body`:
  `<div class="w-links"><a href="LIVE_URL" target="_blank" rel="noopener noreferrer">Live Demo</a><a href="GITHUB_URL" target="_blank" rel="noopener noreferrer">GitHub</a></div>`
  (only add the ones that really exist).
* **CV** — put `Subhan-Khan-CV.pdf` in `public/` and add
  `<a href="/Subhan-Khan-CV.pdf" download class="btn btn-ghost">Download CV</a>` in the hero buttons.
* **Skills / services / process / FAQ** — plain HTML lists in `index.html`.

## Structure

```
public/        index.html, css/, js/, assets/ (optimized WebP), favicon, 404, robots.txt
lib/contact.js shared validation + Nodemailer sending
server.js      Express server (static files + POST /api/contact)
api/contact.js serverless version of the same endpoint
test/          offline contact-form test
```
