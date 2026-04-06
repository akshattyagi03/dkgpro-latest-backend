# Razorpay Payment Gateway Integration

## Overview
DKGPro now supports Razorpay payment gateway for secure online payments. This document outlines the implementation and usage.

## Prerequisites
- Razorpay account with API credentials
- Environment variables configured in `.env`

## Environment Setup
Add these to your `.env` file:
```
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

## Payment Flow

### 1. Create Order
**Endpoint:** `POST /users/create-order`
**Auth:** Required (user cookie)
**Description:** Create a Razorpay order from cart items

**Request Body:**
```json
{
  "totalAmount": 50000,
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "country": "India"
  }
}
```

**Success Response (200 OK):**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "razorpayOrderId": "order_1234567890abcdef",
  "amount": 50000,
  "currency": "INR",
  "keyId": "rzp_live_xxxxx"
}
```

### 2. Verify Payment
**Endpoint:** `POST /users/verify-payment`
**Auth:** Required (user cookie)
**Description:** Verify payment signature and confirm order

**Request Body:**
```json
{
  "razorpayOrderId": "order_1234567890abcdef",
  "razorpayPaymentId": "pay_1234567890abcdef",
  "razorpaySignature": "signature_hash"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Payment verified successfully",
  "order": {
    "_id": "507f1f77bcf86cd799439011",
    "user": "507f1f77bcf86cd799439012",
    "items": [...],
    "totalAmount": 50000,
    "status": "confirmed",
    "razorpayOrderId": "order_1234567890abcdef",
    "razorpayPaymentId": "pay_1234567890abcdef",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Get Order History
**Endpoint:** `GET /users/orders`
**Auth:** Required (user cookie)
**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 50)

**Success Response (200 OK):**
```json
{
  "orders": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalOrders": 45,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 4. Get Order Details
**Endpoint:** `GET /users/order/{orderId}`
**Auth:** Required (user cookie)
**Description:** Get detailed information about a specific order

**Success Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "user": "507f1f77bcf86cd799439012",
  "items": [
    {
      "product": {...},
      "quantity": 2,
      "price": 25000
    }
  ],
  "totalAmount": 50000,
  "status": "confirmed",
  "shippingAddress": {...},
  "razorpayOrderId": "order_1234567890abcdef",
  "razorpayPaymentId": "pay_1234567890abcdef",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

## Frontend Implementation Example

### Step 1: Create Order
```javascript
const response = await fetch('/users/create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    totalAmount: 50000,
    shippingAddress: {
      street: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India'
    }
  })
});

const { razorpayOrderId, amount, keyId } = await response.json();
```

### Step 2: Open Razorpay Checkout
```javascript
const options = {
  key: keyId,
  amount: amount * 100,
  currency: 'INR',
  order_id: razorpayOrderId,
  handler: async (response) => {
    // Verify payment on backend
    const verifyResponse = await fetch('/users/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature
      })
    });

    if (verifyResponse.ok) {
      console.log('Payment successful!');
      // Redirect to success page
    }
  },
  prefill: {
    name: 'Customer Name',
    email: 'customer@example.com',
    contact: '9876543210'
  },
  theme: {
    color: '#3399cc'
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

## Order Status Flow
- **pending** - Order created, awaiting payment
- **confirmed** - Payment verified successfully
- **shipped** - Order dispatched
- **delivered** - Order delivered to customer
- **cancelled** - Order cancelled

## Error Handling

### Common Errors
- **400 Bad Request** - Invalid amount or missing shipping address
- **401 Unauthorized** - User not authenticated
- **404 Not Found** - Order not found
- **Payment verification failed** - Invalid signature or tampering detected

## Security Notes
- All payment signatures are verified server-side
- Razorpay credentials stored securely in environment variables
- Cart is cleared after successful payment
- Payment data is immutable after verification

## Testing
Use Razorpay test credentials for development:
- Test Key ID: Available in Razorpay dashboard
- Test Key Secret: Available in Razorpay dashboard

Test card details:
- Card: 4111 1111 1111 1111
- Expiry: Any future date
- CVV: Any 3 digits

## Database Schema Updates
Order model now includes:
- `razorpayOrderId` - Razorpay order identifier
- `razorpayPaymentId` - Razorpay payment identifier
- `razorpaySignature` - Payment verification signature

## Dependencies
- `razorpay` - ^2.9.6 (already in package.json)
- `crypto` - Built-in Node.js module
