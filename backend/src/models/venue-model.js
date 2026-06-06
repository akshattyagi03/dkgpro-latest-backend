const mongoose = require('mongoose')

const venueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Venue name is required'],
    trim: true
  },

  location: {
    address: {
      type: String,
      required: true
    },
    /** Structured city label (e.g. Mumbai, Delhi NCR) — used for guest city filter */
    city: {
      type: String,
      trim: true
    },
    lat: Number,
    lng: Number
  },

  images: [
    {
      type: String
    }
  ],

  description: {
    type: String,
    required: [true, 'Venue description is required']
  },
  capacity: {
    min: Number,
    max: Number
  },

  startingPrice: {
    type: Number,
    required: true
  },

  typesOfVenues: [
    {
      type: String 
    }
  ],

  accessibilityFeatures: [
    {
      type: String 
    }
  ],

  facilities: [
    {
      type: String 
    }
  ],

  restrictions: [
    {
      type: String
    }
  ],

  otherInformation: {
    inHouseDecor: {
      type: Boolean,
      default: false
    },
    advanceBookingWeeks: {
      type: Number
    }
  },

  supportedEvents: [
    {
      type: String
    }
  ],

  ratings: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },

  reviews: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: Number,
      comment: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]

}, {
  timestamps: true
})

module.exports = mongoose.model('Venue', venueSchema)