const mongoose = require('mongoose')

const otpSchema = new mongoose.Schema({
  email: {
    type: String
  },
  phoneNumber: {
    type: String
  },
  otp: {
    type: String,
    required: true
  },
  userType: {
    type: String,
    enum: ['User', 'Admin', 'SuperAdmin', 'PasswordReset', 'AdminPasswordReset', 'SuperAdminPasswordReset', 'PhoneLogin'],
    required: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('OTP', otpSchema)