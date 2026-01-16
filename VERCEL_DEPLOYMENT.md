# Vercel Deployment Guide

## Required Environment Variables

Add these environment variables in your Vercel project settings:

### Supabase Configuration

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Application URL

```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Note:** Vercel automatically provides `VERCEL_URL`, but you should set `NEXT_PUBLIC_APP_URL` to your production domain for webhooks and callbacks.

### Admin Credentials

```
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_admin_password
```

### Payment Gateways

#### Midtrans

```
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_MERCHANT_ID=your_midtrans_merchant_id
```

#### BCI Payment Gateway (Crypto)

```
BCI_API_KEY=your_bci_api_key
```

### Email Service (Resend)

```
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Jual Digital
```

### WhatsApp Service (Fonnte)

```
FONNTE_API_KEY=your_fonnte_api_key
```

## Webhook URLs to Configure

After deployment, configure these webhook URLs in your payment gateway dashboards:

### Midtrans Webhook

```
https://your-app.vercel.app/api/payments/midtrans/callback
```

### BCI Payment Gateway Webhook

```
https://your-app.vercel.app/api/payments/bci/callback
```

## Database Migrations

Run these SQL migrations in your Supabase SQL editor:

1. `migrations/create_settings_table.sql`
2. `migrations/add_payment_settings.sql`
3. Any other migration files in the `migrations/` folder

## Deployment Steps

1. **Push your code to GitHub**
2. **Import project to Vercel**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
3. **Configure Environment Variables**
   - Add all environment variables listed above
   - Make sure `NEXT_PUBLIC_APP_URL` is set to your Vercel domain
4. **Deploy**
   - Vercel will automatically build and deploy
   - Check build logs for any errors
5. **Configure Webhooks**
   - Update webhook URLs in Midtrans and BCI dashboards
6. **Test**
   - Test payment flows
   - Verify webhooks are working
   - Check admin panel access

## Important Notes

- Vercel automatically handles Next.js builds
- The `vercel.json` file is optional but recommended for configuration
- Make sure all environment variables are set before first deployment
- Database migrations must be run manually in Supabase
- Webhook URLs must be updated after deployment
