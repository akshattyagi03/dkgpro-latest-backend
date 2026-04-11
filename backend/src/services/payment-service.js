const Razorpay = require('razorpay');
const Order = require('../models/order-model');
const Cart = require('../models/cart-model');
const crypto = require('crypto');
const { syncCheckoutCart } = require('./user-services');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const populateCartProduct = {
  path: 'items.product',
  populate: [
    { path: 'mainCategory' },
    { path: 'subCategory' },
    { path: 'thirdCategory' }
  ]
};

function effectiveUnitPrice(product) {
  if (!product) return 0;
  const list = Number(product.price);
  const d = product.discountedPrice != null ? Number(product.discountedPrice) : NaN;
  if (Number.isFinite(d) && d > 0 && d < list) return d;
  return Number.isFinite(list) ? list : 0;
}

function addonsSum(lines) {
  if (!lines || !lines.length) return 0;
  return lines.reduce((s, x) => s + (Number(x.lineTotal) || 0), 0);
}

const createOrder = async (userId, orderData) => {
  const { totalAmount: clientTotalRaw, shippingAddress, cartSnapshot } = orderData;

  if (!shippingAddress) {
    throw new Error('Shipping address is required');
  }

  if (cartSnapshot) {
    await syncCheckoutCart(userId, cartSnapshot);
  } else if (!clientTotalRaw || Number(clientTotalRaw) <= 0) {
    throw new Error('Invalid amount');
  }

  const cart = await Cart.findOne({ user: userId }).populate(populateCartProduct);
  if (!cart || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }

  const validItems = cart.items.filter(item => item.product !== null);
  if (validItems.length === 0) {
    throw new Error('Cart items are no longer available');
  }

  let totalAmount;
  const orderItems = [];

  if (cartSnapshot) {
    totalAmount = 0;
    for (const item of validItems) {
      const unit = effectiveUnitPrice(item.product);
      const addOnTotal = addonsSum(item.bookingAddonLines);
      totalAmount += unit * item.quantity + addOnTotal;
      orderItems.push({
        product: item.product._id,
        quantity: item.quantity,
        price: unit,
        bookingAddonLines: item.bookingAddonLines && item.bookingAddonLines.length
          ? item.bookingAddonLines.map((l) => ({
            sectionName: l.sectionName,
            addonName: l.addonName,
            quantity: l.quantity,
            lineTotal: l.lineTotal
          }))
          : undefined
      });
    }
  } else {
    totalAmount = Number(clientTotalRaw);
    for (const item of validItems) {
      orderItems.push({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price
      });
    }
  }

  if (!totalAmount || totalAmount <= 0) {
    throw new Error('Invalid amount');
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(totalAmount * 100),
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes: {
      userId: userId.toString(),
      cartItems: String(cart.items.length)
    }
  }).catch(err => {
    throw new Error(err.error?.description || err.message || JSON.stringify(err));
  });

  const order = new Order({
    user: userId,
    items: orderItems,
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

  order.status = 'pending';
  order.razorpayPaymentId = razorpayPaymentId;
  order.razorpaySignature = razorpaySignature;
  await order.save();

  await Cart.findOneAndUpdate({ user: order.user }, { items: [], totalItems: 0 });

  return {
    message: 'Payment successful. Order is pending confirmation.',
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
