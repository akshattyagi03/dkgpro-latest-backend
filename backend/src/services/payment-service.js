const Razorpay = require('razorpay');
const Order = require('../models/order-model');
const Cart = require('../models/cart-model');
const crypto = require('crypto');
const { syncCheckoutCart } = require('./user-services');
const { resolveGiftCardUnitPrice } = require('../utils/giftCardPrice');

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

function normalizeShippingAddress(addr) {
  if (!addr || typeof addr !== 'object') return null;
  const street = String(addr.street || '').trim();
  const city = String(addr.city || '').trim();
  const state = String(addr.state || '').trim();
  const zipCode = String(addr.zipCode || '').trim();
  const country = String(addr.country || 'India').trim() || 'India';
  const phoneNumber = String(addr.phoneNumber || addr.phone || '').trim();
  const alternatePhoneNumber = String(
    addr.alternatePhoneNumber || addr.alternatePhone || ''
  ).trim();
  if (!street || !city || !state || !zipCode || !phoneNumber) return null;
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (alternatePhoneNumber && alternatePhoneNumber.replace(/\D/g, '').length < 10) return null;
  return {
    street,
    city,
    state,
    zipCode,
    country,
    phoneNumber,
    ...(alternatePhoneNumber ? { alternatePhoneNumber } : {}),
  };
}

const createOrder = async (userId, orderData) => {
  const { totalAmount: clientTotalRaw, shippingAddress: rawShippingAddress, cartSnapshot, timing } = orderData;

  const shippingAddress = normalizeShippingAddress(rawShippingAddress);
  if (!shippingAddress) {
    throw new Error('Shipping address and a valid phone number are required');
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
      const sizeUnit = resolveGiftCardUnitPrice(
        item.product,
        item.bookingDetails?.giftCardChoice
      )
      const unit = sizeUnit != null ? sizeUnit : effectiveUnitPrice(item.product);
      const addOnTotal = addonsSum(item.bookingAddonLines);
      totalAmount += unit * item.quantity + addOnTotal;
      const giftChoice = item.bookingDetails?.giftCardChoice
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
          : undefined,
        bookingDetails: item.bookingDetails
          ? {
            pincode: item.bookingDetails.pincode,
            district: item.bookingDetails.district,
            bookingDate: item.bookingDetails.bookingDate,
            startTime: item.bookingDetails.startTime,
            endTime: item.bookingDetails.endTime,
            balloonColorChoice: item.bookingDetails.balloonColorChoice
              ? {
                mode: item.bookingDetails.balloonColorChoice.mode,
                label: item.bookingDetails.balloonColorChoice.label,
                colors: item.bookingDetails.balloonColorChoice.colors
              }
              : undefined,
            giftCardChoice: giftChoice
              ? {
                babyName: giftChoice.babyName,
                whichBirthday: giftChoice.whichBirthday,
                size: giftChoice.size,
                sizePrice: sizeUnit != null ? sizeUnit : giftChoice.sizePrice
              }
              : undefined
          }
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

  // store order data in razorpay notes so verifyPayment can reconstruct it
  // we do NOT save to DB here — only save after payment is confirmed
  return {
    razorpayOrderId: razorpayOrder.id,
    amount: totalAmount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    // pass back to frontend so it can send to verifyPayment
    _orderMeta: {
      userId: userId.toString(),
      items: orderItems,
      totalAmount,
      shippingAddress,
      timing
    }
  };
};

const verifyPayment = async (paymentData) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderMeta } = paymentData;

  const existing = await Order.findOne({ razorpayOrderId });
  if (existing) {
    return {
      message: 'Payment already verified.',
      order: existing
    };
  }

  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    throw new Error('Payment verification failed');
  }

  if (!orderMeta) {
    throw new Error('Order metadata missing');
  }

  const { userId, items, totalAmount, shippingAddress, timing } = orderMeta;

  // only now save the order to DB after payment is verified
  const order = new Order({
    user: userId,
    items,
    totalAmount,
    shippingAddress,
    timing,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    status: 'pending'
  });

  await order.save();

  await Cart.findOneAndUpdate({ user: userId }, { items: [], totalItems: 0 });

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
