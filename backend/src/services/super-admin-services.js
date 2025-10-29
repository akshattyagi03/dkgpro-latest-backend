const SuperAdmin = require('../models/super-admin-model')
const RefreshToken = require('../models/refresh-token-model')
const OTP = require('../models/otp-model')
const jwt = require('jsonwebtoken')
const { generateOTP } = require('../utils/otp-generator')
const { sendOTP } = require('../utils/email-service')

const generateSuperAdminTokens = async (superAdminId) => {
  const accessToken = jwt.sign(
    { superAdminId },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '15m' }
  )
  
  const refreshTokenValue = require('crypto').randomBytes(64).toString('hex')
  const refreshToken = new RefreshToken({
    token: refreshTokenValue,
    userId: superAdminId,
    userType: 'SuperAdmin',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  })
  
  await refreshToken.save()
  return { accessToken, refreshToken: refreshTokenValue }
}

const sendSuperAdminOTP = async (superAdminData) => {
  const { email } = superAdminData
  
  const existingSuperAdmin = await SuperAdmin.findOne({ email })
  if (existingSuperAdmin) {
    throw new Error('Super admin already exists')
  }
  
  const otp = generateOTP()
  await OTP.findOneAndDelete({ email, userType: 'SuperAdmin' })
  await new OTP({ email, otp, userType: 'SuperAdmin' }).save()
  await sendOTP(email, otp, 'SuperAdmin')
  
  return { message: 'OTP sent to email' }
}

const verifySuperAdminOTP = async (superAdminData, res) => {
  const { fullName, email, password, otp } = superAdminData
  
  const otpRecord = await OTP.findOne({ email, userType: 'SuperAdmin' })
  
  if (!otpRecord) {
    throw new Error('OTP not found')
  }
  
  if (otpRecord.expiresAt < new Date()) {
    await OTP.findOneAndDelete({ email, userType: 'SuperAdmin' })
    throw new Error('OTP expired')
  }
  
  if (otpRecord.otp !== otp.toString()) {
    throw new Error('Invalid OTP')
  }
  
  const superAdmin = new SuperAdmin({ fullName, email, password })
  await superAdmin.save()
  await OTP.findOneAndDelete({ email, userType: 'SuperAdmin' })

  const { accessToken, refreshToken } = await generateSuperAdminTokens(superAdmin._id)
  
  res.cookie('superAdminAccessToken', accessToken, { httpOnly: true, secure: false, maxAge: 15 * 60 * 1000 })
  res.cookie('superAdminRefreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 })
  
  return { superAdmin: { id: superAdmin._id, fullName, email } }
}

const loginSuperAdmin = async (superAdminData, res) => {
  const { email, password } = superAdminData
  
  const superAdmin = await SuperAdmin.findOne({ email })
  if (!superAdmin || !(await superAdmin.comparePassword(password))) {
    throw new Error('Invalid credentials')
  }

  const { accessToken, refreshToken } = await generateSuperAdminTokens(superAdmin._id)
  
  res.cookie('superAdminAccessToken', accessToken, { httpOnly: true, secure: false, maxAge: 15 * 60 * 1000 })
  res.cookie('superAdminRefreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 })
  
  return { superAdmin: { id: superAdmin._id, fullName: superAdmin.fullName, email } }
}

const getPendingAdmins = async () => {
  const Admin = require('../models/admin-model')
  const pendingAdmins = await Admin.find({ isApproved: false })
  return pendingAdmins
}

const approveAdmin = async (adminId, superAdminId) => {
  const Admin = require('../models/admin-model')
  const admin = await Admin.findByIdAndUpdate(
    adminId,
    { 
      isApproved: true,
      approvedBy: superAdminId
    },
    { new: true }
  )
  
  if (!admin) {
    throw new Error('Admin not found')
  }
  
  return admin
}

const rejectAdmin = async (adminId) => {
  const Admin = require('../models/admin-model')
  const admin = await Admin.findByIdAndDelete(adminId)
  
  if (!admin) {
    throw new Error('Admin not found')
  }
  
  return admin
}

const getAllProducts = async () => {
  const Product = require('../models/product-model')
  const products = await Product.find()
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate({
      path: 'customizationSections',
      populate: {
        path: 'subSections.addons'
      }
    })
    .populate('addedBy')
  return products
}

const editProduct = async (productId, updateData) => {
  const Product = require('../models/product-model')
  const product = await Product.findByIdAndUpdate(
    productId,
    updateData,
    { new: true }
  )
  
  if (!product) {
    throw new Error('Product not found')
  }
  
  return product
}

const deleteProduct = async (productId) => {
  const Product = require('../models/product-model')
  const product = await Product.findByIdAndDelete(productId)
  
  if (!product) {
    throw new Error('Product not found')
  }
  
  return product
}

const refreshSuperAdminAccessToken = async (refreshTokenValue) => {
  const refreshToken = await RefreshToken.findOne({ 
    token: refreshTokenValue, 
    userType: 'SuperAdmin',
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  })
  
  if (!refreshToken) {
    throw new Error('Invalid or expired refresh token')
  }
  
  const accessToken = jwt.sign(
    { superAdminId: refreshToken.userId },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '15m' }
  )
  
  return { accessToken }
}

const logoutSuperAdmin = async (refreshTokenValue) => {
  if (refreshTokenValue) {
    await RefreshToken.findOneAndUpdate(
      { token: refreshTokenValue, userType: 'SuperAdmin' },
      { isRevoked: true }
    )
  }
}

const updateVenue = async (venueId, updateData) => {
  const Venue = require('../models/venue-model')
  const venue = await Venue.findByIdAndUpdate(
    venueId,
    updateData,
    { new: true }
  )
  
  if (!venue) {
    throw new Error('Venue not found')
  }
  
  return venue
}

const removeVenue = async (venueId) => {
  const Venue = require('../models/venue-model')
  const venue = await Venue.findByIdAndDelete(venueId)
  
  if (!venue) {
    throw new Error('Venue not found')
  }
  
  return venue
}

const getAllVenues = async () => {
  const Venue = require('../models/venue-model')
  const venues = await Venue.find()
  return venues
}

const sendSuperAdminPasswordResetOTP = async (superAdminData) => {
  const { email } = superAdminData
  
  const superAdmin = await SuperAdmin.findOne({ email })
  if (!superAdmin) {
    throw new Error('Super admin not found')
  }
  
  const otp = generateOTP()
  await OTP.findOneAndDelete({ email, userType: 'SuperAdminPasswordReset' })
  await new OTP({ email, otp, userType: 'SuperAdminPasswordReset' }).save()
  await sendOTP(email, otp, 'Super Admin Password Reset')
  
  return { message: 'Password reset OTP sent to email' }
}

const resetSuperAdminPassword = async (superAdminData) => {
  const { email, otp, newPassword } = superAdminData
  
  if (!newPassword) {
    throw new Error('New password is required')
  }
  
  const otpRecord = await OTP.findOne({ email, userType: 'SuperAdminPasswordReset' })
  
  if (!otpRecord) {
    throw new Error('OTP not found')
  }
  
  if (otpRecord.expiresAt < new Date()) {
    await OTP.findOneAndDelete({ email, userType: 'SuperAdminPasswordReset' })
    throw new Error('OTP expired')
  }
  
  if (otpRecord.otp !== otp.toString()) {
    throw new Error('Invalid OTP')
  }
  
  const bcrypt = require('bcryptjs')
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await SuperAdmin.findOneAndUpdate(
    { email },
    { password: hashedPassword }
  )
  await OTP.findOneAndDelete({ email, userType: 'SuperAdminPasswordReset' })
  
  return { message: 'Password reset successfully' }
}

module.exports = { 
  sendSuperAdminOTP, 
  verifySuperAdminOTP, 
  sendSuperAdminPasswordResetOTP,
  resetSuperAdminPassword,
  loginSuperAdmin, 
  getPendingAdmins, 
  approveAdmin, 
  rejectAdmin, 
  getAllProducts, 
  editProduct, 
  deleteProduct,
  getAllVenues,
  updateVenue,
  removeVenue,
  refreshSuperAdminAccessToken,
  logoutSuperAdmin
}