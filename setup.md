# Setup Guide for Beginners

## Step 1: Get Your Supabase Keys

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub or email
4. Create a new project
5. Go to Settings > API
6. Copy these values:
   - Project URL
   - anon public key
   - service_role key (keep this secret!)

## Step 2: Get Your Xendit Keys

1. Go to [xendit.co](https://xendit.co)
2. Sign up for an account
3. Go to Settings > API Keys
4. Copy your Secret Key and Public Key

## Step 3: Create Environment File

Create a file called `.env.local` in your project root and add:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Xendit Configuration
XENDIT_SECRET_KEY=your_xendit_secret_key_here
XENDIT_PUBLIC_KEY=your_xendit_public_key_here
NEXT_PUBLIC_XENDIT_PUBLIC_KEY=your_xendit_public_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Set Up Database

1. In your Supabase dashboard, go to SQL Editor
2. Run the SQL commands from the README.md file
3. This will create the necessary tables

## Step 5: Test the App

```bash
pnpm dev
```

Visit http://localhost:3000 to see your app!

## Common Issues

### "Cannot find module" errors

Run: `pnpm install`

### Supabase connection errors

- Check your environment variables
- Make sure your Supabase project is active
- Verify your API keys are correct

### Payment errors

- Make sure Xendit keys are correct
- Check if you're using test keys for development

## Next Steps

1. Customize the UI colors and branding
2. Add your own products
3. Set up email notifications
4. Configure webhooks for payments
5. Deploy to Vercel

Need help? Check the README.md file for more details!
