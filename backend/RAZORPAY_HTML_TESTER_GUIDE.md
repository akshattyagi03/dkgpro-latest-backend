# Razorpay API Tester - HTML Guide

## Overview
The `razorpay-api-tester.html` file is a complete web-based UI for testing all Razorpay payment API endpoints without needing Postman or curl commands.

## Features
✅ Beautiful, responsive UI
✅ Test all payment endpoints
✅ Save configuration locally
✅ View order history in grid format
✅ Quick test functionality
✅ Real-time response display
✅ Error handling and status messages
✅ Test data reference included

## How to Use

### Step 1: Open the File
1. Open `razorpay-api-tester.html` in your web browser
2. Or navigate to: `file:///path/to/razorpay-api-tester.html`

### Step 2: Configure Settings
1. Enter your API Base URL (default: `http://localhost:6969`)
2. Enter your Access Token (from login response)
3. Enter your Razorpay Key ID (optional, for reference)
4. Click "💾 Save Configuration"

Configuration is saved in browser's localStorage, so you don't need to enter it again.

### Step 3: Test Endpoints

#### Create Order
1. Go to "📦 Create Order" tab
2. Enter order amount (₹)
3. Fill in shipping address details
4. Click "Create Order"
5. Response will show `razorpayOrderId` needed for payment

#### Verify Payment
1. Go to "✅ Verify Payment" tab
2. Enter Razorpay Order ID (from Create Order response)
3. Enter Razorpay Payment ID (from Razorpay checkout)
4. Enter Razorpay Signature (from Razorpay checkout)
5. Click "Verify Payment"

#### View Order History
1. Go to "📋 Order History" tab
2. Set page number and items per page
3. Click "Fetch Orders"
4. Orders display in grid format
5. Click any order card to view details

#### Get Order Details
1. Go to "🔍 Order Details" tab
2. Enter Order ID
3. Click "Get Details"
4. Full order information displays

### Step 4: Quick Test
1. Enter test amount
2. Click "Run Quick Test"
3. Tests order creation and history retrieval
4. Useful for quick validation

## Getting Access Token

### Via Login API
```bash
curl -X POST http://localhost:6969/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

The response will include cookies with `accessToken`.

### Extract from Browser
1. Open your app in browser
2. Login to your account
3. Open Developer Tools (F12)
4. Go to Application → Cookies
5. Find `accessToken` cookie
6. Copy its value and paste in tester

## Test Data

### Sample Amounts
- Small: ₹100
- Medium: ₹50,000
- Large: ₹100,000
- Custom: Any amount > ₹1

### Sample Address
```
Street: 123 Main Street
City: Mumbai
State: Maharashtra
Zip Code: 400001
Country: India
```

### Test Card (Razorpay)
- Card: 4111 1111 1111 1111
- Expiry: Any future date (e.g., 12/25)
- CVV: Any 3 digits (e.g., 123)
- Name: Any name

## Complete Payment Flow Test

### Step 1: Create Order
1. Go to "📦 Create Order" tab
2. Enter amount: 50000
3. Click "Create Order"
4. Note the `razorpayOrderId`

### Step 2: Process Payment (Manual)
1. Use the `razorpayOrderId` from Step 1
2. Open Razorpay checkout in separate window
3. Use test card details
4. Complete payment
5. Note `razorpayPaymentId` and `razorpaySignature`

### Step 3: Verify Payment
1. Go to "✅ Verify Payment" tab
2. Enter Order ID, Payment ID, and Signature
3. Click "Verify Payment"
4. Confirm success response

### Step 4: Check Order History
1. Go to "📋 Order History" tab
2. Click "Fetch Orders"
3. Your new order should appear in the list

## Troubleshooting

### "Please enter access token first"
- Solution: Go to Configuration section and enter your access token
- Get token by logging in to your app

### "Cart is empty"
- Solution: Add items to cart before creating order
- Use `/users/add-to-cart` endpoint first

### "Payment verification failed"
- Solution: Ensure signature is correct
- Check that you're using test credentials

### CORS Errors
- Solution: Ensure backend is running on correct URL
- Check API Base URL in configuration

### "Order not found"
- Solution: Verify Order ID is correct
- Check that order belongs to logged-in user

## Browser Compatibility
✅ Chrome/Chromium
✅ Firefox
✅ Safari
✅ Edge
✅ Opera

## Features Explained

### Configuration Section
- Save API URL, access token, and Razorpay key
- Data persists in browser localStorage
- No data sent to external servers

### Quick Test
- Validates API connectivity
- Tests order creation
- Tests order history retrieval
- Useful for quick validation

### Tab Navigation
- Create Order: Generate new payment orders
- Verify Payment: Confirm payment signatures
- Order History: View all user orders
- Order Details: Get specific order information

### Response Display
- Shows raw JSON responses
- Formatted for readability
- Scrollable for large responses
- Copy-paste friendly

### Order Grid
- Visual display of orders
- Shows order ID, amount, items, date, status
- Click to view full details
- Color-coded status badges

## Advanced Usage

### Testing Multiple Users
1. Save config for User 1
2. Test endpoints
3. Clear access token
4. Enter User 2's access token
5. Test endpoints for User 2

### Batch Testing
1. Create multiple orders
2. View in order history
3. Test pagination
4. Verify different statuses

### Performance Testing
1. Create orders with different amounts
2. Monitor response times
3. Check for errors
4. Validate data consistency

## Tips & Tricks

1. **Save Configuration**: Always save config after entering credentials
2. **Copy Order ID**: Click order cards to auto-fill order details tab
3. **Test Amounts**: Use different amounts to test various scenarios
4. **Check Console**: Open browser console (F12) for detailed logs
5. **Refresh Page**: Use Ctrl+R to reset if needed

## API Endpoints Tested

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/users/create-order` | POST | Create payment order |
| `/users/verify-payment` | POST | Verify payment signature |
| `/users/orders` | GET | Get order history |
| `/users/order/:id` | GET | Get order details |

## Security Notes

⚠️ **Important:**
- Never share your access token
- Don't use production credentials for testing
- Use test mode credentials from Razorpay
- Clear sensitive data before sharing screenshots
- Don't commit this file with real tokens

## Support

For issues:
1. Check browser console (F12)
2. Verify API is running
3. Check access token is valid
4. Ensure correct API URL
5. Review error messages

## File Location
```
backend/
├── razorpay-api-tester.html  ← This file
├── src/
│   ├── services/
│   │   └── payment-service.js
│   ├── controllers/
│   │   └── payment-controller.js
│   └── routes/
│       └── user-routes.js
└── ...
```

## Next Steps

1. ✅ Open the HTML file in browser
2. ✅ Configure API URL and access token
3. ✅ Run quick test
4. ✅ Test each endpoint
5. ✅ Verify payment flow
6. ✅ Check order history
7. ✅ Integrate with frontend

## Customization

To customize the tester:

1. **Change Colors**: Modify CSS variables in `<style>` section
2. **Add Fields**: Add new form inputs in respective tabs
3. **Change API URL**: Update default in configuration
4. **Add Endpoints**: Duplicate tab structure and add new endpoint

## Version History

- v1.0 - Initial release
  - Create Order endpoint
  - Verify Payment endpoint
  - Order History endpoint
  - Order Details endpoint
  - Configuration persistence
  - Quick test functionality

---

**Happy Testing! 🚀**
