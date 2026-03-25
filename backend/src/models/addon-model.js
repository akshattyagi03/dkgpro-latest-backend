const mongoose = require('mongoose')

const addonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String
  },
  category: {
    type: String,
    required: true
  },

  tags: [{
    type: String
  }],

  customFields: [
    {
      label: String,      
      key: String,         
      type: {
        type: String,
        enum: ['text', 'textarea', 'number', 'dropdown', 'file']
      },
      required: Boolean,
      maxLength: Number,
      options: [String]   
    }
  ]

}, { timestamps: true })

module.exports = mongoose.model('Addon', addonSchema)