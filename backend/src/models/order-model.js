const mongoose = require('mongoose');
const bookingDetailsSchema = require('./booking-details-schema');

const orderAddonLineSchema = new mongoose.Schema({
  sectionName: String,
  addonName: String,
  quantity: Number,
  lineTotal: Number
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  bookingAddonLines: {
    type: [orderAddonLineSchema],
    default: undefined
  },
  bookingDetails: {
    type: bookingDetailsSchema,
    default: undefined
  }
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  timing: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);