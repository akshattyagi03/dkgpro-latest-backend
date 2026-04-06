const mongoose = require('mongoose')

const heroBannerSchema = new mongoose.Schema({
  image: {
    type: String,
    required: [true, 'Banner image is required']
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: [true, 'Sub category is required']
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

module.exports = mongoose.model('HeroBanner', heroBannerSchema)
