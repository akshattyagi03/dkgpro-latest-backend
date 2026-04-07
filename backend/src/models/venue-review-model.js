const mongoose = require('mongoose')

const venueReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required']
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: [true, 'Venue is required']
    },
    reviewText: {
      type: String,
      required: [true, 'Review text is required'],
      trim: true,
      maxlength: [1000, 'Review cannot exceed 1000 characters']
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5']
    },
    images: [
      {
        type: String
      }
    ]
  },
  {
    timestamps: true
  }
)

venueReviewSchema.index({ user: 1, venue: 1, createdAt: -1 }, { unique: true })

module.exports = mongoose.model('VenueReview', venueReviewSchema)
