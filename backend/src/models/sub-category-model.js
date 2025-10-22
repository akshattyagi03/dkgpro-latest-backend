const mongoose = require('mongoose')

const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Sub category name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  mainCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MainCategory',
    required: true
  },
  thirdCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ThirdCategory'
  }]
}, {
  timestamps: true
})

module.exports = mongoose.model('SubCategory', subCategorySchema)