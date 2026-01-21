# BCI Payment Gateway Setup Guide

## Required Environment Variables

### BCI_API_KEY
**Required:** Yes  
**Description:** Your BCI Payment Gateway API key for authentication  
**How to get it:**
1. Visit https://bci-payment-gateway.onrender.com/
2. Sign up or log in to your BCI account
3. Navigate to API Settings or Developer Dashboard
4. Generate or copy your API key
5. Add it to your environment variables

## Environment Variable Setup

### For Local Development (.env.local)
```bash
BCI_API_KEY=your_bci_api_key_here
```

### For Vercel Deployment
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Key:** `BCI_API_KEY`
   - **Value:** Your BCI API key
   - **Environment:** Production, Preview, Development (select all)
3. Click "Save"
4. Redeploy your application

## How BCI Payment Works

1. **Create Payment:** When user selects crypto payment, the system calls BCI API to create a payment request
2. **Payment Link:** BCI returns a payment link and QR code
3. **User Pays:** User completes payment using crypto (IDRT or USDC)
4. **Webhook:** BCI sends webhook notification to `/api/payments/bci/callback`
5. **Order Update:** System updates order status and sends notifications

## Supported Tokens

- **IDRT** (Indonesian Rupiah Token) - Default
- **USDC** (USD Coin)

## Webhook Configuration

After deployment, configure the webhook URL in your BCI dashboard:
```
https://your-app.vercel.app/api/payments/bci/callback
```

Or for local testing with ngrok:
```
https://your-ngrok-url.ngrok.io/api/payments/bci/callback
```

## Testing

1. Make sure `BCI_API_KEY` is set in your environment
2. Select "Crypto Payment (IDRT/USDC)" in checkout
3. Complete the payment flow
4. Check webhook logs in BCI dashboard

## Troubleshooting

### Error: "BCI API credentials not configured"
- **Solution:** Make sure `BCI_API_KEY` is set in your environment variables
- **Check:** Restart your dev server after adding the variable
- **Vercel:** Make sure variable is added and app is redeployed

### Error: "BCI API error: Unauthorized"
- **Solution:** Your API key is invalid or expired
- **Check:** Regenerate API key in BCI dashboard
- **Update:** Update the environment variable with new key

### Webhook not receiving notifications
- **Solution:** Check webhook URL is correctly configured in BCI dashboard
- **Check:** Verify the webhook endpoint is accessible (not blocked by firewall)
- **Test:** Use ngrok for local testing
