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
  }],
  additionalCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdditionalCategory'
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  tier: {
    type: String,
    enum: ['standard', 'premium'],
    default: 'standard'
  },
  // Optional fields
  location: {
    type: String,
    trim: true
  },
  setupDuration: {
    type: String,
    trim: true
  },
  teamSize: {
    type: String,
    trim: true
  },
  advanceBooking: {
    type: String,
    trim: true
  },
  cancellationPolicy: {
    type: String,
    trim: true,
    default: "Free cancellation up to 24 hours before the event. Partial refund may apply thereafter."
  },
  youtubeVideoLink: {
    type: String,
    trim: true
  },
  // Mandatory fields
  inclusions: [{
    type: String,
    required: true,
    trim: true
  }],
  experiences: [{
    type: String,
    required: true,
    trim: true
  }],
  keyHighlights: [{
    type: String,
    required: true,
    trim: true
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numReviews: {
    type: Number,
    default: 0
  },
  customizationSections: [
    {
      name: {
        type: String,
        required: true,
        trim: true
      },

      priority: {
        type: Number,
        default: 0
      },

      addons: [
        {
          addon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Addon',
            required: true
          },

          isDefault: {
            type: Boolean,
            default: false
          }
        }
      ]
    }
  ],
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
})

module.exports = mongoose.model('Product', productSchema)