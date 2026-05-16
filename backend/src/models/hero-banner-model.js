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
  /** Vendor admin who uploaded (optional when `addedBySuperAdmin` is set). */
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  /** Super-admin upload attribution (optional when `addedBy` is set). */
  addedBySuperAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  /** Optional label for festival / wedding hub rows; guest falls back to third category name. */
  title: {
    type: String,
    default: null
  },
  /** Where this banner appears on the guest home page (admin upload). */
  placement: {
    type: String,
    enum: [
      'hero',
      'festival',
      'festival_hub',
      'wedding',
      'wedding_extra',
      'romantic_couple',
      'kids',
      'occasion',
      'birthday_level_up',
      'birthday_extra_special'
    ],
    default: 'hero'
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, { timestamps: true })

heroBannerSchema.pre('validate', function (next) {
  if (!this.addedBy && !this.addedBySuperAdmin) {
    return next(new Error('Banner must have either addedBy (admin) or addedBySuperAdmin'))
  }
  next()
})

module.exports = mongoose.model('HeroBanner', heroBannerSchema)
