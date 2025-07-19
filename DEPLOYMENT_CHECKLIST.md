# ✅ Hostinger Deployment Checklist

## **Pre-Deployment**

- [ ] **Project builds successfully** (`npm run build`)
- [ ] **Environment variables prepared** (create `.env.production`)
- [ ] **Supabase project configured** for production
- [ ] **Xendit webhook URLs updated** to production domain
- [ ] **SendGrid domain verified** for production
- [ ] **Domain purchased/configured** in Hostinger

## **Environment Variables to Set**

### **Supabase (Required)**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Xendit (Required)**

```
XENDIT_SECRET_KEY=your_xendit_secret_key
XENDIT_CALLBACK_TOKEN=your_callback_token
```

### **SendGrid (Required)**

```
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=ekibagas@jualdigital.id
```

### **Next.js (Required)**

```
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_secret_key
```

## **Deployment Steps**

### **Step 1: Prepare Files**

```bash
# Run the deployment script
./deploy.sh
```

### **Step 2: Upload to Hostinger**

1. Go to Hostinger File Manager
2. Navigate to `public_html`
3. Upload the `deployment` folder contents
4. Extract if needed

### **Step 3: Configure Environment**

1. In Hostinger Control Panel → Advanced → Environment Variables
2. Add all environment variables from above
3. Use production values (not development)

### **Step 4: Update Supabase Settings**

1. Go to Supabase Dashboard → Settings → API
2. Add your production domain to "Site URL"
3. Update redirect URLs for authentication

### **Step 5: Configure Domain**

1. Point domain to Hostinger hosting
2. Enable SSL certificate
3. Force HTTPS redirect

### **Step 6: Test Everything**

- [ ] **Homepage loads** correctly
- [ ] **User registration** works
- [ ] **Login/logout** functions
- [ ] **Product browsing** works
- [ ] **Shopping cart** functions
- [ ] **Payment processing** works
- [ ] **Email notifications** sent
- [ ] **Seller dashboard** accessible
- [ ] **Admin panel** works

## **Common Issues & Solutions**

### **Build Errors**

- Check Node.js version (use 18+)
- Verify all dependencies installed
- Check environment variables

### **Database Connection**

- Verify Supabase URL and keys
- Check RLS policies
- Test database queries

### **Payment Issues**

- Verify Xendit configuration
- Check webhook URLs
- Test in sandbox first

### **Email Problems**

- Verify SendGrid API key
- Check domain verification
- Test email templates

## **Post-Deployment**

- [ ] **Monitor error logs**
- [ ] **Set up backups**
- [ ] **Configure monitoring**
- [ ] **Test all features**
- [ ] **Update documentation**

## **Support**

- **Hostinger Support**: [help.hostinger.com](https://help.hostinger.com)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)

---

**🎉 Your website should now be live!**
