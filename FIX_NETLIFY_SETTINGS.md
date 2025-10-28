# Fix Netlify Build Settings

The site is deploying but showing "not found" because Netlify dashboard settings are overriding the configuration.

## Steps to Fix:

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Select your site** → `jualdigital`
3. **Go to**: Site settings → Build & deploy → Build settings
4. **Click "Edit settings"**

### Update these settings:

5. **Build command**:

   - Should be: `npm run build`
   - Make sure "Run build command" is ON

6. **Publish directory**:

   - **LEAVE EMPTY** (or set to `.netlify/functions/___netlify-server-handler.mjs`)
   - The plugin will handle this

7. **Save** and trigger a new deployment

### OR Remove Manual Settings:

Delete any custom values for "Build command" and "Publish directory" and let the `netlify.toml` file handle everything.
