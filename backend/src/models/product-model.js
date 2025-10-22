const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  mainCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MainCategory',
    required: [true, 'Main category is required']
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: [true, 'Sub category is required']
  },
  thirdCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ThirdCategory',
    required: [true, 'Third category is required']
  },
  images: [{
    type: String
  }],
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  serviceableAreas: [{
    city: {
      type: String,
      required: true,
      trim: true
    },
    districts: [{
      type: String,
      trim: true
    }]
  }]
}, {
  timestamps: true
})

module.exports = mongoose.model('Product', productSchema)