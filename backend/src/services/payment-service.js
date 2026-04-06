const Razorpay = require('razorpay');
const Order = require('../models/order-model');
const Cart = require('../models/cart-model');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createOrder = async (userId, orderData) => {
  const { totalAmount, shippingAddress } = orderData;
  const Product = require("../models/product-model");
  if (!totalAmount || totalAmount <= 0) {
    throw new Error('Invalid amount');
  }

  const cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }

  const validItems = cart.items.filter(item => item.product !== null)
  if (validItems.length === 0) {
    throw new Error('Cart items are no longer available');
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(totalAmount * 100),
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes: {
      userId: userId.toString(),
      cartItems: cart.items.length
    }
  }).catch(err => {
    throw new Error(err.error?.description || err.message || JSON.stringify(err))
  });

  const order = new Order({
    user: userId,
    items: validItems.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.price
    })),
    totalAmount,
    shippingAddress,
    razorpayOrderId: razorpayOrder.id,
    status: 'pending'
  });

  await order.save();

  return {
    orderId: order._id,
    razorpayOrderId: razorpayOrder.id,
    amount: totalAmount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID
  };
};

const verifyPayment = async (paymentData) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;

  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    throw new Error('Payment verification failed');
  }

  const order = await Order.findOne({ razorpayOrderId });
  if (!order) {
    throw new Error('Order not found');
  }

  order.status = 'confirmed';
  order.razorpayPaymentId = razorpayPaymentId;
  order.razorpaySignature = razorpaySignature;
  await order.save();

  await Cart.findOneAndUpdate({ user: order.user }, { items: [] });

  return {
    message: 'Payment verified successfully',
    order
  };
};

const getOrderHistory = async (userId, page = 1, limit = 10) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 10, 50);
  const skip = (pageNum - 1) * limitNum;

  const orders = await Order.find({ user: userId })
    .populate('items.product')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Order.countDocuments({ user: userId });

  return {
    orders,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalOrders: total,
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    }
  };
};

const getOrderDetails = async (orderId, userId) => {
  const order = await Order.findOne({ _id: orderId, user: userId })
    .populate('items.product');

  if (!order) {
    throw new Error('Order not found');
  }

  return order;
};

module.exports = {
  createOrder,
  verifyPayment,
  getOrderHistory,
  getOrderDetails
};
