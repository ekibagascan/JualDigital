# Complete Supabase Setup Guide for Jual Digital Marketplace

## Step 1: Create New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub or email
4. Create a new project with these settings:
   - **Name**: `jual-digital-marketplace`
   - **Database Password**: Choose a strong password
   - **Region**: Choose a region close to Indonesia (e.g., Singapore, Tokyo)
   - **Pricing Plan**: Free tier (upgrade later if needed)
5. Wait for the project to be ready (usually 1-2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...` - keep this secret!)

## Step 3: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire content from `new-supabase-setup.sql`
4. Click **Run** to execute the schema
5. This will create all tables, functions, triggers, and initial data

## Step 4: Set Up Storage Buckets

1. Go to **Storage** → **Buckets**
2. Create the following buckets:

### Products Bucket

- **Name**: `products`
- **Public bucket**: ✅ (checked)
- **File size limit**: 50 MB
- **Allowed MIME types**: `image/*`

### Files Bucket

- **Name**: `files`
- **Public bucket**: ❌ (unchecked)
- **File size limit**: 100 MB
- **Allowed MIME types**: `*/*`

### Avatars Bucket

- **Name**: `avatars`
- **Public bucket**: ✅ (checked)
- **File size limit**: 5 MB
- **Allowed MIME types**: `image/*`

3. After creating the buckets, run the `storage-buckets-setup.sql` script to set up policies

## Step 5: Configure Authentication

1. Go to **Authentication** → **Settings**
2. Configure your site URL:

   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add these URLs:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/confirm`
     - `http://localhost:3000/auth/reset-password`

3. Go to **Authentication** → **Providers**
4. Enable **Email** provider
5. Optionally enable **Google** provider:
   - Get Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com)
   - Add your Google Client ID and Secret
   - Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`

## Step 6: Update Environment Variables

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Xendit Configuration
XENDIT_SECRET_KEY=your_xendit_secret_key_here
XENDIT_PUBLIC_KEY=your_xendit_public_key_here
NEXT_PUBLIC_XENDIT_PUBLIC_KEY=your_xendit_public_key_here
NEXT_PUBLIC_XENDIT_API_URL=https://api.xendit.co

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 7: Insert Sample Data

1. In your Supabase dashboard, go to **SQL Editor**
2. Create a new query
3. Copy and paste the content from `insert-akun-products.sql`
4. **Important**: Replace the seller UUID with a real user ID from your project
5. Click **Run** to insert the sample products

## Step 8: Test the Setup

1. Run your development server: `pnpm dev`
2. Try to register a new user
3. Check if the profile is created automatically
4. Test login functionality
5. Browse the sample products

## Step 9: Check Existing Functions (Optional)

If you want to check what functions exist in your current project:

1. Run the `check-existing-functions.sql` script
2. This will show you all functions, triggers, tables, and policies
3. Compare with the new setup to ensure nothing is missing

## Database Tables Overview

### Core Tables:

- **`profiles`** - User profiles and seller information
- **`products`** - All product data
- **`product_variants`** - Product variants/pricing
- **`orders`** - Order information
- **`order_items`** - Individual items in orders
- **`downloads`** - Download tracking
- **`reviews`** - Product reviews and ratings

### Management Tables:

- **`withdrawals`** - Seller withdrawal requests
- **`categories`** - Product categories
- **`site_settings`** - Platform configuration
- **`notifications`** - User notifications
- **`analytics`** - Usage analytics

### Key Functions:

- **`handle_new_user()`** - Creates profile on signup
- **`update_product_stats()`** - Updates sales stats
- **`update_product_rating()`** - Updates product ratings
- **`generate_order_number()`** - Generates unique order numbers

### Key Features:

- ✅ **Row Level Security (RLS)** - Secure data access
- ✅ **Automatic triggers** - Update stats and ratings
- ✅ **User roles** - user, seller, admin
- ✅ **Product variants** - Multiple pricing options
- ✅ **Download tracking** - Limit downloads per purchase
- ✅ **Review system** - Product ratings and reviews
- ✅ **Analytics** - Track user behavior
- ✅ **Notifications** - In-app notifications

## Common Issues & Solutions

### Issue: "Cannot find module '@supabase/supabase-js'"

**Solution**: Run `pnpm install` to install dependencies

### Issue: "Invalid API key"

**Solution**: Check your environment variables in `.env.local`

### Issue: "RLS policy violation"

**Solution**: Make sure you're logged in and have proper permissions

### Issue: "Profile not created on signup"

**Solution**: Check the trigger function in the SQL schema

### Issue: "Storage bucket not found"

**Solution**: Make sure you created the buckets in the Supabase dashboard

### Issue: "Google OAuth not working"

**Solution**:

1. Check your Google OAuth credentials
2. Verify redirect URLs in both Supabase and Google Console
3. Make sure the region is correct

## Production Deployment

When deploying to production:

1. Update **Site URL** in Supabase Auth settings to your production domain
2. Add production redirect URLs
3. Update environment variables in your hosting platform
4. Set up proper CORS settings if needed
5. Configure webhooks for payment notifications

## Security Notes

- Never expose your `service_role` key in client-side code
- Use RLS policies to secure data access
- Regularly backup your database
- Monitor usage and set up alerts
- Keep your API keys secure

## Next Steps

1. **Test Authentication**: Try registering and logging in
2. **Add Sample Data**: Create some test products
3. **Test Payments**: Integrate with Xendit
4. **Customize UI**: Update colors and branding
5. **Deploy**: Set up production environment

## Troubleshooting Regional Issues

If you're experiencing login issues related to region:

1. **Choose the right region**: Select a region close to Indonesia (Singapore, Tokyo)
2. **Check latency**: Test connection speed to your chosen region
3. **Update redirect URLs**: Make sure all URLs are correct for your region
4. **Clear browser cache**: Sometimes cached data can cause issues
5. **Test in incognito mode**: To rule out browser extension issues

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check the Supabase dashboard logs
3. Verify all environment variables are set correctly
4. Test with a fresh browser session
5. Check the Supabase status page for any outages

Need help? Check the main README.md file for more details!
