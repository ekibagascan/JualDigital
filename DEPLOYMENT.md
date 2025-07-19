# 🚀 Hostinger Deployment Guide

## **Step 1: Prepare Your Project**

### **1.1 Environment Variables**

Create a `.env.production` file in your project root with these variables:

```env
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
```

### **1.2 Update next.config.js**

Make sure your `next.config.js` is optimized for production:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@supabase/supabase-js"],
  },
  images: {
    domains: ["your-supabase-project.supabase.co", "lh3.googleusercontent.com"],
  },
};

module.exports = nextConfig;
```

## **Step 2: Hostinger Setup**

### **2.1 Create Hostinger Account**

1. Go to [hostinger.com](https://hostinger.com)
2. Sign up for a hosting plan (Premium or higher recommended)
3. Choose your domain or use a subdomain

### **2.2 Access Hostinger Control Panel**

1. Log in to your Hostinger account
2. Go to "Hosting" → "Manage"
3. Access "File Manager" or use SSH

## **Step 3: Upload Your Project**

### **Method 1: Using File Manager (Easier)**

1. In Hostinger File Manager, navigate to `public_html`
2. Upload your entire project folder
3. Extract the files if needed

### **Method 2: Using Git (Recommended)**

1. In Hostinger, go to "Git" section
2. Connect your GitHub repository
3. Deploy from your main branch

### **Method 3: Using SSH (Advanced)**

```bash
# Connect to your Hostinger server
ssh u123456789@your-server.hostinger.com

# Navigate to public_html
cd public_html

# Clone your repository
git clone https://github.com/your-username/jual-digital-marketplace.git

# Install dependencies
cd jual-digital-marketplace
npm install

# Build the project
npm run build

# Start the production server
npm start
```

## **Step 4: Configure Environment Variables**

### **4.1 In Hostinger Control Panel**

1. Go to "Advanced" → "Environment Variables"
2. Add all your environment variables from `.env.production`
3. Make sure to use the correct production values

### **4.2 Update Supabase Settings**

1. Go to your Supabase project dashboard
2. Add your production domain to "Site URL"
3. Update redirect URLs for authentication

## **Step 5: Configure Domain & SSL**

### **5.1 Domain Configuration**

1. In Hostinger, go to "Domains"
2. Point your domain to the hosting
3. Wait for DNS propagation (up to 24 hours)

### **5.2 SSL Certificate**

1. Hostinger provides free SSL certificates
2. Enable SSL in "SSL" section
3. Force HTTPS redirect

## **Step 6: Database Setup**

### **6.1 Supabase (Recommended)**

- Your Supabase database is already set up
- Update environment variables with production Supabase URL
- Ensure RLS policies are properly configured

### **6.2 Alternative: Hostinger MySQL**

If you want to use Hostinger's MySQL:

1. Create a MySQL database in Hostinger
2. Import your database schema
3. Update connection strings

## **Step 7: Payment Integration**

### **7.1 Xendit Configuration**

1. Update Xendit webhook URL to your production domain
2. Test payment flow in production
3. Ensure callback URLs are correct

### **7.2 SendGrid Setup**

1. Verify your domain in SendGrid
2. Update sender email configuration
3. Test email functionality

## **Step 8: Performance Optimization**

### **8.1 Enable Caching**

```javascript
// In next.config.js
const nextConfig = {
  // ... other config
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],
};
```

### **8.2 Image Optimization**

1. Use Next.js Image component
2. Configure image domains in `next.config.js`
3. Optimize image sizes

## **Step 9: Monitoring & Maintenance**

### **9.1 Error Monitoring**

1. Set up error tracking (Sentry, LogRocket)
2. Monitor application performance
3. Set up uptime monitoring

### **9.2 Regular Updates**

1. Keep dependencies updated
2. Monitor security patches
3. Backup database regularly

## **Step 10: Testing Production**

### **10.1 Functionality Tests**

- [ ] User registration/login
- [ ] Product browsing/search
- [ ] Shopping cart functionality
- [ ] Payment processing
- [ ] Email notifications
- [ ] Seller dashboard
- [ ] Admin panel

### **10.2 Performance Tests**

- [ ] Page load speeds
- [ ] Mobile responsiveness
- [ ] Payment flow
- [ ] Image loading

## **Troubleshooting**

### **Common Issues:**

1. **Build Errors**

   - Check Node.js version compatibility
   - Ensure all dependencies are installed
   - Verify environment variables

2. **Database Connection Issues**

   - Check Supabase connection strings
   - Verify RLS policies
   - Test database queries

3. **Payment Issues**

   - Verify Xendit configuration
   - Check webhook URLs
   - Test in sandbox mode first

4. **Email Issues**
   - Verify SendGrid configuration
   - Check domain verification
   - Test email templates

## **Support Resources**

- [Hostinger Knowledge Base](https://www.hostinger.com/help)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [Xendit Documentation](https://docs.xendit.co/)

## **Security Checklist**

- [ ] Environment variables are secure
- [ ] SSL certificate is active
- [ ] Database access is restricted
- [ ] API keys are protected
- [ ] Regular security updates
- [ ] Backup strategy in place

---

**Need Help?** Contact Hostinger support or check their documentation for specific hosting-related issues.
