# Razorpay Integration - Quick Setup Guide

## Step 1: Get Razorpay Credentials
1. Sign up at https://razorpay.com
2. Go to Settings → API Keys
3. Copy your Key ID and Key Secret

## Step 2: Update .env File
```
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
```

## Step 3: Verify Installation
The following files have been created/updated:

### New Files:
- `src/services/payment-service.js` - Payment business logic
- `src/controllers/payment-controller.js` - Payment endpoints
- `RAZORPAY_INTEGRATION.md` - Full documentation

### Updated Files:
- `src/models/order-model.js` - Added Razorpay fields
- `src/routes/user-routes.js` - Added payment routes

## Step 4: Test the Integration

### Create Order
```bash
curl -X POST http://localhost:6969/users/create-order \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=your_token" \
  -d '{
    "totalAmount": 50000,
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "zipCode": "400001",
      "country": "India"
    }
  }'
```

### Verify Payment
```bash
curl -X POST http://localhost:6969/users/verify-payment \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=your_token" \
  -d '{
    "razorpayOrderId": "order_xxxxx",
    "razorpayPaymentId": "pay_xxxxx",
    "razorpaySignature": "signature_hash"
  }'
```

### Get Orders
```bash
curl -X GET "http://localhost:6969/users/orders?page=1&limit=10" \
  -H "Cookie: accessToken=your_token"
```

## Step 5: Frontend Integration
Include Razorpay checkout script in your HTML:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

Then use the payment flow documented in RAZORPAY_INTEGRATION.md

## Troubleshooting

### "RAZORPAY_KEY_ID is undefined"
- Check .env file has correct credentials
- Restart the server after updating .env

### "Payment verification failed"
- Ensure signature is calculated correctly on frontend
- Verify RAZORPAY_KEY_SECRET is correct

### "Cart is empty"
- Add items to cart before creating order
- Use `/users/add-to-cart` endpoint first

## Support
For Razorpay support: https://razorpay.com/support
For API documentation: https://razorpay.com/docs/api/
