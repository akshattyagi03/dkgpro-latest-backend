# CORS Error - Quick Fix (2 Minutes)

## 🚨 Error You're Seeing
```
Access to fetch at 'http://localhost:6969/users/create-order' from origin 
'http://localhost:5500' has been blocked by CORS policy
```

## ✅ What Was Done
CORS middleware has been added to `app.js` to allow cross-origin requests.

## 🔧 What You Need to Do

### Step 1: Restart Backend (30 seconds)
```bash
# Stop current server: Press Ctrl+C

# Restart it:
npm start
# or
npm run dev
```

### Step 2: Clear Browser Cache (30 seconds)
1. Open DevTools: Press **F12**
2. Go to **Application** tab
3. Click **Cookies** → **localhost**
4. Delete all cookies
5. Refresh page: **Ctrl+R** or **Cmd+R**

### Step 3: Test Again (30 seconds)
1. Open `razorpay-api-tester.html` in browser
2. Make sure URL is: `http://localhost:5500` (not file://)
3. Enter API URL: `http://localhost:6969`
4. Enter your access token
5. Click "Run Quick Test"

---

## ✨ Expected Result
```
✅ Quick Test Passed! Created order: order_xxxxx
```

---

## 🆘 Still Getting Error?

### Check 1: Is Backend Running?
```bash
# In another terminal, test:
curl http://localhost:6969/
# Should show: "Hey, it's working"
```

### Check 2: Are You Using Live Server?
- ✅ Correct: `http://localhost:5500`
- ❌ Wrong: `file:///C:/Users/.../razorpay-api-tester.html`

### Check 3: Check Browser Console
1. Press **F12**
2. Go to **Console** tab
3. Look for error messages
4. Check **Network** tab for failed requests

### Check 4: Verify app.js Was Updated
Open `app.js` and look for:
```javascript
// CORS Configuration
const corsOptions = {
  origin: ['http://localhost:5500', ...
```

If not there, the file wasn't updated. Try again.

---

## 📋 Checklist

- [ ] Backend restarted
- [ ] Browser cache cleared
- [ ] Page refreshed
- [ ] Using http://localhost:5500 (not file://)
- [ ] API URL set to http://localhost:6969
- [ ] Access token entered
- [ ] Quick test clicked

---

## 🎯 Next Steps

Once CORS is fixed:

1. ✅ Test Create Order endpoint
2. ✅ Test Verify Payment endpoint
3. ✅ Test Order History endpoint
4. ✅ Test Order Details endpoint
5. ✅ Implement in frontend

---

## 📚 Full Guide
See: `CORS_FIX_GUIDE.md` for detailed explanation

---

**That's it! Should work now. 🚀**
