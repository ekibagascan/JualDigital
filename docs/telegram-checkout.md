# Telegram Checkout (Stars)

This project supports Telegram-first checkout for selected products while keeping website discovery.

## Product setup

Enable Telegram checkout per product in seller form:

- `telegram_enabled = true`
- optional `telegram_plan_code`
- optional `telegram_stars_price`

Products can also be recognized as Telegram checkout by tag:

- `telegram`
- `telegram_checkout`
- `telegram-stars`

## Website flow

- Product card/detail shows `Order via Telegram` if product is Telegram-enabled.
- Deep link format: `https://t.me/<bot_username>?start=buy_p_<productId>`

## Bot + API flow

1. Bot receives `/start buy_p_<productId>`.
2. Bot calls `GET /api/telegram/product?payload=buy_p_<productId>`.
3. Bot calls `POST /api/telegram/order/init`.
4. Bot sends Telegram Stars invoice with `invoicePayload` from init response.
5. Telegram webhook calls `POST /api/telegram/webhook`.
6. Payment is finalized idempotently, order marked `paid`, delivery links returned by finalize flow.

## Environment variables

Required:

- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_WEBHOOK_SECRET`

Optional pricing controls:

- `TELEGRAM_IDR_PER_STAR` (default: `1000`)
- `TELEGRAM_ADMIN_FEE_PERCENT` (default: `5`)

Pricing behavior:

- Base stars are converted from IDR product price (`ceil(IDR / TELEGRAM_IDR_PER_STAR)`).
- Admin fee is applied on top of base stars (`ceil(base_stars * TELEGRAM_ADMIN_FEE_PERCENT / 100)`).
- Invoice description includes transparent breakdown:
  - IDR subtotal
  - conversion rate
  - base stars
  - admin fee stars
  - total stars

## Database migration

Run:

- `migrations/add_telegram_checkout_support.sql`

This migration adds product Telegram columns and `telegram_payment_events` table.
