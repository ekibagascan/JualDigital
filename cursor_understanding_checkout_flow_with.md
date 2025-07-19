# Understanding checkout flow with invoices
_Exported on 7/17/2025 at 17:00:40 GMT+7 from Cursor (1.2.4)_

---

**User**

tell me how the checkout flow based on the files, clue: invoice

---

**Cursor**

Here’s the end-to-end picture of “checkout” in this project and where the Xendit invoice fits in.

1. Client side – `CheckoutForm`  
   • File: `components/checkout/checkout-form.tsx`  
   • Collects cart items, guest/user identity and the chosen payment method (QRIS, e-wallets, VAs, retail outlets).  
   • On “Pay” it POSTs `orderData` to one of two Next.js API routes:  
     – **`/api/checkout/custom`** – the *new* multi-channel flow (default in the UI).  
     – **`/api/checkout`** – the *old* simple “invoice only” flow (kept for backward-compatibility).

2. Server side – order creation (Supabase)  
   Both routes start by inserting a new record in the `orders` table and the associated `order_items` records through `OrderService`:

   • `OrderService.createOrderWithoutPayment` (used by `/custom`) → inserts order with `status = 'pending'` but **doesn’t** touch Xendit yet.  
   • `OrderService.createOrder` (used by `/checkout`) → inserts order *and immediately creates a Xendit invoice* (see below).

3. Branch A – “invoice” flow (`/api/checkout`)  
   • After inserting the order, `OrderService.createOrder` builds an `invoiceData` payload and calls `createInvoice` in `lib/xendit.ts`.  
   • `createInvoice` sends a POST to `https://api.xendit.co/v2/invoices`.  
   • Xendit responds with `invoice_url` – a hosted checkout page.  
   • That URL is stored back onto the order (`invoice_url` column) and returned to the client as `paymentUrl`.  
   • The client can simply `router.push(paymentUrl)` (the UI no longer does this by default, but the hook is there).

4. Branch B – “custom payment” flow (`/api/checkout/custom`)  
   • After the order insert, this route calls `xenditAPI.createPayment(...)` in `lib/xendit.ts`.  
   • `createPayment` decides which Xendit endpoint to hit:  
     – QRIS → `POST /qr_codes` (returns a QR string)  
     – Astrapay / ShopeePay → `POST /ewallets/charges` (returns a deep-link / redirect)  
     – VAs & retail outlets → `POST /payment_requests` (returns VA number / payment code)  
   • The response is written back to the order (`payment_id`, `invoice_url`, `transaction_id`, etc.).  
   • JSON containing `{ order, paymentData }` is sent to the browser.  
   • `CheckoutForm` clears the cart and routes the user to:  
     – `/payment/qris/[orderId]` (if QRIS) where the QR string is rendered.  
     – `/payment/process?order_id=...&payment_id=...` for other channels, showing VA number or an e-wallet redirect button.

5. Payment status updates  
   • Xendit later calls the webhook `POST /api/payments/callback`.  
   • This endpoint examines `status` (PAID, EXPIRED, FAILED) and updates the matching order (`external_id`) inside Supabase.

6. After payment  
   • Success and failure redirect URLs that you pass to Xendit point to the built-in pages:  
     – `/payment/success`  
     – `/payment/failed`  
   • These pages read the order again (via `OrderService.getOrder`) and present a receipt or error.

Putting it together

```
Browser (CheckoutForm) ── POST /api/checkout/custom ─►
  OrderService.createOrderWithoutPayment
  └─ insert order & items in Supabase
  xenditAPI.createPayment
  └─ POST to Xendit (qr_codes | ewallets/charges | payment_requests)
  ◄── returns payment info
  update order with payment_id / invoice_url
◄── respond to browser
Browser routes to /payment/qris /payment/process

Xendit ► POST /api/payments/callback ──► update order status
```

If you switch the front-end to call `/api/checkout` instead, steps 3-6 collapse into the simpler invoice sequence:

```
Browser ── POST /api/checkout ─►
  OrderService.createOrder
  └─ insert order & items
  createInvoice (v2/invoices) ► Xendit
  ◄── invoice_url
  update order.invoice_url
◄── respond { paymentUrl }
Browser redirects user directly to Xendit-hosted checkout page
... Xendit handles UI, calls the same /api/payments/callback afterwards ...
```

So:  
• “Invoice” = one-size-fits-all hosted page created by `createInvoice` in `lib/xendit.ts`.  
• “Custom checkout” = fine-grained payments built with the Xendit Payments API, driven by the user’s method choice, implemented in `app/api/checkout/custom/route.ts`.

```plaintext
Browser (CheckoutForm) ── POST /api/checkout/custom ─►
  OrderService.createOrderWithoutPayment
  └─ insert order & items in Supabase
  xenditAPI.createPayment
  └─ POST to Xendit (qr_codes | ewallets/charges | payment_requests)
  ◄── returns payment info
  update order with payment_id / invoice_url
◄── respond to browser
Browser routes to /payment/qris /payment/process

Xendit ► POST /api/payments/callback ──► update order status
```

```plaintext
Browser ── POST /api/checkout ─►
  OrderService.createOrder
  └─ insert order & items
  createInvoice (v2/invoices) ► Xendit
  ◄── invoice_url
  update order.invoice_url
◄── respond { paymentUrl }
Browser redirects user directly to Xendit-hosted checkout page
... Xendit handles UI, calls the same /api/payments/callback afterwards ...
```

---

**User**

we currently use the number 3 so can you delete other unnecessary payment files, page, checkout form and code that doesn't need in this flow.

so the flow is user add product to cart, then in the cart page user click Lanujut pembayaran and by clicking this user will create order and redirected to self hosted xendit checkout page by xendit.

or the second scenario user click Beli sekarng in Product card or product details page then user will be redirected to cart page and click lanjut pembayaran and then pay in the self hosted xendit checkout page by xendit'

