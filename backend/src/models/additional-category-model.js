const mongoose = require('mongoose')

const additionalCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'parentModel'
  },
  parentModel: {
    type: String,
    enum: ['ThirdCategory', 'AdditionalCategory']
  },
  level: {
    type: Number,
    required: true,
    min: 4
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('AdditionalCategory', additionalCategorySchema)