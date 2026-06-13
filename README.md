# Farmer Marketplace

Farmer Marketplace is a production-focused mobile commerce system for direct farmer-to-buyer trade. It includes:

- Expo mobile app with a polished responsive interface
- PostgreSQL backend with JWT auth, role-based access, and persistence
- Product listings, orders, reviews, moderation, and analytics
- Live Stripe checkout for secure payments
- Free web deployment path with Netlify + Render + Neon

## Free deployment stack

This repo is ready for a free-hosted web release using:

- Netlify for the Expo web frontend
- Render free web service for the API
- Neon free PostgreSQL for the database

Official pricing pages:

- [Netlify pricing](https://www.netlify.com/pricing/)
- [Render pricing](https://render.com/pricing)
- [Neon pricing](https://neon.com/pricing)

## Project layout

- `App.js` — Expo app shell and role-based navigation
- `src/` — screens, shared UI, context, API client, and token storage
- `backend/` — Express API for PostgreSQL, auth, checkout, and marketplace logic
- `database/schema.sql` — PostgreSQL schema for pgAdmin4
- `database/initial-admin.sql` — bootstrap script for your first admin account
- `assets/` — app icon, splash screen, adaptive icon, and web favicon
- `eas.json` — Expo Application Services build profiles
- `netlify.toml` — Netlify static web configuration
- `render.yaml` — Render web service blueprint

## Setup

### 1) PostgreSQL in pgAdmin4 or Neon

1. Create a database named `farmer_marketplace` in pgAdmin4, or create a free Neon project.
2. Open the Query Tool in pgAdmin4, or use your Neon SQL editor if you prefer.
3. Run `database/schema.sql`
4. Run `database/initial-admin.sql` and replace the placeholder email/password with your own secure admin credentials

### 2) Deploy the backend on Render

1. Create a new Render Web Service from this repo, or import `render.yaml`
2. Set `rootDir` to `backend` if you deploy manually
3. Add environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CLIENT_ORIGIN`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `PAYMENT_RETURN_URL`
   - `STRIPE_CURRENCY`
   - `PAYMENT_FX_RATE`
4. Use your live Render URL as `EXPO_PUBLIC_API_URL` in the frontend

### 3) Deploy the frontend on Netlify

1. Connect the repo to Netlify
2. Keep the build command as `npm run export:web`
3. Publish the `dist` folder
4. Set `EXPO_PUBLIC_API_URL` to your Render API URL
5. Set `EXPO_PUBLIC_PAYMENT_RETURN_URL` to `https://<your-netlify-site>/payment-return`

### 4) Configure Stripe

1. Create a Stripe account and use the test or live secret key
2. Add the webhook endpoint `https://<your-render-api>/webhooks/stripe`
3. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`
4. Keep `PAYMENT_RETURN_URL` aligned with your frontend return URL

## Run locally

- Backend API: `npm run api`
- Expo app: `npm start`
- Web export: `npm run export:web`

If you test on a physical device, point `EXPO_PUBLIC_API_URL` at your computer's LAN IP instead of `localhost`.

## Stripe payments

- When `STRIPE_SECRET_KEY` is configured, checkout opens a hosted Stripe payment session.
- If Stripe keys are missing, secure card checkout returns a clear configuration error.
- Webhooks are handled at `POST /webhooks/stripe`.
- For local testing, run `stripe listen --forward-to http://localhost:4000/webhooks/stripe` and copy the printed `whsec_...` value into `backend/.env`.
- For Dashboard webhooks, add the same endpoint URL and reveal the signing secret from Stripe.

## What the app covers

- Farmers add, edit, hide, and restore listings
- Buyers search, order, pay, and review sellers
- Admin manages users, listings, and reports
- Responsive layout for mobile and wider screens

## Notes

- Product media uses remote image URLs, with graceful fallbacks if a photo fails to load.
- Payment return handling is wired for app deep links and web return URLs so the order status can refresh after checkout.
