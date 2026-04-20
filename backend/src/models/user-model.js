const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const applyDecay = require('../utils/interestDecay')

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    default: null
  },
  phoneNumber: {
    type: String,
    match: [/^\+?[\d\s-]+$/, 'Please enter a valid phone number'],
    default: null
  },
  cart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cart'
  },
  orders: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  interests: [
    {
      tag: {
        type: String,
        trim: true
      },
      score: {
        type: Number,
        default: 1
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    }
  ],
  googleId: {
    type: String,
    default: null
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  }
})

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10)
  }

  if (this.interests && this.interests.length > 0) {
    this.interests.forEach(applyDecay)
  }

  next()
})

userSchema.methods.comparePassword = async function (password) {
  const isMatch = await bcrypt.compare(password, this.password)
  return isMatch
}

const User = mongoose.model('User', userSchema)

module.exports = User