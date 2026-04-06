# EJS Payment Page - Setup & Usage Guide

## Overview
The EJS payment page is a server-rendered page that automatically handles cookies and Razorpay integration without manual token passing.

## Files Created

### 1. payment.ejs
- Location: `backend/payment.ejs` (move to `src/views/payment.ejs`)
- Purpose: Server-rendered payment checkout page
- Features:
  - Automatic cookie handling
  - Razorpay key injection from server
  - Beautiful payment UI
  - Real-time amount display
  - Complete payment flow

### 2. app.js (Updated)
- Added EJS view engine configuration
- Added `/payment` route
- Added static file serving

## Setup Instructions

### Step 1: Move EJS File
```bash
# Move the payment.ejs file to views directory
mv payment.ejs src/views/payment.ejs
```

### Step 2: Verify app.js Configuration
Check that `app.js` has:
```javascript
app.set('view engine', 'ejs')
app.set('views', './src/views')
app.use(express.static('public'))

app.get("/payment", (req, res)=>{
    res.render('payment', { razorpayKeyId: process.env.RAZORPAY_KEY_ID })
})
```

### Step 3: Restart Backend
```bash
npm start
# or
npm run dev
```

### Step 4: Access Payment Page
Open in browser:
```
http://localhost:6969/payment
```

## How It Works

### Without EJS (Old Way)
```
1. User opens HTML file locally
2. Manually enters access token
3. Makes API calls with token
4. CORS issues possible
```

### With EJS (New Way)
```
1. User visits http://localhost:6969/payment
2. Server renders page with Razorpay key
3. Cookies automatically sent with requests
4. No manual token entry needed
5. No CORS issues
```

## Features

### Automatic Cookie Handling
- Cookies are automatically sent with all requests
- No need to manually pass access token
- Secure cookie-based authentication

### Server-Side Razorpay Key Injection
```javascript
// In app.js
res.render('payment', { razorpayKeyId: process.env.RAZORPAY_KEY_ID })

// In payment.ejs
const RAZORPAY_KEY_ID = '<%= razorpayKeyId %>';
```

### Complete Payment Flow
1. User enters amount and address
2. Frontend creates order via API
3. Razorpay checkout opens
4. User completes payment
5. Frontend verifies payment
6. Order confirmed
7. Redirect to success page

## Usage

### Access Payment Page
```
http://localhost:6969/payment
```

### Test Payment
1. Enter amount: 50000
2. Enter address details
3. Click "Pay Now"
4. Use test card: 4111 1111 1111 1111
5. Any future expiry and CVV
6. Complete payment

### Expected Flow
```
1. "Creating order..." message
2. Razorpay checkout opens
3. Enter card details
4. "Verifying payment..." message
5. "✅ Payment successful!" message
6. Redirect to success page
```

## API Endpoints Used

The EJS page automatically calls:

### 1. POST /users/create-order
- Automatically includes cookies
- No manual token needed
- Returns razorpayOrderId

### 2. POST /users/verify-payment
- Automatically includes cookies
- Verifies payment signature
- Confirms order

## Advantages Over HTML Tester

| Feature | HTML Tester | EJS Page |
|---------|-------------|----------|
| Cookie Handling | Manual | Automatic |
| Token Entry | Required | Not needed |
| CORS Issues | Possible | None |
| Server Integration | No | Yes |
| Production Ready | No | Yes |
| User Experience | Developer | Customer |

## Customization

### Change Default Amount
In `payment.ejs`:
```html
<input type="number" id="amount" value="50000" min="100" required>
<!-- Change 50000 to your default -->
```

### Change Default Address
In `payment.ejs`:
```html
<input type="text" id="street" value="123 Main Street" required>
<!-- Change values as needed -->
```

### Change Colors
In `payment.ejs` CSS:
```css
.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    /* Change colors here */
}
```

### Change Success Redirect
In `payment.ejs`:
```javascript
window.location.href = '/payment-success?orderId=' + verifyData.order._id;
// Change redirect URL
```

## Error Handling

### "Razorpay key not configured"
- Check `.env` has `RAZORPAY_KEY_ID`
- Restart backend
- Refresh page

### "Cart is empty"
- Add items to cart first
- Use `/users/add-to-cart` endpoint
- Then access payment page

### "Payment verification failed"
- Check signature is correct
- Verify `RAZORPAY_KEY_SECRET` in .env
- Use test credentials

### CORS Errors
- Should not occur with EJS page
- If it does, check app.js CORS configuration
- Restart backend

## Testing Checklist

- [ ] Backend restarted
- [ ] EJS file in correct location
- [ ] app.js has EJS configuration
- [ ] Can access http://localhost:6969/payment
- [ ] Page loads without errors
- [ ] Razorpay key displayed (check console)
- [ ] Can enter amount and address
- [ ] "Pay Now" button works
- [ ] Razorpay checkout opens
- [ ] Payment verification works
- [ ] Success message appears

## File Structure

```
backend/
├── app.js (UPDATED - EJS config + /payment route)
├── payment.ejs (MOVE TO src/views/)
├── src/
│   ├── views/
│   │   └── payment.ejs (MOVED HERE)
│   ├── services/
│   │   └── payment-service.js
│   ├── controllers/
│   │   └── payment-controller.js
│   └── routes/
│       └── user-routes.js
└── ...
```

## Next Steps

1. ✅ Move `payment.ejs` to `src/views/`
2. ✅ Verify `app.js` configuration
3. ✅ Restart backend
4. ✅ Test payment page
5. ✅ Customize as needed
6. ✅ Deploy to production

## Production Deployment

### Before Deploying
1. Update Razorpay credentials to production
2. Change success redirect URL
3. Add error logging
4. Test complete flow
5. Update CORS origins if needed

### Environment Variables
```
RAZORPAY_KEY_ID=rzp_live_xxxxx (production key)
RAZORPAY_KEY_SECRET=xxxxx (production secret)
```

## Support

| Issue | Solution |
|-------|----------|
| Page not loading | Check EJS file location |
| Razorpay key undefined | Check .env and restart |
| Payment fails | Check test credentials |
| Cookies not sent | Check browser settings |
| CORS error | Check app.js CORS config |

## Quick Commands

```bash
# Restart backend
npm start

# Check if page loads
curl http://localhost:6969/payment

# View logs
npm run dev

# Test payment endpoint
curl -X POST http://localhost:6969/users/create-order \
  -H "Content-Type: application/json" \
  -d '{"totalAmount": 50000, "shippingAddress": {...}}'
```

## Summary

The EJS payment page provides:
- ✅ Automatic cookie handling
- ✅ Server-side Razorpay key injection
- ✅ No manual token entry
- ✅ No CORS issues
- ✅ Production-ready UI
- ✅ Complete payment flow
- ✅ Easy customization

**Ready to use! Just move the file and restart the backend. 🚀**
