#!/bin/bash

# 🚀 Jual Digital Marketplace Deployment Script
# This script helps prepare your project for deployment to Hostinger

echo "🚀 Starting deployment preparation..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Step 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf out

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 3: Build the project
echo "🔨 Building the project..."
npm run build

# Step 4: Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Step 5: Create deployment package
    echo "📦 Creating deployment package..."
    
    # Create a deployment directory
    mkdir -p deployment
    
    # Copy necessary files
    cp -r .next deployment/
    cp -r public deployment/
    cp package.json deployment/
    cp package-lock.json deployment/
    cp next.config.mjs deployment/
    cp -r components deployment/
    cp -r lib deployment/
    cp -r hooks deployment/
    cp -r app deployment/
    
    # Create .env.production template
    cat > deployment/.env.production << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Xendit Configuration
XENDIT_SECRET_KEY=your_xendit_secret_key_here
XENDIT_CALLBACK_TOKEN=your_xendit_callback_token_here

# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=ekibagas@jualdigital.id

# Next.js Configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_nextauth_secret_here
EOF

    # Create start script
    cat > deployment/start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Jual Digital Marketplace..."
npm install
npm start
EOF

    chmod +x deployment/start.sh
    
    echo "✅ Deployment package created in 'deployment' folder!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Upload the 'deployment' folder to your Hostinger public_html"
    echo "2. Configure environment variables in Hostinger control panel"
    echo "3. Update your domain settings"
    echo "4. Test your website"
    echo ""
    echo "📖 See DEPLOYMENT.md for detailed instructions"
    
else
    echo "❌ Build failed! Please fix the errors above."
    exit 1
fi 