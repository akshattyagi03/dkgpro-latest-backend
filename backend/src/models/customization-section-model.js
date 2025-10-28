const mongoose = require('mongoose')

const customizationSectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  subSections: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String
    },
    addons: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Addon'
    }]
  }]
}, {
  timestamps: true
})

module.exports = mongoose.model('CustomizationSection', customizationSectionSchema)