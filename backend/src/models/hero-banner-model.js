const mongoose = require('mongoose')

const heroBannerSchema = new mongoose.Schema({
  image: {
    type: String,
    required: [true, 'Banner image is required']
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    default: null
  },
  thirdCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ThirdCategory',
    default: null
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  /** Where this banner appears on the guest home page (admin upload). */
  placement: {
    type: String,
    enum: ['hero', 'festival', 'kids', 'occasion'],
    default: 'hero'
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, { timestamps: true })

module.exports = mongoose.model('HeroBanner', heroBannerSchema)
