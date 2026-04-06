const mongoose = require('mongoose')

const thirdCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Third category name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: true
  },
  bannerImage: {
    type: String,
    default: null
  }
}, { timestamps: true })

module.exports = mongoose.model('ThirdCategory', thirdCategorySchema)