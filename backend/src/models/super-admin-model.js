const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const superAdminSchema = new mongoose.Schema({
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
    default: 'superadmin'
  },
  createdAdmins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
})

superAdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

superAdminSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password)
}

const SuperAdmin = mongoose.model('SuperAdmin', superAdminSchema)

module.exports = SuperAdmin;