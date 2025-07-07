# Supabase Setup Guide for Jual Digital Marketplace

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub or email
4. Create a new project
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
3. Copy and paste the entire content from `supabase-schema.sql`
4. Click **Run** to execute the schema

## Step 4: Configure Authentication

1. Go to **Authentication** → **Settings**
2. Configure your site URL:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback`
3. Go to **Authentication** → **Providers**
4. Enable **Email** provider
5. Optionally enable **Google** or other providers

## Step 5: Set Up Storage (Optional)

1. Go to **Storage** → **Buckets**
2. Create a new bucket called `products`
3. Set it to **Public** (for product images)
4. Create another bucket called `files`
5. Set it to **Private** (for downloadable files)

## Step 6: Update Environment Variables

Add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 7: Test the Setup

1. Run your development server: `pnpm dev`
2. Try to register a new user
3. Check if the profile is created automatically
4. Test login functionality

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

## Next Steps

1. **Test Authentication**: Try registering and logging in
2. **Add Sample Data**: Create some test products
3. **Test Payments**: Integrate with Xendit
4. **Deploy**: Set up production environment variables

## Production Deployment

When deploying to production:

1. Update **Site URL** in Supabase Auth settings
2. Add production redirect URLs
3. Update environment variables in your hosting platform
4. Set up proper CORS settings if needed

## Security Notes

- Never expose your `service_role` key in client-side code
- Use RLS policies to secure data access
- Regularly backup your database
- Monitor usage and set up alerts

Need help? Check the main README.md file for more details!
