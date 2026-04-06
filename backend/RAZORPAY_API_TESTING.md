# Razorpay Payment API - Testing Examples

## Prerequisites
- User must be logged in (have valid accessToken cookie)
- Items must be in cart before creating order
- Razorpay credentials configured in .env

## 1. Create Order

### Using cURL
```bash
curl -X POST http://localhost:6969/users/create-order \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=your_access_token_here" \
  -d '{
    "totalAmount": 50000,
    "shippingAddress": {
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "zipCode": "400001",
      "country": "India"
    }
  }'
```

### Using Postman
1. Method: POST
2. URL: `http://localhost:6969/users/create-order`
3. Headers:
   - Content-Type: application/json
4. Cookies:
   - accessToken: your_token
5. Body (raw JSON):
```json
{
  "totalAmount": 50000,
  "shippingAddress": {
    "street": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "country": "India"
  }
}
```

### Expected Response (200 OK)
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "razorpayOrderId": "order_1234567890abcdef",
  "amount": 50000,
  "currency": "INR",
  "keyId": "rzp_live_xxxxx"
}
```

### Error Responses

**400 Bad Request - Missing fields:**
```json
{
  "message": "Total amount and shipping address are required"
}
```

**400 Bad Request - Empty cart:**
```json
{
  "message": "Cart is empty"
}
```

**401 Unauthorized - Not logged in:**
```json
{
  "message": "Unauthorized"
}
```

---

## 2. Verify Payment

### Using cURL
```bash
curl -X POST http://localhost:6969/users/verify-payment \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=your_access_token_here" \
  -d '{
    "razorpayOrderId": "order_1234567890abcdef",
    "razorpayPaymentId": "pay_1234567890abcdef",
    "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
  }'
```

### Using Postman
1. Method: POST
2. URL: `http://localhost:6969/users/verify-payment`
3. Headers:
   - Content-Type: application/json
4. Cookies:
   - accessToken: your_token
5. Body (raw JSON):
```json
{
  "razorpayOrderId": "order_1234567890abcdef",
  "razorpayPaymentId": "pay_1234567890abcdef",
  "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

### Expected Response (200 OK)
```json
{
  "message": "Payment verified successfully",
  "order": {
    "_id": "507f1f77bcf86cd799439011",
    "user": "507f1f77bcf86cd799439012",
    "items": [
      {
        "product": "507f1f77bcf86cd799439013",
        "quantity": 2,
        "price": 25000
      }
    ],
    "totalAmount": 50000,
    "status": "confirmed",
    "shippingAddress": {
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "zipCode": "400001",
      "country": "India"
    },
    "razorpayOrderId": "order_1234567890abcdef",
    "razorpayPaymentId": "pay_1234567890abcdef",
    "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

### Error Responses

**400 Bad Request - Invalid signature:**
```json
{
  "message": "Payment verification failed"
}
```

**404 Not Found - Order not found:**
```json
{
  "message": "Order not found"
}
```

---

## 3. Get Order History

### Using cURL
```bash
# Get first page with 10 items
curl -X GET "http://localhost:6969/users/orders?page=1&limit=10" \
  -H "Cookie: accessToken=your_access_token_here"

# Get second page with 20 items
curl -X GET "http://localhost:6969/users/orders?page=2&limit=20" \
  -H "Cookie: accessToken=your_access_token_here"
```

### Using Postman
1. Method: GET
2. URL: `http://localhost:6969/users/orders`
3. Query Parameters:
   - page: 1
   - limit: 10
4. Cookies:
   - accessToken: your_token

### Expected Response (200 OK)
```json
{
  "orders": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "user": "507f1f77bcf86cd799439012",
      "items": [
        {
          "product": "507f1f77bcf86cd799439013",
          "quantity": 2,
          "price": 25000
        }
      ],
      "totalAmount": 50000,
      "status": "confirmed",
      "shippingAddress": {
        "street": "123 Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "zipCode": "400001",
        "country": "India"
      },
      "razorpayOrderId": "order_1234567890abcdef",
      "razorpayPaymentId": "pay_1234567890abcdef",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalOrders": 45,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error Responses

**401 Unauthorized - Not logged in:**
```json
{
  "message": "Unauthorized"
}
```

---

## 4. Get Order Details

### Using cURL
```bash
curl -X GET "http://localhost:6969/users/order/507f1f77bcf86cd799439011" \
  -H "Cookie: accessToken=your_access_token_here"
```

### Using Postman
1. Method: GET
2. URL: `http://localhost:6969/users/order/507f1f77bcf86cd799439011`
3. Cookies:
   - accessToken: your_token

### Expected Response (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "user": "507f1f77bcf86cd799439012",
  "items": [
    {
      "product": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Premium Wedding Photography",
        "price": 25000,
        "images": ["https://example.com/photo.jpg"]
      },
      "quantity": 2,
      "price": 25000
    }
  ],
  "totalAmount": 50000,
  "status": "confirmed",
  "shippingAddress": {
    "street": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "country": "India"
  },
  "razorpayOrderId": "order_1234567890abcdef",
  "razorpayPaymentId": "pay_1234567890abcdef",
  "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

### Error Responses

**404 Not Found - Order not found:**
```json
{
  "message": "Order not found"
}
```

**401 Unauthorized - Not logged in:**
```json
{
  "message": "Unauthorized"
}
```

---

## Complete Payment Flow Test

### Step 1: Add items to cart
```bash
curl -X POST "http://localhost:6969/users/add-to-cart?productId=507f1f77bcf86cd799439013" \
  -H "Cookie: accessToken=your_access_token_here"
```

### Step 2: Create order
```bash
curl -X POST http://localhost:6969/users/create-order \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=your_access_token_here" \
  -d '{
    "totalAmount": 25000,
    "shippingAddress": {
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "zipCode": "400001",
      "country": "India"
    }
  }'
```

### Step 3: Process payment in Razorpay (frontend)
- Use the razorpayOrderId from Step 2
- Open Razorpay checkout
- Complete payment with test card

### Step 4: Verify payment
```bash
curl -X POST http://localhost:6969/users/verify-payment \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=your_access_token_here" \
  -d '{
    "razorpayOrderId": "order_from_step_2",
    "razorpayPaymentId": "pay_from_razorpay",
    "razorpaySignature": "signature_from_razorpay"
  }'
```

### Step 5: Verify order was created
```bash
curl -X GET "http://localhost:6969/users/orders?page=1&limit=10" \
  -H "Cookie: accessToken=your_access_token_here"
```

---

## Postman Collection JSON

```json
{
  "info": {
    "name": "DKGPro Payment API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Order",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"totalAmount\": 50000, \"shippingAddress\": {\"street\": \"123 Main Street\", \"city\": \"Mumbai\", \"state\": \"Maharashtra\", \"zipCode\": \"400001\", \"country\": \"India\"}}"
        },
        "url": {
          "raw": "http://localhost:6969/users/create-order",
          "protocol": "http",
          "host": ["localhost"],
          "port": "6969",
          "path": ["users", "create-order"]
        }
      }
    },
    {
      "name": "Verify Payment",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"razorpayOrderId\": \"order_xxxxx\", \"razorpayPaymentId\": \"pay_xxxxx\", \"razorpaySignature\": \"signature_xxxxx\"}"
        },
        "url": {
          "raw": "http://localhost:6969/users/verify-payment",
          "protocol": "http",
          "host": ["localhost"],
          "port": "6969",
          "path": ["users", "verify-payment"]
        }
      }
    },
    {
      "name": "Get Orders",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:6969/users/orders?page=1&limit=10",
          "protocol": "http",
          "host": ["localhost"],
          "port": "6969",
          "path": ["users", "orders"],
          "query": [
            {"key": "page", "value": "1"},
            {"key": "limit", "value": "10"}
          ]
        }
      }
    },
    {
      "name": "Get Order Details",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:6969/users/order/507f1f77bcf86cd799439011",
          "protocol": "http",
          "host": ["localhost"],
          "port": "6969",
          "path": ["users", "order", "507f1f77bcf86cd799439011"]
        }
      }
    }
  ]
}
```

---

## Test Data

### Valid Shipping Address
```json
{
  "street": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "zipCode": "400001",
  "country": "India"
}
```

### Test Amounts
- Small: 100 (₹1)
- Medium: 50000 (₹500)
- Large: 100000 (₹1000)

### Test Card (Razorpay)
- Card Number: 4111 1111 1111 1111
- Expiry: Any future date (e.g., 12/25)
- CVV: Any 3 digits (e.g., 123)
- Name: Any name

---

## Debugging Tips

1. **Check cookies are being sent:**
   ```bash
   curl -v http://localhost:6969/users/orders
   ```

2. **Verify order in database:**
   ```bash
   # MongoDB
   db.orders.find({user: ObjectId("user_id")})
   ```

3. **Check server logs:**
   - Look for payment verification errors
   - Check signature calculation
   - Verify Razorpay credentials

4. **Test signature verification:**
   - Use online HMAC-SHA256 calculator
   - Verify signature matches: HMAC-SHA256(orderId|paymentId, secret)

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Ensure accessToken cookie is set |
| Cart is empty | Add items using /add-to-cart first |
| Payment verification failed | Check signature calculation |
| Order not found | Verify orderId is correct |
| Invalid amount | Amount must be > 0 |
| Missing shipping address | Provide complete address object |
