const mongoose = require('mongoose')

const venueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Venue name is required'],
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Venue location is required'],
    trim: true
  },
  images: [{
    type: String
  }],
  description: {
    type: String,
    required: [true, 'Venue description is required']
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Venue', venueSchema)