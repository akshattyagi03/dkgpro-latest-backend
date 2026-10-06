const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const adminSchema = new mongoose.Schema({
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
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    default: 'admin'
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  // Account enable/disable switch, independent of approval status.
  // Defaults to true so existing/newly-created admins remain enabled unless a super admin disables them.
  isActive: {
    type: Boolean,
    default: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin'
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  blogs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Supports the super-admin admin-listing endpoint, which commonly filters/sorts by approval + active status.
adminSchema.index({ isApproved: 1, isActive: 1 })

adminSchema.pre('save', async function(next) {
  this.updatedAt = Date.now()
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

// Covers findByIdAndUpdate/findOneAndUpdate call sites (e.g. admin approval), which bypass 'save' hooks.
adminSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() })
  next()
})

adminSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password)
}

const Admin = mongoose.model('Admin', adminSchema)

module.exports = Admin