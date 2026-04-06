// Complete Frontend Integration Example for Razorpay Payment

// ============================================
// 1. HTML Setup
// ============================================
/*
<!DOCTYPE html>
<html>
<head>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <button id="paymentBtn">Proceed to Payment</button>
  <div id="orderStatus"></div>
</body>
</html>
*/

// ============================================
// 2. Payment Service Class
// ============================================
class PaymentService {
  constructor(apiBaseUrl = 'http://localhost:6969') {
    this.apiBaseUrl = apiBaseUrl;
  }

  // Create order on backend
  async createOrder(totalAmount, shippingAddress) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({
          totalAmount,
          shippingAddress
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      return await response.json();
    } catch (error) {
      console.error('Order creation error:', error);
      throw error;
    }
  }

  // Verify payment on backend
  async verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature
        })
      });

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  }

  // Get order history
  async getOrderHistory(page = 1, limit = 10) {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/users/orders?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      return await response.json();
    } catch (error) {
      console.error('Order history error:', error);
      throw error;
    }
  }

  // Get order details
  async getOrderDetails(orderId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/order/${orderId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      return await response.json();
    } catch (error) {
      console.error('Order details error:', error);
      throw error;
    }
  }
}

// ============================================
// 3. Razorpay Checkout Handler
// ============================================
class RazorpayCheckout {
  constructor(paymentService, keyId) {
    this.paymentService = paymentService;
    this.keyId = keyId;
  }

  async initiatePayment(orderData, customerData) {
    try {
      // Step 1: Create order on backend
      const orderResponse = await this.paymentService.createOrder(
        orderData.totalAmount,
        orderData.shippingAddress
      );

      const { razorpayOrderId, amount, currency } = orderResponse;

      // Step 2: Prepare Razorpay options
      const options = {
        key: this.keyId,
        amount: amount * 100, // Convert to paise
        currency: currency,
        order_id: razorpayOrderId,
        handler: async (response) => {
          await this.handlePaymentSuccess(response);
        },
        prefill: {
          name: customerData.name,
          email: customerData.email,
          contact: customerData.phone
        },
        theme: {
          color: '#3399cc'
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal closed');
            this.handlePaymentCancelled();
          }
        }
      };

      // Step 3: Open Razorpay checkout
      const rzp = new Razorpay(options);
      rzp.open();

      // Handle payment errors
      rzp.on('payment.failed', (response) => {
        this.handlePaymentError(response);
      });

    } catch (error) {
      console.error('Payment initiation error:', error);
      this.handlePaymentError(error);
    }
  }

  async handlePaymentSuccess(response) {
    try {
      // Step 1: Verify payment on backend
      const verifyResponse = await this.paymentService.verifyPayment(
        response.razorpay_order_id,
        response.razorpay_payment_id,
        response.razorpay_signature
      );

      console.log('Payment verified:', verifyResponse);

      // Step 2: Show success message
      this.showSuccessMessage(verifyResponse.order);

      // Step 3: Redirect or update UI
      setTimeout(() => {
        window.location.href = '/order-confirmation';
      }, 2000);

    } catch (error) {
      console.error('Payment verification failed:', error);
      this.handlePaymentError(error);
    }
  }

  handlePaymentCancelled() {
    alert('Payment cancelled. Please try again.');
  }

  handlePaymentError(error) {
    console.error('Payment error:', error);
    alert('Payment failed. Please try again.');
  }

  showSuccessMessage(order) {
    const statusDiv = document.getElementById('orderStatus');
    if (statusDiv) {
      statusDiv.innerHTML = `
        <div style="color: green; padding: 20px; border: 1px solid green; border-radius: 5px;">
          <h3>✓ Payment Successful!</h3>
          <p>Order ID: ${order._id}</p>
          <p>Amount: ₹${order.totalAmount}</p>
          <p>Status: ${order.status}</p>
        </div>
      `;
    }
  }
}

// ============================================
// 4. Usage Example
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize services
  const paymentService = new PaymentService('http://localhost:6969');
  const checkout = new RazorpayCheckout(paymentService, 'rzp_live_xxxxx'); // Replace with actual key

  // Handle payment button click
  document.getElementById('paymentBtn').addEventListener('click', async () => {
    const orderData = {
      totalAmount: 50000, // Amount in rupees
      shippingAddress: {
        street: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India'
      }
    };

    const customerData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '9876543210'
    };

    await checkout.initiatePayment(orderData, customerData);
  });

  // Load order history
  loadOrderHistory();
});

// ============================================
// 5. Order History Display
// ============================================
async function loadOrderHistory() {
  try {
    const paymentService = new PaymentService('http://localhost:6969');
    const response = await paymentService.getOrderHistory(1, 10);

    const ordersContainer = document.getElementById('ordersContainer');
    if (!ordersContainer) return;

    let html = '<h3>Your Orders</h3>';
    response.orders.forEach(order => {
      html += `
        <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px;">
          <p><strong>Order ID:</strong> ${order._id}</p>
          <p><strong>Amount:</strong> ₹${order.totalAmount}</p>
          <p><strong>Status:</strong> <span style="color: ${order.status === 'confirmed' ? 'green' : 'orange'}">${order.status}</span></p>
          <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          <p><strong>Items:</strong> ${order.items.length}</p>
        </div>
      `;
    });

    ordersContainer.innerHTML = html;
  } catch (error) {
    console.error('Failed to load orders:', error);
  }
}

// ============================================
// 6. React Component Example
// ============================================
/*
import React, { useState } from 'react';

const PaymentComponent = () => {
  const [loading, setLoading] = useState(false);
  const [orderStatus, setOrderStatus] = useState(null);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const paymentService = new PaymentService();
      const checkout = new RazorpayCheckout(paymentService, 'rzp_live_xxxxx');

      const orderData = {
        totalAmount: 50000,
        shippingAddress: {
          street: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          country: 'India'
        }
      };

      const customerData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210'
      };

      await checkout.initiatePayment(orderData, customerData);
    } catch (error) {
      setOrderStatus({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handlePayment} disabled={loading}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
      {orderStatus && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ddd' }}>
          {orderStatus.error ? (
            <p style={{ color: 'red' }}>Error: {orderStatus.error}</p>
          ) : (
            <p style={{ color: 'green' }}>Payment successful!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentComponent;
*/

// ============================================
// 7. Vue Component Example
// ============================================
/*
<template>
  <div>
    <button @click="handlePayment" :disabled="loading">
      {{ loading ? 'Processing...' : 'Pay Now' }}
    </button>
    <div v-if="orderStatus" style="margin-top: 20px; padding: 10px; border: 1px solid #ddd;">
      <p v-if="orderStatus.error" style="color: red;">
        Error: {{ orderStatus.error }}
      </p>
      <p v-else style="color: green;">Payment successful!</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      loading: false,
      orderStatus: null,
      paymentService: null,
      checkout: null
    };
  },
  mounted() {
    this.paymentService = new PaymentService();
    this.checkout = new RazorpayCheckout(this.paymentService, 'rzp_live_xxxxx');
  },
  methods: {
    async handlePayment() {
      this.loading = true;
      try {
        const orderData = {
          totalAmount: 50000,
          shippingAddress: {
            street: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400001',
            country: 'India'
          }
        };

        const customerData = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '9876543210'
        };

        await this.checkout.initiatePayment(orderData, customerData);
      } catch (error) {
        this.orderStatus = { error: error.message };
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
*/

// ============================================
// 8. Error Handling Best Practices
// ============================================
const ErrorHandler = {
  handle: (error, context) => {
    console.error(`Error in ${context}:`, error);

    const errorMessages = {
      'Failed to create order': 'Unable to create order. Please check your cart.',
      'Payment verification failed': 'Payment verification failed. Please contact support.',
      'Failed to fetch orders': 'Unable to load order history.',
      'Failed to fetch order details': 'Unable to load order details.'
    };

    const message = errorMessages[error.message] || 'An error occurred. Please try again.';
    alert(message);
  }
};

// ============================================
// Export for use in other modules
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PaymentService,
    RazorpayCheckout,
    ErrorHandler
  };
}
