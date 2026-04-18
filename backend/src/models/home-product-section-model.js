const mongoose = require('mongoose')

const homeProductSectionSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    exploreHref: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    /** When set, these products are shown (max 4 used on guest). Order preserved. */
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
  },
  { timestamps: true }
)

module.exports = mongoose.model('HomeProductSection', homeProductSectionSchema)
