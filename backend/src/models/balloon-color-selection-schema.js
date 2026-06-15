const mongoose = require('mongoose')

/** Shared subdocument for balloon color presets (product + third category). */
const balloonColorSelectionSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    defaultOptionLabel: {
      type: String,
      default: 'Same as image',
      trim: true,
    },
    defaultOptionDescription: {
      type: String,
      default: 'Default colors shown in the photo',
      trim: true,
    },
    allowCustom: {
      type: Boolean,
      default: true,
    },
    customOptionLabel: {
      type: String,
      default: 'Custom',
      trim: true,
    },
    presets: [
      {
        label: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    /** When true and product presets are empty, inherit third-category defaults on the guest app. */
    inheritFromCategory: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
)

module.exports = balloonColorSelectionSchema
