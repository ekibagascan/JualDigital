# Replit AI Assistant Prompt - Webhook POST Request Issue

Copy and paste this to Replit AI Assistant:

---

**Issue: POST requests to API endpoint failing with ENOTFOUND error**

I have a Next.js application deployed on Replit. My API endpoint `/api/payments/callback` works perfectly for GET requests, but POST requests from external services (Xendit payment gateway) are failing with ENOTFOUND error.

**Details:**

- **Endpoint:** `https://jualdigital.id/api/payments/callback`
- **GET requests:** ✅ Working - returns `{"status":"ok","message":"Webhook endpoint is active"}`
- **POST requests from Xendit:** ❌ Failing with ENOTFOUND error
- **Error message:** "The callback request failed because we were unable to reach your server"

**What I've verified:**

1. The endpoint is accessible via GET requests
2. The URL is correct: `https://jualdigital.id/api/payments/callback`
3. The code handles POST requests correctly (works locally)
4. CORS headers are properly configured
5. The route file exists at `app/api/payments/callback/route.ts`

**The problem:**
Xendit can reach my server for GET requests but cannot reach it for POST requests. This suggests a Replit configuration issue rather than a code issue.

**Questions:**

1. Are there any Replit settings that might block POST requests from external IPs?
2. Is there a firewall or security configuration blocking POST requests?
3. Are there timeout settings that might cause POST requests to fail?
4. Does Replit have any limitations on POST request body sizes or processing time?
5. Are there any serverless function configurations that might affect POST requests differently than GET?

**What I need:**
Help identifying why POST requests from external services (Xendit) are being blocked or failing, while GET requests work fine. This is preventing payment webhooks from being delivered to my application.

---
