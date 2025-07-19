# 🚀 Hostinger Git Integration Setup

## **Step 1: GitHub Repository Ready**

✅ Your repository is now updated: `https://github.com/ekibagascan/JualDigital.git`

## **Step 2: Hostinger Git Setup**

### **2.1 Access Hostinger Control Panel**

1. Log in to your Hostinger account
2. Go to **Hosting** → **Manage**
3. Click on **Git** in the left sidebar

### **2.2 Connect GitHub Repository**

1. Click **"Connect Repository"**
2. Choose **GitHub** as provider
3. Authorize Hostinger to access your GitHub
4. Select repository: `ekibagascan/JualDigital`
5. Choose branch: **`main`**

### **2.3 Configure Deployment Settings**

- **Source Directory**: `/` (root)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Node.js Version**: `18` or higher
- **Auto Deploy**: ✅ **ENABLE** (this makes it automatic!)

### **2.4 Environment Variables**

Add these in Hostinger → **Advanced** → **Environment Variables**:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Xendit Configuration
XENDIT_SECRET_KEY=your_xendit_secret_key
XENDIT_CALLBACK_TOKEN=your_xendit_callback_token

# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=ekibagas@jualdigital.id

# Next.js Configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_nextauth_secret
```

## **Step 3: Test Automatic Deployment**

### **3.1 Make a Test Change**

```bash
# Make a small change to test
echo "// Test deployment" >> README.md
git add README.md
git commit -m "Test automatic deployment"
git push origin main
```

### **3.2 Check Hostinger**

- Go to Hostinger → **Git** → **Deployments**
- You should see a new deployment starting automatically
- Wait for it to complete (usually 2-5 minutes)

## **Step 4: Update External Services**

### **4.1 Supabase Settings**

1. Go to Supabase Dashboard → **Settings** → **API**
2. Add your production domain to **Site URL**
3. Update **Redirect URLs** for authentication

### **4.2 Xendit Webhooks**

1. Go to Xendit Dashboard → **Webhooks**
2. Update webhook URL to: `https://your-domain.com/api/payments/callback`

### **4.3 SendGrid Domain**

1. Verify your domain in SendGrid
2. Update sender configuration

## **✅ That's It!**

Now whenever you:

1. **Push to GitHub** → Website automatically updates
2. **No manual deployment** needed
3. **Rollback** available in Hostinger Git panel

## **Troubleshooting**

### **Build Fails**

- Check Node.js version (use 18+)
- Verify environment variables
- Check build logs in Hostinger

### **Deployment Not Triggering**

- Ensure Auto Deploy is enabled
- Check GitHub webhook settings
- Verify repository permissions

### **Environment Issues**

- Double-check all environment variables
- Ensure no typos in values
- Test locally first

---

**🎉 Your website will now automatically update whenever you push to GitHub!**
