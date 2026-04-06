# Razorpay Integration - Deployment Checklist

## Pre-Deployment Verification

### ✅ Backend Setup
- [ ] Razorpay package installed (`razorpay: ^2.9.6` in package.json)
- [ ] Payment service created: `src/services/payment-service.js`
- [ ] Payment controller created: `src/controllers/payment-controller.js`
- [ ] Order model updated with Razorpay fields
- [ ] Payment routes added to user routes
- [ ] Environment variables configured in `.env`:
  ```
  RAZORPAY_KEY_ID=your_key_id
  RAZORPAY_KEY_SECRET=your_key_secret
  ```

### ✅ Database
- [ ] Order model includes:
  - `razorpayOrderId`
  - `razorpayPaymentId`
  - `razorpaySignature`
- [ ] Order status enum includes: pending, confirmed, shipped, delivered, cancelled

### ✅ API Endpoints
- [ ] `POST /users/create-order` - Creates Razorpay order
- [ ] `POST /users/verify-payment` - Verifies payment signature
- [ ] `GET /users/orders` - Gets order history
- [ ] `GET /users/order/:orderId` - Gets order details
- [ ] All endpoints require authentication

### ✅ Security
- [ ] HMAC-SHA256 signature verification implemented
- [ ] Razorpay credentials in environment variables (not hardcoded)
- [ ] Cart cleared only after successful payment verification
- [ ] User-specific order access control implemented
- [ ] Server-side payment validation in place

### ✅ Error Handling
- [ ] Invalid amount validation
- [ ] Missing shipping address validation
- [ ] Cart empty validation
- [ ] Payment signature verification errors
- [ ] Order not found errors
- [ ] Proper HTTP status codes returned

## Testing Checklist

### ✅ Unit Testing
- [ ] Test order creation with valid data
- [ ] Test order creation with invalid amount
- [ ] Test order creation with empty cart
- [ ] Test payment verification with valid signature
- [ ] Test payment verification with invalid signature
- [ ] Test order history retrieval
- [ ] Test order details retrieval

### ✅ Integration Testing
- [ ] Test complete payment flow (create → verify)
- [ ] Test cart clearing after payment
- [ ] Test order status update to "confirmed"
- [ ] Test multiple orders for same user
- [ ] Test order history pagination

### ✅ Manual Testing with Postman
```
1. Create Order:
   POST /users/create-order
   Body: {
     "totalAmount": 50000,
     "shippingAddress": {...}
   }

2. Verify Payment:
   POST /users/verify-payment
   Body: {
     "razorpayOrderId": "order_xxxxx",
     "razorpayPaymentId": "pay_xxxxx",
     "razorpaySignature": "signature_hash"
   }

3. Get Orders:
   GET /users/orders?page=1&limit=10

4. Get Order Details:
   GET /users/order/{orderId}
```

### ✅ Frontend Testing
- [ ] Razorpay checkout script loads correctly
- [ ] Order creation API call succeeds
- [ ] Razorpay modal opens with correct amount
- [ ] Payment verification API call succeeds
- [ ] Success/error messages display correctly
- [ ] Cart clears after successful payment
- [ ] Order history displays correctly

### ✅ Test Credentials
- [ ] Using test mode credentials from Razorpay dashboard
- [ ] Test card: 4111 1111 1111 1111
- [ ] Test expiry: Any future date
- [ ] Test CVV: Any 3 digits

## Deployment Steps

### Step 1: Environment Setup
```bash
# Update .env with production credentials
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
```

### Step 2: Database Migration
```bash
# Ensure MongoDB has order collection with new fields
# Run any pending migrations if applicable
```

### Step 3: Server Restart
```bash
# Restart Node.js server
npm start
# or
npm run dev
```

### Step 4: Verify Endpoints
```bash
# Test all payment endpoints
curl -X GET http://your-domain/users/orders \
  -H "Cookie: accessToken=your_token"
```

### Step 5: Frontend Deployment
- [ ] Update Razorpay key ID in frontend
- [ ] Deploy frontend code with payment integration
- [ ] Test payment flow end-to-end

## Post-Deployment Verification

### ✅ Production Checks
- [ ] All payment endpoints accessible
- [ ] Razorpay credentials working correctly
- [ ] Orders created successfully
- [ ] Payments verified successfully
- [ ] Cart clears after payment
- [ ] Order history displays correctly
- [ ] Error messages display appropriately
- [ ] No console errors in browser
- [ ] No server errors in logs

### ✅ Monitoring
- [ ] Monitor payment success rate
- [ ] Monitor payment failure rate
- [ ] Monitor API response times
- [ ] Monitor database queries
- [ ] Check for any signature verification failures
- [ ] Monitor cart clearing functionality

### ✅ Documentation
- [ ] README updated with payment information
- [ ] API documentation updated
- [ ] Frontend developers have integration guide
- [ ] Support team has troubleshooting guide

## Rollback Plan

If issues occur:

1. **Disable Payment Feature**
   - Remove payment routes from user-routes.js
   - Restart server

2. **Revert Database Changes**
   - Order model still works without Razorpay fields
   - Existing orders unaffected

3. **Revert Code**
   - Remove payment service and controller
   - Restore previous user-routes.js

## Support & Troubleshooting

### Common Issues

**Issue: "RAZORPAY_KEY_ID is undefined"**
- Solution: Check .env file has correct credentials
- Restart server after updating .env

**Issue: "Payment verification failed"**
- Solution: Verify RAZORPAY_KEY_SECRET is correct
- Check signature calculation on frontend

**Issue: "Cart is empty"**
- Solution: Add items to cart before creating order
- Use /users/add-to-cart endpoint first

**Issue: "Order not found"**
- Solution: Verify orderId is correct
- Check user has access to order

### Razorpay Support
- Documentation: https://razorpay.com/docs/api/
- Support: https://razorpay.com/support
- Dashboard: https://dashboard.razorpay.com

## Sign-Off

- [ ] Backend Developer: _________________ Date: _______
- [ ] Frontend Developer: ________________ Date: _______
- [ ] QA Tester: _______________________ Date: _______
- [ ] DevOps/Deployment: ________________ Date: _______

## Notes
_Use this space for any additional notes or observations:_

_______________________________________________________________________________

_______________________________________________________________________________

_______________________________________________________________________________
