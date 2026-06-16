# API Reference

Base URL: configured through `EXPO_PUBLIC_API_URL` on the frontend and the Render environment on the backend.

## Auth

- `POST /auth/register` — create buyer or farmer account
- `POST /auth/login` — sign in and receive JWT
- `GET /auth/me` — load the current authenticated user

## App bootstrap

- `GET /app/bootstrap` — fetch users, products, orders, reviews, and analytics for the active session

## Profile

- `PATCH /me` — update profile fields such as name, location, phone, store name, bio, avatar, and payment preference

## Products

- `POST /products` — create a product listing
- `PATCH /products/:id` — edit a listing
- `PATCH /products/:id/availability` — toggle availability
- `DELETE /products/:id` — hide a listing
- `POST /products/:id/restore` — restore a listing

## Orders

- `POST /orders` — place an order
- `POST /orders/:id/confirm` — farmer/admin confirms an order
- `POST /orders/:id/deliver` — mark an order delivered
- `POST /orders/:id/reviews` — buyer review after delivery

## Users

- `PATCH /users/:id/status` — admin suspend/restore a user
- `PATCH /users/:id/verification` — admin verify/unverify a farmer

## Payments

- `POST /webhooks/stripe` — Stripe webhook endpoint

## Analytics and catalog

- `GET /analytics` — dashboard summary data
- `GET /catalog` — payment methods, delivery methods, and categories

