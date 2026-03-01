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

## Database migration

Run:

- `migrations/add_telegram_checkout_support.sql`

This migration adds product Telegram columns and `telegram_payment_events` table.
