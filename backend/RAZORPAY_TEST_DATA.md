# Razorpay Payment API - Test Data Guide

## Prerequisites
- User must be logged in (have valid accessToken cookie)
- Items must be in cart before creating order
- Use test credentials from Razorpay dashboard

---

## 1. POST /users/create-order

### Purpose
Creates a Razorpay order from user's cart items.

### Test Data

#### Request Body
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

#### Alternative Test Cases

**Small Amount:**
```json
{
  "totalAmount": 100,
  "shippingAddress": {
    "street": "456 Park Avenue",
    "city": "Delhi",
    "state": "Delhi",
    "zipCode": "110001",
    "country": "India"
  }
}
```

**Large Amount:**
```json
{
  "totalAmount": 500000,
  "shippingAddress": {
    "street": "789 Business Park",
    "city": "Bangalore",
    "state": "Karnataka",
    "zipCode": "560001",
    "country": "India"
  }
}
```

**International Address:**
```json
{
  "totalAmount": 75000,
  "shippingAddress": {
    "street": "100 Broadway",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

### Expected Response (200 OK)
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "razorpayOrderId": "order_1A2B3C4D5E6F7G8H",
  "amount": 50000,
  "currency": "INR",
  "keyId": "rzp_live_1A2B3C4D5E6F7G"
}
```

### Response Breakdown
- **orderId**: MongoDB order ID (save this for later)
- **razorpayOrderId**: Razorpay order ID (use for payment)
- **amount**: Amount in rupees
- **currency**: Always "INR"
- **keyId**: Razorpay public key (for frontend)

### Error Cases

**400 - Missing Fields:**
```json
{
  "message": "Total amount and shipping address are required"
}
```

**400 - Empty Cart:**
```json
{
  "message": "Cart is empty"
}
```

**401 - Not Authenticated:**
```json
{
  "message": "Unauthorized"
}
```

### cURL Example
```bash
curl -X POST http://localhost:6969/users/create-order \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
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

---

## 2. POST /users/verify-payment

### Purpose
Verifies payment signature and confirms order.

### Test Data

#### Request Body (After Razorpay Payment)
```json
{
  "razorpayOrderId": "order_1A2B3C4D5E6F7G8H",
  "razorpayPaymentId": "pay_1A2B3C4D5E6F7G8H",
  "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

### How to Get Test Data

#### Step 1: Create Order
Use `/create-order` endpoint to get `razorpayOrderId`:
```
razorpayOrderId: order_1A2B3C4D5E6F7G8H
```

#### Step 2: Process Payment
1. Open Razorpay checkout with the order ID
2. Use test card: **4111 1111 1111 1111**
3. Expiry: Any future date (e.g., 12/25)
4. CVV: Any 3 digits (e.g., 123)
5. Name: Any name
6. Complete payment

#### Step 3: Get Payment Details
From Razorpay response, extract:
- `razorpay_payment_id`: pay_1A2B3C4D5E6F7G8H
- `razorpay_signature`: signature_hash

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
    "razorpayOrderId": "order_1A2B3C4D5E6F7G8H",
    "razorpayPaymentId": "pay_1A2B3C4D5E6F7G8H",
    "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

### Error Cases

**400 - Invalid Signature:**
```json
{
  "message": "Payment verification failed"
}
```

**404 - Order Not Found:**
```json
{
  "message": "Order not found"
}
```

**401 - Not Authenticated:**
```json
{
  "message": "Unauthorized"
}
```

### cURL Example
```bash
curl -X POST http://localhost:6969/users/verify-payment \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "razorpayOrderId": "order_1A2B3C4D5E6F7G8H",
    "razorpayPaymentId": "pay_1A2B3C4D5E6F7G8H",
    "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
  }'
```

---

## 3. GET /users/orders and GET /users/order/:orderId

### Purpose
Retrieve order history and specific order details.

### Test Data for GET /users/orders

#### Query Parameters
```
page=1
limit=10
```

#### Full URL
```
http://localhost:6969/users/orders?page=1&limit=10
```

#### Alternative Query Combinations

**Get Second Page:**
```
http://localhost:6969/users/orders?page=2&limit=10
```

**Get More Items Per Page:**
```
http://localhost:6969/users/orders?page=1&limit=20
```

**Get Maximum Items:**
```
http://localhost:6969/users/orders?page=1&limit=50
```

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
      "razorpayOrderId": "order_1A2B3C4D5E6F7G8H",
      "razorpayPaymentId": "pay_1A2B3C4D5E6F7G8H",
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

### cURL Example
```bash
curl -X GET "http://localhost:6969/users/orders?page=1&limit=10" \
  -H "Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 4. GET /users/order/:orderId

### Purpose
Get detailed information about a specific order.

### Test Data

#### URL Parameter
```
orderId: 507f1f77bcf86cd799439011
```

#### Full URL
```
http://localhost:6969/users/order/507f1f77bcf86cd799439011
```

#### Alternative Order IDs (Examples)
```
http://localhost:6969/users/order/507f1f77bcf86cd799439012
http://localhost:6969/users/order/507f1f77bcf86cd799439013
http://localhost:6969/users/order/507f1f77bcf86cd799439014
```

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
        "images": ["https://example.com/photo1.jpg"]
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
  "razorpayOrderId": "order_1A2B3C4D5E6F7G8H",
  "razorpayPaymentId": "pay_1A2B3C4D5E6F7G8H",
  "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

### Error Cases

**404 - Order Not Found:**
```json
{
  "message": "Order not found"
}
```

**401 - Not Authenticated:**
```json
{
  "message": "Unauthorized"
}
```

### cURL Example
```bash
curl -X GET "http://localhost:6969/users/order/507f1f77bcf86cd799439011" \
  -H "Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Complete Test Workflow

### Step 1: Add Items to Cart
```bash
curl -X POST "http://localhost:6969/users/add-to-cart?productId=507f1f77bcf86cd799439013" \
  -H "Cookie: accessToken=your_token"
```

### Step 2: Create Order
```bash
curl -X POST http://localhost:6969/users/create-order \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=your_token" \
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

**Response:** Save `razorpayOrderId`

### Step 3: Process Payment (Manual)
1. Use Razorpay test card: 4111 1111 1111 1111
2. Any future expiry date
3. Any 3-digit CVV
4. Save `razorpay_payment_id` and `razorpay_signature`

### Step 4: Verify Payment
```bash
curl -X POST http://localhost:6969/users/verify-payment \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=your_token" \
  -d '{
    "razorpayOrderId": "order_1A2B3C4D5E6F7G8H",
    "razorpayPaymentId": "pay_1A2B3C4D5E6F7G8H",
    "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
  }'
```

**Response:** Save `_id` (order ID)

### Step 5: Get Order History
```bash
curl -X GET "http://localhost:6969/users/orders?page=1&limit=10" \
  -H "Cookie: accessToken=your_token"
```

### Step 6: Get Order Details
```bash
curl -X GET "http://localhost:6969/users/order/507f1f77bcf86cd799439011" \
  -H "Cookie: accessToken=your_token"
```

---

## Test Card Details

### Razorpay Test Cards

**Success Card:**
- Number: 4111 1111 1111 1111
- Expiry: Any future date (e.g., 12/25)
- CVV: Any 3 digits (e.g., 123)
- Name: Any name

**Failure Card:**
- Number: 4000 0000 0000 0002
- Expiry: Any future date
- CVV: Any 3 digits
- Name: Any name

---

## Sample Test Amounts

| Amount | Use Case |
|--------|----------|
| 100 | Minimum test |
| 1000 | Small order |
| 50000 | Medium order |
| 100000 | Large order |
| 500000 | Premium order |

---

## Sample Addresses

### India
```json
{
  "street": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "zipCode": "400001",
  "country": "India"
}
```

### Delhi
```json
{
  "street": "456 Park Avenue",
  "city": "Delhi",
  "state": "Delhi",
  "zipCode": "110001",
  "country": "India"
}
```

### Bangalore
```json
{
  "street": "789 Tech Park",
  "city": "Bangalore",
  "state": "Karnataka",
  "zipCode": "560001",
  "country": "India"
}
```

### USA
```json
{
  "street": "100 Broadway",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA"
}
```

---

## Postman Collection

### Create Order
```
Method: POST
URL: http://localhost:6969/users/create-order
Headers:
  - Content-Type: application/json
Cookies:
  - accessToken: your_token
Body:
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

### Verify Payment
```
Method: POST
URL: http://localhost:6969/users/verify-payment
Headers:
  - Content-Type: application/json
Cookies:
  - accessToken: your_token
Body:
{
  "razorpayOrderId": "order_1A2B3C4D5E6F7G8H",
  "razorpayPaymentId": "pay_1A2B3C4D5E6F7G8H",
  "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

### Get Orders
```
Method: GET
URL: http://localhost:6969/users/orders?page=1&limit=10
Cookies:
  - accessToken: your_token
```

### Get Order Details
```
Method: GET
URL: http://localhost:6969/users/order/507f1f77bcf86cd799439011
Cookies:
  - accessToken: your_token
```

---

## Tips for Testing

1. **Always add items to cart first** before creating order
2. **Save Order IDs** for later reference
3. **Use test cards** provided by Razorpay
4. **Check browser console** for detailed error messages
5. **Verify cookies** are being sent with requests
6. **Test pagination** with different page and limit values
7. **Test error cases** with invalid data

---

## Common Issues

| Issue | Solution |
|-------|----------|
| "Cart is empty" | Add items using /add-to-cart first |
| "Order not found" | Verify Order ID is correct |
| "Payment verification failed" | Check signature is correct |
| "Unauthorized" | Ensure accessToken cookie is set |
| CORS error | Restart backend and clear cache |

---

**Happy Testing! 🚀**
