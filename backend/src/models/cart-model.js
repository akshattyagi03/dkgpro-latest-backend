const mongoose = require('mongoose');
const bookingDetailsSchema = require('./booking-details-schema');

const cartAddonLineSchema = new mongoose.Schema({
  sectionName: { type: String, trim: true },
  addonName: { type: String, trim: true },
  quantity: { type: Number, min: 1, default: 1 },
  lineTotal: { type: Number, min: 0 }
}, { _id: false });

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  bookingAddonLines: {
    type: [cartAddonLineSchema],
    default: []
  },
  bookingDetails: {
    type: bookingDetailsSchema,
    default: undefined
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Cart', cartSchema);