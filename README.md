# Jual Digital - Digital Marketplace

A modern digital marketplace built with Next.js, Supabase, and Xendit for Indonesian digital products.

## Features

- 🛍️ **Digital Product Marketplace** - Sell and buy ebooks, templates, courses, software
- 🔐 **Supabase Authentication** - Secure user authentication and authorization
- 💳 **Xendit Payment Gateway** - Support for Indonesian payment methods (OVO, DANA, Bank Transfer, etc.)
- 📱 **Responsive Design** - Beautiful UI that works on all devices
- 🎨 **Modern UI** - Built with shadcn/ui components and Tailwind CSS
- 🔍 **Search & Filter** - Find products easily with advanced search
- 📊 **Analytics Dashboard** - Track sales and performance
- 🏪 **Seller Dashboard** - Manage products and orders

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Database, Auth, Storage)
- **Payments**: Xendit
- **Deployment**: Vercel (recommended)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Xendit Configuration
XENDIT_SECRET_KEY=your_xendit_secret_key
XENDIT_PUBLIC_KEY=your_xendit_public_key
NEXT_PUBLIC_XENDIT_PUBLIC_KEY=your_xendit_public_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your project URL and API keys from Settings > API
3. Create the following tables in your Supabase database:

#### Users Table (extends auth.users)

```sql
-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'seller', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

#### Products Table

```sql
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  file_url TEXT,
  category TEXT NOT NULL,
  seller_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (status = 'active');

CREATE POLICY "Sellers can insert their own products" ON products
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own products" ON products
  FOR UPDATE USING (auth.uid() = seller_id);
```

#### Orders Table

```sql
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method TEXT,
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 4. Set up Xendit

1. Go to [xendit.co](https://xendit.co) and create an account
2. Get your API keys from the dashboard
3. Configure webhook endpoints for payment notifications

### 5. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard pages
│   ├── cart/              # Shopping cart
│   ├── checkout/          # Payment checkout
│   ├── dashboard/         # User dashboard
│   ├── login/             # Authentication pages
│   ├── product/           # Product pages
│   ├── seller/            # Seller dashboard
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── auth/             # Authentication components
│   ├── layout/           # Layout components
│   └── ...               # Feature-specific components
├── lib/                  # Utility libraries
│   ├── supabase.ts       # Supabase client
│   ├── xendit.ts         # Xendit payment functions
│   └── utils.ts          # Utility functions
└── hooks/                # Custom React hooks
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details
# Test automatic deployment - Sat Jul 19 22:26:19 WIB 2025
