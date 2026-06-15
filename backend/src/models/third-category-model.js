const mongoose = require('mongoose')
const balloonColorSelectionSchema = require('./balloon-color-selection-schema')

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
  },
  /** Default balloon color presets for all products in this third category */
  balloonColorSelection: {
    type: balloonColorSelectionSchema,
    default: undefined,
  },
}, { timestamps: true })

module.exports = mongoose.model('ThirdCategory', thirdCategorySchema)