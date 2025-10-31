const User = require('../models/user-model')
const RefreshToken = require('../models/refresh-token-model')
const OTP = require('../models/otp-model')
const MainCategory = require('../models/main-category-model')
const SubCategory = require('../models/sub-category-model')
const ThirdCategory = require('../models/third-category-model')
const AdditionalCategory = require('../models/additional-category-model')
const CustomizationSection = require('../models/customization-section-model')
const Addon = require('../models/addon-model')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { generateOTP } = require('../utils/otp-generator')
const { sendOTP } = require('../utils/email-service')
const { sendSMSOTP } = require('../utils/sms-service')

const generateTokens = async (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '15m' }
  )
  
  const refreshTokenValue = require('crypto').randomBytes(64).toString('hex')
  const refreshToken = new RefreshToken({
    token: refreshTokenValue,
    userId,
    userType: 'User',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  })
  
  await refreshToken.save()
  return { accessToken, refreshToken: refreshTokenValue }
}

const sendUserOTP = async (userData) => {
  const { email } = userData
  
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    throw new Error('User already exists')
  }
  
  const otp = generateOTP()
  await OTP.findOneAndDelete({ email, userType: 'User' })
  await new OTP({ email, otp, userType: 'User' }).save()
  await sendOTP(email, otp, 'User')
  
  return { message: 'OTP sent to email' }
}

const verifyUserOTP = async (userData, res) => {
  const { fullName, email, password, phoneNumber, otp } = userData
  
  const otpRecord = await OTP.findOne({ email, userType: 'User' })
  
  if (!otpRecord) {
    throw new Error('OTP not found')
  }
  
  if (otpRecord.expiresAt < new Date()) {
    await OTP.findOneAndDelete({ email, userType: 'User' })
    throw new Error('OTP expired')
  }
  
  if (otpRecord.otp !== otp.toString()) {
    throw new Error('Invalid OTP')
  }
  
  const user = new User({ fullName, email, password, phoneNumber })
  await user.save()
  await OTP.findOneAndDelete({ email, userType: 'User' })
  
  const { accessToken, refreshToken } = await generateTokens(user._id)
  
  res.cookie('accessToken', accessToken, { httpOnly: true, secure: false, maxAge: 15 * 60 * 1000 })
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 })
  
  return { user: { id: user._id, fullName, email } }
}

const loginUser = async (userData, res) => {
  const { email, password } = userData
  
  const user = await User.findOne({ email })
  if (!user || !(await user.comparePassword(password))) {
    throw new Error('Invalid credentials')
  }
  
  const { accessToken, refreshToken } = await generateTokens(user._id)
  
  res.cookie('accessToken', accessToken, { httpOnly: true, secure: false, maxAge: 15 * 60 * 1000 })
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 })
  
  return { user: { id: user._id, fullName: user.fullName, email } }
}

const getProducts = async () => {
  const Product = require('../models/product-model')
  
  const featuredProducts = await Product.find({ isFeatured: true })
    .limit(6)
    .sort({ createdAt: -1 })
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
  
  const featuredIds = featuredProducts.map(p => p._id)
  
  const premiumProducts = await Product.find({ 
    tier: 'premium', 
    _id: { $nin: featuredIds } 
  })
    .limit(6)
    .sort({ isFeatured: -1, createdAt: -1 })
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
  
  const premiumIds = premiumProducts.map(p => p._id)
  const excludeIds = [...featuredIds, ...premiumIds]
  
  const allProducts = await Product.find({ _id: { $nin: excludeIds } })
    .limit(12)
    .sort({ isFeatured: -1, createdAt: -1 })
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
  
  return {
    bannerImage: "https://images.unsplash.com/photo-1519225421980-715cb0215aed",
    featuredProducts,
    premiumProducts,
    allProducts
  }
}

const checkPincode = async (pincode) => {
  const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
  const data = await response.json()
  const district = data[0]?.PostOffice?.[0]?.District || null
  
  if (!district) {
    throw new Error('District not found')
  }
  
  return { district }
}

const refreshAccessToken = async (refreshTokenValue) => {
  const refreshToken = await RefreshToken.findOne({ 
    token: refreshTokenValue, 
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  })
  
  if (!refreshToken) {
    throw new Error('Invalid or expired refresh token')
  }
  
  const accessToken = jwt.sign(
    { userId: refreshToken.userId },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '15m' }
  )
  
  return { accessToken }
}

const getProductsByCity = async (city, page = 1, limit = 10) => {
  const Product = require('../models/product-model')
  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum
  const query = { 'serviceableAreas.city': { $regex: city, $options: 'i' } }
  
  const products = await Product.find(query)
    .skip(skip)
    .limit(limitNum)
    .populate('mainCategory subCategory thirdCategory')
    .populate('additionalCategories')
    .populate({
      path: 'customizationSections',
      populate: {
        path: 'subSections.addons'
      }
    })
  const total = await Product.countDocuments(query)
  const categories = {}
  products.forEach(product => {
    const main = product.mainCategory.name
    const sub = product.subCategory.name
    const third = product.thirdCategory.name
    
    if (!categories[main]) categories[main] = {}
    if (!categories[main][sub]) categories[main][sub] = []
    if (!categories[main][sub].includes(third)) {
      categories[main][sub].push(third)
    }
  })
  return {
    products,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalProducts: total,
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    },
    availableCategories: categories
  }
}
const logoutUser = async (refreshTokenValue) => {
  if (refreshTokenValue) {
    await RefreshToken.findOneAndUpdate(
      { token: refreshTokenValue },
      { isRevoked: true }
    )
  }
}

const sendPasswordResetOTP = async (userData) => {
  const { email } = userData
  
  const user = await User.findOne({ email })
  if (!user) {
    throw new Error('User not found')
  }
  
  const otp = generateOTP()
  await OTP.findOneAndDelete({ email, userType: 'PasswordReset' })
  await new OTP({ email, otp, userType: 'PasswordReset' }).save()
  await sendOTP(email, otp, 'Password Reset')
  
  return { message: 'Password reset OTP sent to email' }
}

const resetPassword = async (userData) => {
  const { email, otp, newPassword } = userData
  
  if (!newPassword) {
    throw new Error('New password is required')
  }
  
  const otpRecord = await OTP.findOne({ email, userType: 'PasswordReset' })
  
  if (!otpRecord) {
    throw new Error('OTP not found')
  }
  
  if (otpRecord.expiresAt < new Date()) {
    await OTP.findOneAndDelete({ email, userType: 'PasswordReset' })
    throw new Error('OTP expired')
  }
  
  if (otpRecord.otp !== otp.toString()) {
    throw new Error('Invalid OTP')
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await User.findOneAndUpdate(
    { email },
    { password: hashedPassword }
  )
  await OTP.findOneAndDelete({ email, userType: 'PasswordReset' })
  
  return { message: 'Password reset successfully' }
}

const sendPhoneOTP = async (userData) => {
  let { phoneNumber } = userData
  
  // Add +91 prefix if not present
  if (!phoneNumber.startsWith('+91')) {
    phoneNumber = `+91${phoneNumber}`
  }
  
  const otp = generateOTP()
  await OTP.findOneAndDelete({ phoneNumber, userType: 'PhoneLogin' })
  await new OTP({ phoneNumber, otp, userType: 'PhoneLogin' }).save()
  await sendSMSOTP(phoneNumber, otp)
  
  return { message: 'OTP sent to phone' }
}

const verifyPhoneLogin = async (userData, res) => {
  let { phoneNumber, otp, fullName, email, password } = userData
  
  // Add +91 prefix if not present
  if (!phoneNumber.startsWith('+91')) {
    phoneNumber = `+91${phoneNumber}`
  }
  
  const otpRecord = await OTP.findOne({ phoneNumber, userType: 'PhoneLogin' })
  
  if (!otpRecord) {
    throw new Error('OTP not found')
  }
  
  if (otpRecord.expiresAt < new Date()) {
    await OTP.findOneAndDelete({ phoneNumber, userType: 'PhoneLogin' })
    throw new Error('OTP expired')
  }
  
  if (otpRecord.otp !== otp.toString()) {
    throw new Error('Invalid OTP')
  }
  
  let user = await User.findOne({ phoneNumber })
  
  if (!user) {
    if (!fullName || !email || !password) {
      throw new Error('Full name, email and password required for new user')
    }
    user = new User({ 
      fullName, 
      email, 
      phoneNumber, 
      password
    })
    await user.save()
  }
  
  await OTP.findOneAndDelete({ phoneNumber, userType: 'PhoneLogin' })
  
  const { accessToken, refreshToken } = await generateTokens(user._id)
  
  res.cookie('accessToken', accessToken, { httpOnly: true, secure: false, maxAge: 15 * 60 * 1000 })
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 })
  
  return { user: { id: user._id, fullName: user.fullName, email: user.email, phoneNumber: user.phoneNumber } }
}

const getFeaturedProducts = async () => {
  const Product = require('../models/product-model')
  const products = await Product.find({ isFeatured: true })
    .sort({ createdAt: -1 })
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

const getPremiumProducts = async () => {
  const Product = require('../models/product-model')
  const products = await Product.find({ tier: 'premium' })
    .sort({ isFeatured: -1, createdAt: -1 })
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

const getProductsByThirdCategory = async (categoryName, page = 1, limit = 10) => {
  const Product = require('../models/product-model')
  const ThirdCategory = require('../models/third-category-model')
  
  const thirdCategory = await ThirdCategory.findOne({ name: categoryName })
  if (!thirdCategory) {
    throw new Error(`Third category '${categoryName}' not found`)
  }
  
  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum
  
  const products = await Product.find({ thirdCategory: thirdCategory._id })
    .skip(skip)
    .limit(limitNum)
    .sort({ isFeatured: -1, createdAt: -1 })
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
  
  const total = await Product.countDocuments({ thirdCategory: thirdCategory._id })
  
  return {
    products,
    category: thirdCategory,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalProducts: total,
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    }
  }
}

module.exports = { sendUserOTP, verifyUserOTP, sendPasswordResetOTP, resetPassword, sendPhoneOTP, verifyPhoneLogin, loginUser, getProducts, getFeaturedProducts, getPremiumProducts, getProductsByThirdCategory, checkPincode, getProductsByCity, refreshAccessToken, logoutUser }