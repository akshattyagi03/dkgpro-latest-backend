const mongoose = require('mongoose')

/** Shared subdocument for digital gift card personalization (product + third category). */
const giftCardSelectionSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    babyNameLabel: {
      type: String,
      default: 'Baby Name',
      trim: true,
    },
    birthdayLabel: {
      type: String,
      default: 'Which Birthday It Is',
      trim: true,
    },
    sizeLabel: {
      type: String,
      default: 'Select Size',
      trim: true,
    },
    sizes: [
      {
        label: {
          type: String,
          required: true,
          trim: true,
        },
        price: {
          type: Number,
          min: 0,
        },
      },
    ],
    /** When true and product sizes are empty, inherit third-category defaults on the guest app. */
    inheritFromCategory: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
)

module.exports = giftCardSelectionSchema
