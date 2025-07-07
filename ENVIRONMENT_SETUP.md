# Environment Variables Setup

Create a `.env.local` file in your project root with the following variables:

## Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Xendit Payment Gateway
NEXT_PUBLIC_XENDIT_API_URL=https://api.xendit.co
XENDIT_SECRET_KEY=your_xendit_secret_key_here
NEXT_PUBLIC_XENDIT_PUBLIC_KEY=your_xendit_public_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## How to Get These Values

### Supabase

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the Project URL and anon/public key

### Xendit

1. Sign up for a Xendit account at https://xendit.co
2. Go to your Xendit dashboard
3. Navigate to Settings > API Keys
4. Copy your Secret Key and Public Key

### App URL

- For development: `http://localhost:3000`
- For production: Your actual domain

## Optional Variables

```bash
# Email service (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## Testing the Setup

After setting up the environment variables:

1. Restart your development server
2. Try to create an order through the checkout process
3. Check the browser console for any errors
4. Verify that orders are being created in your Supabase database

## Troubleshooting

- Make sure all variables are properly set
- Check that your Supabase database has the required tables (run the schema SQL)
- Verify your Xendit account is active and has sufficient balance
- Check the browser console and server logs for error messages
