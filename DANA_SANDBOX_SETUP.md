# DANA Sandbox Configuration

## Environment Variables for Sandbox

Add these to your `.env.local` (local) or Vercel Environment Variables:

```bash
# DANA Sandbox Credentials
DANA_CLIENT_ID=2026012116112130428745
DANA_MERCHANT_ID=216620010010044503142
DANA_CLIENT_SECRET=bd2e6c171dcfb03e35cf32916dd597229fb49
DANA_PRIVATE_KEY=your_full_private_key_here
DANA_PUBLIC_KEY=your_full_public_key_here
DANA_IS_SANDBOX=true
```

## Important Notes

1. **Private Key & Public Key**: The keys shown in the dashboard are truncated. Make sure to copy the **full** keys (they're usually much longer).

2. **Client ID vs Partner ID**: DANA uses "Client ID" but the API header is `X-PARTNER-ID`. The code automatically maps `DANA_CLIENT_ID` to the partner ID header.

3. **Sandbox URL**: Already configured to use `https://api.sandbox.dana.id` when `DANA_IS_SANDBOX=true`

4. **Webhook URLs**: Make sure you've configured these in DANA dashboard:
   - Finish Payment URL: `https://jualdigital.id/api/payments/dana/callback`
   - Finish Redirect URL: `https://jualdigital.id/payment/dana/finish`

## Getting Full Keys

1. Click the copy icon next to "Private Key" in DANA dashboard
2. Click the copy icon next to "Public Key" in DANA dashboard
3. Paste the complete keys (they should be long strings, not truncated)

## Testing

After setting up credentials:
1. Restart your dev server
2. Test checkout with "Fiat Payment (Rupiah)"
3. Should redirect to DANA sandbox payment page
4. Complete test payment
5. Verify webhook receives notification
