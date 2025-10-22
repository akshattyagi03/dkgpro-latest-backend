const mongoose = require('mongoose')

const mainCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Main category name is required'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  subCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory'
  }]
}, {
  timestamps: true
})

module.exports = mongoose.model('MainCategory', mainCategorySchema)