const mongoose = require('mongoose')
const { SERVICE_KEYS } = require('../utils/servicePageConfig')

const servicePageItemSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: [true, 'Item image is required'],
    },
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    /** Optional link to a catalog product (seeded packages). */
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
  },
  { _id: true }
)

const servicePageSchema = new mongoose.Schema(
  {
    serviceKey: {
      type: String,
      required: true,
      unique: true,
      enum: SERVICE_KEYS,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    heroImage: {
      type: String,
      default: null,
    },
    items: {
      type: [servicePageItemSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('ServicePage', servicePageSchema)
