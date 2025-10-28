# Netlify Deployment Guide

## Required Files Added

✅ `netlify.toml` - Netlify configuration file
✅ `.nvmrc` - Node version specification
✅ Updated `package.json` with Node engine requirements

## Environment Variables to Set in Netlify

Go to your Netlify dashboard → Site settings → Environment variables and add the following:

### Required Variables

1. **NEXT_PUBLIC_SUPABASE_URL**

   - Your Supabase project URL
   - Format: `https://your-project-id.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**

   - Your Supabase anonymous/public key
   - Found in Supabase Dashboard → Project Settings → API

3. **SUPABASE_SERVICE_ROLE_KEY**

   - Your Supabase service role key
   - Found in Supabase Dashboard → Project Settings → API
   - ⚠️ Keep this secure and never expose it to the client

4. **NEXT_PUBLIC_APP_URL**

   - Your site URL (e.g., `https://jualdigital.id`)
   - This is used for generating payment links and email redirects

5. **SENDGRID_API_KEY**

   - Your SendGrid API key
   - Used for sending emails

6. **SENDGRID_FROM_EMAIL**

   - The email address you want to send from
   - Must be verified in SendGrid

7. **XENDIT_SECRET_KEY**
   - Your Xendit secret key
   - Used for payment processing
   - Found in Xendit Dashboard → Settings → API Keys

### Optional Variables

8. **OPENAI_API_KEY**

   - For AI product description generation feature

9. **FONNTE_API_KEY**

   - For WhatsApp notifications via Fonnte

10. **WHATSAPP_API_URL**, **WHATSAPP_API_TOKEN**

    - For WhatsApp Business API

11. **TWILIO_ACCOUNT_SID**, **TWILIO_AUTH_TOKEN**, **TWILIO_WHATSAPP_FROM**

    - For Twilio WhatsApp integration

12. **WHATSAPP_CLOUD_TOKEN**, **WHATSAPP_PHONE_NUMBER_ID**
    - For Meta WhatsApp Cloud API

## Deployment Steps

1. **Commit and push your changes:**

   ```bash
   git add .
   git commit -m "Add Netlify configuration"
   git push origin main
   ```

2. **If Netlify is already connected to your repo:**

   - Netlify will automatically trigger a new build
   - Go to your Netlify dashboard → Deploys to monitor the build

3. **If Netlify is not connected yet:**

   - Go to https://app.netlify.com
   - Add new site → Import an existing project
   - Connect to your Git repository
   - Build command: `npm run build` (already configured in netlify.toml)
   - Publish directory: `.next` (already configured in netlify.toml)

4. **Set Environment Variables:**

   - In Netlify dashboard → Site settings → Environment variables
   - Add all the variables listed above

5. **Redeploy:**

   - After setting environment variables, trigger a new deploy
   - Go to Deploys → Trigger deploy → Deploy site

6. **Verify Deployment:**
   - Once deployed, visit your custom domain
   - Check the Netlify logs if there are any issues

## Troubleshooting

- **"Not Found" Error**: Usually means environment variables are missing or the build failed
- **Check Build Logs**: Netlify Dashboard → Deploys → Click on a failed deploy → View build logs
- **Common Issues**:
  - Missing environment variables
  - Wrong Node version (should be 20.x)
  - Build timeout (increase in Netlify settings if needed)

## Next Steps After Deployment

1. Test all functionality including:

   - User registration and login
   - Product browsing and purchasing
   - Payment flow
   - Seller registration
   - Admin dashboard

2. Set up SSL and custom domain (if not already done)

3. Configure any webhooks that point to your site
