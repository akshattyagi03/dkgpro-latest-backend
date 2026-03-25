const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },

    mobileNo: {
      type: String,
      required: [true, 'Mobile number is required'],
      match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian mobile number'],
    },

    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      trim: true,
    },

    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },

    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (value) {
          return value >= this.startDate;
        },
        message: 'End date cannot be before start date',
      },
    },

    startTime: {
      type: String, // can also use Date if combining with date
      required: [true, 'Start time is required'],
    },

    endTime: {
      type: String,
      required: [true, 'End time is required'],
    },

    guests: {
      type: Number,
      required: [true, 'Number of guests is required'],
      min: [1, 'Guests must be at least 1'],
    },

    requirements: {
      type: String,
      maxlength: [1000, 'Max 1000 characters allowed'],
      trim: true,
    },

    status: {
      type: String,
      enum: ['pending', 'contacted', 'quoted', 'confirmed', 'rejected'],
      default: 'pending',
    },

    // Optional: reference to venue if inquiry is tied to one
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Inquiry', inquirySchema);