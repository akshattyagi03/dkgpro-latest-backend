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
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Addon', addonSchema)