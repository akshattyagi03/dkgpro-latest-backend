# 🚀 EJS Payment Page - Quick Action Guide

## What You Need to Do (3 Steps - 2 Minutes)

### Step 1: Move File
```bash
# Move payment.ejs to views directory
mv payment.ejs src/views/payment.ejs
```

### Step 2: Restart Backend
```bash
# Stop current server: Ctrl+C

# Start it:
npm start
# or
npm run dev
```

### Step 3: Test
Open in browser:
```
http://localhost:6969/payment
```

---

## ✨ What You Get

✅ **No Manual Token Entry** - Cookies handled automatically
✅ **No CORS Issues** - Server-rendered page
✅ **Beautiful UI** - Professional payment checkout
✅ **Complete Flow** - Create order → Pay → Verify
✅ **Production Ready** - Ready to deploy

---

## 🧪 Test Payment

1. Visit: `http://localhost:6969/payment`
2. Enter amount: `50000`
3. Enter address (pre-filled)
4. Click "Pay Now"
5. Use test card: `4111 1111 1111 1111`
6. Any future expiry and CVV
7. Complete payment

---

## 📊 Expected Result

```
✅ Order created
✅ Razorpay checkout opens
✅ Payment processed
✅ "Payment successful!" message
✅ Redirect to success page
```

---

## 🆘 If Something Goes Wrong

### Page Not Loading
```bash
# Check file location
ls src/views/payment.ejs

# Restart backend
npm start
```

### Razorpay Key Error
```bash
# Check .env has key
cat .env | grep RAZORPAY

# Restart backend
npm start
```

### Payment Fails
- Use test card: 4111 1111 1111 1111
- Check console for errors (F12)
- Verify .env credentials

---

## 📚 Documentation

| Need | File |
|------|------|
| Setup Help | EJS_PAYMENT_PAGE_GUIDE.md |
| API Docs | RAZORPAY_INTEGRATION.md |
| Test Data | RAZORPAY_TEST_DATA.md |
| Troubleshooting | RAZORPAY_SETUP.md |

---

## ✅ Checklist

- [ ] Moved payment.ejs to src/views/
- [ ] Backend restarted
- [ ] Can access http://localhost:6969/payment
- [ ] Page loads without errors
- [ ] Can enter amount and address
- [ ] "Pay Now" button works
- [ ] Razorpay checkout opens
- [ ] Payment verification works
- [ ] Success message appears

---

## 🎯 Next Steps

1. ✅ Move file and restart
2. ✅ Test payment page
3. ✅ Customize if needed
4. ✅ Deploy to production

---

**That's it! Your payment page is ready. 🎉**

**Time to implement: 2 minutes ⏱️**
