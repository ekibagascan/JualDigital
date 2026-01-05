# Manual Payment System Setup Guide

## Overview

This system replaces Xendit payment gateway with a manual payment confirmation flow where:

1. Users checkout and see payment instructions
2. Users upload proof of payment
3. Admin manually confirms payments
4. Order status updates to 'paid' and download emails are sent

## Database Migration

Run the SQL migration in your Supabase SQL editor:

```sql
-- See migrations/add_payment_proof_fields.sql
```

Or manually add these columns to the `orders` table:

- `payment_proof_url` (TEXT)
- `payment_proof_amount` (NUMERIC)
- `payment_proof_date` (DATE)
- `payment_proof_note` (TEXT)

## Environment Variables

Add these to your `.env.local` and production environment:

```env
# Bank Account Details (for payment instructions page)
NEXT_PUBLIC_BANK_NAME="Bank BCA"
NEXT_PUBLIC_BANK_ACCOUNT="1234567890"
NEXT_PUBLIC_BANK_ACCOUNT_NAME="PT Jual Digital"
```

**Important:** Update these with your actual bank account details!

## Supabase Storage

Ensure you have a `files` bucket in Supabase Storage for storing payment proof images:

1. Go to Supabase Dashboard > Storage
2. Create bucket named `files` if it doesn't exist
3. Set bucket to public or configure proper RLS policies

## How It Works

### User Flow:

1. User adds items to cart and clicks "Lanjut Pembayaran"
2. Order is created with `payment_provider: 'manual'` and `status: 'pending'`
3. User is redirected to `/payment/instructions?order_id=...`
4. User sees bank account details and uploads payment proof
5. User is redirected to `/payment/pending?order_id=...` (auto-refreshes every 10s)
6. When admin confirms, user is redirected to `/payment/success`

### Admin Flow:

1. Admin goes to `/admin/orders`
2. Admin clicks on an order with `payment_provider: 'manual'` and `status: 'pending'`
3. Admin sees payment proof image and details
4. Admin clicks "Konfirmasi Pembayaran" or "Tolak Pembayaran"
5. If confirmed:
   - Order status changes to `paid`
   - Download emails are sent to customers
   - Order fulfillment is triggered

## Files Modified/Created

### Modified:

- `lib/order-service.ts` - Removed Xendit, added manual payment flow
- `components/admin/admin-order-detail.tsx` - Added payment proof viewing and confirmation

### Created:

- `app/payment/instructions/page.tsx` - Payment instructions page
- `app/payment/pending/page.tsx` - Pending payment status page
- `app/api/payments/upload-proof/route.ts` - API for uploading payment proof
- `app/api/admin/payments/confirm/route.ts` - API for admin to confirm/reject payments
- `migrations/add_payment_proof_fields.sql` - Database migration

## Testing Checklist

- [ ] Run database migration
- [ ] Set environment variables (bank account details)
- [ ] Verify Supabase Storage bucket `files` exists
- [ ] Test checkout flow
- [ ] Test payment proof upload
- [ ] Test admin payment confirmation
- [ ] Verify download emails are sent after confirmation

## Notes

- Payment proof images are stored in Supabase Storage (`files` bucket)
- Maximum file size: 5MB
- Supported formats: JPG, PNG, GIF
- Admin must manually verify each payment before confirming
- The system will automatically send download emails when payment is confirmed
