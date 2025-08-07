# WhatsApp Notification Setup

This document explains how to set up WhatsApp notifications for sellers when they receive new orders.

## 🚀 Features

- **Instant Notifications**: Sellers receive WhatsApp messages immediately when orders are placed
- **Multiple API Support**: Supports various WhatsApp API services
- **Rich Messages**: Includes order details, product info, and buyer information
- **Error Handling**: Graceful fallback if WhatsApp service is unavailable

## 📋 Prerequisites

1. **Seller Phone Numbers**: Ensure sellers have phone numbers in their profiles
2. **WhatsApp API Service**: Choose one of the supported services below

## 🔧 Supported WhatsApp Services

### 1. WhatsApp Business API (Recommended)

```env
WHATSAPP_API_URL=https://your-whatsapp-api.com/send
WHATSAPP_API_TOKEN=your_api_token
```

### 2. Twilio WhatsApp API

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=+1234567890
```

### 3. WhatsApp Cloud API (Meta)

```env
WHATSAPP_CLOUD_TOKEN=your_cloud_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

### 4. Fonnte API (Indonesian Service)

```env
FONNTE_API_KEY=your_api_key
```

## 🛠️ Setup Instructions

### Step 1: Choose Your WhatsApp Service

Select one of the services above based on your needs:

- **WhatsApp Business API**: Official API, requires business verification
- **Twilio**: Reliable, good documentation, paid service
- **WhatsApp Cloud API**: Meta's official API, requires business verification
- **Fonnte**: Indonesian service, easy setup, reasonable pricing

### Step 2: Add Environment Variables

Add the required environment variables to your `.env.local` file:

```env
# Choose one of these configurations:

# Option 1: WhatsApp Business API
WHATSAPP_API_URL=https://your-whatsapp-api.com/send
WHATSAPP_API_TOKEN=your_api_token

# Option 2: Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=+1234567890

# Option 3: WhatsApp Cloud API
WHATSAPP_CLOUD_TOKEN=your_cloud_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Option 4: Fonnte
FONNTE_API_KEY=your_api_key
```

### Step 3: Test the Integration

Use the test endpoint to verify your setup:

```bash
curl -X POST http://localhost:3000/api/test-whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "sellerId": "seller-uuid-here",
    "orderData": {
      "orderNumber": "ORD-001",
      "productTitle": "Test Product",
      "amount": 50000,
      "buyerName": "John Doe",
      "quantity": 1,
      "note": "Tolong kirim ke email saya"
    }
  }'
```

## 📱 Message Format

The WhatsApp message will look like this:

```
🛒 *PESANAN BARU!*

📦 Produk: Test Product (1x)
💰 Total: Rp50.000
📋 Order: #ORD-001
Pembeli: John Doe
📝 Catatan: Tolong kirim ke email saya

Silakan cek dashboard seller Anda untuk detail lengkap dan proses pesanan.

_Jual Digital - Platform Jual Beli Digital Terpercaya_
```

**Note**: The "📝 Catatan" section only appears if the customer included a note when placing the order.

## 🔄 How It Works

1. **Order Creation**: When a customer places an order
2. **Seller Detection**: System identifies all sellers involved in the order
3. **Phone Lookup**: Fetches seller's phone number from profiles table
4. **Message Creation**: Formats order details into WhatsApp message
5. **API Call**: Sends message via configured WhatsApp service
6. **Error Handling**: Logs errors but doesn't break order creation

## 🛡️ Security & Privacy

- **Phone Number Validation**: Only sends to verified seller phone numbers
- **Error Logging**: Detailed logs for debugging without exposing sensitive data
- **Graceful Degradation**: Order creation continues even if WhatsApp fails
- **Rate Limiting**: Respects API rate limits

## 🐛 Troubleshooting

### Common Issues

1. **"No phone number found for seller"**

   - Ensure seller has phone number in profiles table
   - Check phone number format (should be Indonesian format)

2. **"Failed to send WhatsApp notification"**

   - Verify API credentials
   - Check API service status
   - Review error logs

3. **"API rate limit exceeded"**
   - Implement rate limiting
   - Use queue system for high-volume orders

### Debug Mode

Enable debug logging by checking console logs:

- Look for `[WHATSAPP]` prefixed messages
- Check network requests to WhatsApp API
- Verify phone number formatting

## 📊 Monitoring

Monitor WhatsApp delivery success rates:

```sql
-- Check notification logs (if implemented)
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM whatsapp_notifications
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🔮 Future Enhancements

- **Message Templates**: Customizable message templates
- **Delivery Status**: Track message delivery status
- **Retry Logic**: Automatic retry for failed messages
- **Queue System**: Handle high-volume notifications
- **Analytics**: Track notification performance

## 📞 Support

For issues with WhatsApp integration:

1. Check the troubleshooting section above
2. Review API service documentation
3. Contact your WhatsApp API provider
4. Check application logs for detailed error messages
