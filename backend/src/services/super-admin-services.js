const SuperAdmin = require('../models/super-admin-model')
const RefreshToken = require('../models/refresh-token-model')
const OTP = require('../models/otp-model')
const jwt = require('jsonwebtoken')
const { generateOTP } = require('../utils/otp-generator')
const { sendOTP } = require('../utils/email-service')
const { sendSMSOTP } = require('../utils/sms-service')

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

const getAllProducts = async (page = 1, limit = 10) => {
  const Product = require('../models/product-model')
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')
  const Addon = require('../models/addon-model')

  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum

  const [products, total] = await Promise.all([
    Product.find()
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .populate('mainCategory')
      .populate('subCategory')
      .populate('thirdCategory')
      .populate('additionalCategories')
      .populate('customizationSections.addons.addon')
      .populate('addedBy', 'fullName email'),
    Product.countDocuments()
  ])

  return {
    products,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalProducts: total,
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    }
  }
}

const filterProducts = async (filters) => {
  const Product = require('../models/product-model')
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')
  const Addon = require('../models/addon-model')

  const {
    name, tier, isFeatured, minPrice, maxPrice,
    city, mainCategory, subCategory, thirdCategory,
    page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc'
  } = filters

  const query = {}

  // name search with regex
  if (name && name.trim()) {
    query.name = { $regex: name.trim(), $options: 'i' }
  }

  if (tier && ['standard', 'premium'].includes(tier)) {
    query.tier = tier
  }

  if (isFeatured !== undefined && isFeatured !== '') {
    query.isFeatured = isFeatured === 'true' || isFeatured === true
  }

  if (minPrice || maxPrice) {
    query.price = {}
    if (minPrice) query.price.$gte = Number(minPrice)
    if (maxPrice) query.price.$lte = Number(maxPrice)
  }

  if (city) {
    query['serviceableAreas.city'] = { $regex: city.trim(), $options: 'i' }
  }

  // resolve category names to IDs
  if (mainCategory) {
    const cat = await MainCategory.findOne({ name: { $regex: mainCategory.trim(), $options: 'i' } })
    if (cat) query.mainCategory = cat._id
  }

  if (subCategory) {
    const cat = await SubCategory.findOne({ name: { $regex: subCategory.trim(), $options: 'i' } })
    if (cat) query.subCategory = cat._id
  }

  if (thirdCategory) {
    const cat = await ThirdCategory.findOne({ name: { $regex: thirdCategory.trim(), $options: 'i' } })
    if (cat) query.thirdCategory = cat._id
  }

  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum

  const validSortFields = ['price', 'createdAt', 'name', 'isFeatured']
  const sortOptions = {}
  sortOptions[validSortFields.includes(sortBy) ? sortBy : 'createdAt'] = sortOrder === 'asc' ? 1 : -1

  const [products, total] = await Promise.all([
    Product.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort(sortOptions)
      .populate('mainCategory')
      .populate('subCategory')
      .populate('thirdCategory')
      .populate('additionalCategories')
      .populate('customizationSections.addons.addon')
      .populate('addedBy', 'fullName email'),
    Product.countDocuments(query)
  ])

  return {
    products,
    appliedFilters: { name, tier, isFeatured, minPrice, maxPrice, city, mainCategory, subCategory, thirdCategory, sortBy, sortOrder },
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalProducts: total,
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    }
  }
}

const editProduct = async (productId, updateData) => {
  const Product = require('../models/product-model')
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')

  const allowed = [
    'name', 'description', 'price', 'discountedPrice',
    'images', 'isFeatured', 'tier', 'serviceableAreas',
    'location', 'setupDuration', 'teamSize', 'advanceBooking',
    'cancellationPolicy', 'youtubeVideoLink',
    'inclusions', 'experiences', 'keyHighlights',
    'customizationSections', 'additionalCategories', 'tags'
  ]

  const update = {}
  for (const key of allowed) {
    if (updateData[key] !== undefined) update[key] = updateData[key]
  }

  // validate discountedPrice < price
  if (update.discountedPrice != null) {
    const existing = await Product.findById(productId).select('price')
    const basePrice = update.price ?? existing?.price
    if (Number(update.discountedPrice) >= Number(basePrice)) {
      throw new Error('Discounted price must be less than original price')
    }
  }

  // resolve category names to IDs if sent as strings
  if (updateData.mainCategory && typeof updateData.mainCategory === 'string' && !updateData.mainCategory.match(/^[a-f\d]{24}$/i)) {
    const cat = await MainCategory.findOne({ name: updateData.mainCategory })
    if (!cat) throw new Error(`Main category '${updateData.mainCategory}' not found`)
    update.mainCategory = cat._id
  } else if (updateData.mainCategory) {
    update.mainCategory = updateData.mainCategory
  }

  if (updateData.subCategory && typeof updateData.subCategory === 'string' && !updateData.subCategory.match(/^[a-f\d]{24}$/i)) {
    const cat = await SubCategory.findOne({ name: updateData.subCategory })
    if (!cat) throw new Error(`Sub category '${updateData.subCategory}' not found`)
    update.subCategory = cat._id
  } else if (updateData.subCategory) {
    update.subCategory = updateData.subCategory
  }

  if (updateData.thirdCategory && typeof updateData.thirdCategory === 'string' && !updateData.thirdCategory.match(/^[a-f\d]{24}$/i)) {
    const cat = await ThirdCategory.findOne({ name: updateData.thirdCategory })
    if (!cat) throw new Error(`Third category '${updateData.thirdCategory}' not found`)
    update.thirdCategory = cat._id
  } else if (updateData.thirdCategory) {
    update.thirdCategory = updateData.thirdCategory
  }

  const product = await Product.findByIdAndUpdate(productId, update, { new: true })
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate('customizationSections.addons.addon')
    .populate('addedBy', 'fullName email')

  if (!product) throw new Error('Product not found')
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

  const allowed = [
    'name', 'description', 'images', 'startingPrice',
    'location', 'capacity', 'typesOfVenues',
    'accessibilityFeatures', 'facilities', 'restrictions',
    'otherInformation', 'supportedEvents'
  ]

  const update = {}
  for (const key of allowed) {
    if (updateData[key] !== undefined) update[key] = updateData[key]
  }

  // parse JSON strings from form-data
  const parseIfString = (key) => {
    if (typeof update[key] === 'string') {
      try { update[key] = JSON.parse(update[key]) } catch { /* keep as-is */ }
    }
  }
  parseIfString('location')
  parseIfString('capacity')
  parseIfString('otherInformation')
  parseIfString('typesOfVenues')
  parseIfString('accessibilityFeatures')
  parseIfString('facilities')
  parseIfString('restrictions')
  parseIfString('supportedEvents')

  if (update.startingPrice !== undefined) update.startingPrice = Number(update.startingPrice)

  const venue = await Venue.findByIdAndUpdate(venueId, update, { new: true })
  if (!venue) throw new Error('Venue not found')
  return venue
}

const removeVenue = async (venueId) => {
  const Venue = require('../models/venue-model')
  const venue = await Venue.findByIdAndDelete(venueId)
  if (!venue) throw new Error('Venue not found')
  return venue
}

const getAllVenues = async (page = 1, limit = 10) => {
  const Venue = require('../models/venue-model')
  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum

  const [venues, total] = await Promise.all([
    Venue.find().skip(skip).limit(limitNum).sort({ createdAt: -1 }),
    Venue.countDocuments()
  ])

  return {
    venues,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalVenues: total,
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    }
  }
}

const getAllAdmins = async () => {
  const Admin = require('../models/admin-model')
  const admins = await Admin.find().select('-password')
  return admins
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

const sendSuperAdminPhoneOTP = async (superAdminData) => {
  let { phoneNumber } = superAdminData
  
  if (!phoneNumber.startsWith('+91')) {
    phoneNumber = `+91${phoneNumber}`
  }
  
  const existingSuperAdmin = await SuperAdmin.findOne({ phoneNumber })
  if (existingSuperAdmin) {
    throw new Error('Super admin already exists')
  }
  
  const otp = generateOTP()
  await OTP.findOneAndDelete({ phoneNumber, userType: 'SuperAdminPhoneLogin' })
  await new OTP({ phoneNumber, otp, userType: 'SuperAdminPhoneLogin' }).save()
  await sendSMSOTP(phoneNumber, otp)
  
  return { message: 'OTP sent to phone' }
}

const verifySuperAdminPhoneLogin = async (superAdminData, res) => {
  let { phoneNumber, otp, fullName, email, password } = superAdminData
  
  if (!phoneNumber.startsWith('+91')) {
    phoneNumber = `+91${phoneNumber}`
  }
  
  const otpRecord = await OTP.findOne({ phoneNumber, userType: 'SuperAdminPhoneLogin' })
  
  if (!otpRecord) {
    throw new Error('OTP not found')
  }
  
  if (otpRecord.expiresAt < new Date()) {
    await OTP.findOneAndDelete({ phoneNumber, userType: 'SuperAdminPhoneLogin' })
    throw new Error('OTP expired')
  }
  
  if (otpRecord.otp !== otp.toString()) {
    throw new Error('Invalid OTP')
  }
  
  let superAdmin = await SuperAdmin.findOne({ phoneNumber })
  
  if (!superAdmin) {
    if (!fullName || !email || !password) {
      throw new Error('Full name, email and password required for new super admin')
    }
    superAdmin = new SuperAdmin({ 
      fullName, 
      email, 
      phoneNumber,
      password
    })
    await superAdmin.save()
  }
  
  await OTP.findOneAndDelete({ phoneNumber, userType: 'SuperAdminPhoneLogin' })
  
  const { accessToken, refreshToken } = await generateSuperAdminTokens(superAdmin._id)
  
  res.cookie('superAdminAccessToken', accessToken, { httpOnly: true, secure: false, maxAge: 15 * 60 * 1000 })
  res.cookie('superAdminRefreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 })
  
  return { superAdmin: { id: superAdmin._id, fullName: superAdmin.fullName, email: superAdmin.email, phoneNumber: superAdmin.phoneNumber } }
}

const getAllInquiries = async () => {
  const Inquiry = require('../models/inquiry-model')
  return await Inquiry.find().populate('venue').sort({ createdAt: -1 })
}

const CORPORATE_BOOKING_SERVICE_TYPE = 'Corporate Event Booking'

const getCorporateBookings = async () => {
  const Contact = require('../models/contact-model')
  return Contact.find({ serviceType: CORPORATE_BOOKING_SERVICE_TYPE })
    .sort({ createdAt: -1 })
    .lean()
}

const updateCorporateBookingStatus = async (contactId, status) => {
  const Contact = require('../models/contact-model')
  const allowed = ['new', 'contacted', 'closed']
  if (!allowed.includes(status)) {
    throw new Error('Invalid status')
  }
  const contact = await Contact.findOneAndUpdate(
    { _id: contactId, serviceType: CORPORATE_BOOKING_SERVICE_TYPE },
    { status },
    { new: true }
  ).lean()
  if (!contact) throw new Error('Corporate booking not found')
  return contact
}

const getAllBlogs = async (page = 1, limit = 10, filters = {}) => {
  const Blog = require('../models/blog-model')
  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum

  const query = {}
  if (filters.published !== undefined && filters.published !== '') {
    query.published = filters.published === 'true' || filters.published === true
  }
  if (filters.category) query.category = { $regex: filters.category.trim(), $options: 'i' }
  if (filters.title) query.title = { $regex: filters.title.trim(), $options: 'i' }

  const [blogs, total] = await Promise.all([
    Blog.find(query)
      .populate('author', 'fullName email')
      .select('-content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Blog.countDocuments(query)
  ])

  return {
    blogs,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalBlogs: total,
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    }
  }
}

const getBlogById = async (blogId) => {
  const Blog = require('../models/blog-model')
  return Blog.findById(blogId).populate('author', 'fullName email')
}

const updateBlog = async (blogId, updateData) => {
  const Blog = require('../models/blog-model')

  const blog = await Blog.findById(blogId)
  if (!blog) throw new Error('Blog not found')

  const allowed = ['title', 'excerpt', 'content', 'featuredImage', 'category', 'tags', 'published', 'metaTitle', 'metaDescription']
  const update = {}
  for (const key of allowed) {
    if (updateData[key] !== undefined) update[key] = updateData[key]
  }

  // normalize tags
  if (update.tags && typeof update.tags === 'string') {
    try { update.tags = JSON.parse(update.tags) } catch { update.tags = update.tags.split(',').map(t => t.trim()).filter(Boolean) }
  }

  // normalize published
  if (update.published !== undefined) {
    update.published = update.published === true || update.published === 'true'
  }

  // recalculate reading time if content changed
  if (update.content) {
    update.readingTime = Math.ceil(update.content.trim().split(/\s+/).length / 200)
  }

  // set publishedAt if publishing for first time
  if (update.published && !blog.publishedAt) {
    update.publishedAt = new Date()
  }

  // regenerate slug if title changed
  if (update.title && update.title !== blog.title) {
    const baseSlug = update.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const existing = await Blog.findOne({ slug: { $regex: `^${baseSlug}` }, _id: { $ne: blogId } })
    update.slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug
  }

  return Blog.findByIdAndUpdate(blogId, update, { new: true, runValidators: false }).populate('author', 'fullName email')
}

const removeBlog = async (blogId) => {
  const Blog = require('../models/blog-model')
  const blog = await Blog.findByIdAndDelete(blogId)
  if (!blog) throw new Error('Blog not found')
  return blog
}

const listHomeProductSections = async () => {
  const HomeProductSection = require('../models/home-product-section-model')
  return HomeProductSection.find({}).sort({ sortOrder: 1, slug: 1 }).lean()
}

const upsertHomeProductSection = async (slug, body = {}) => {
  const mongoose = require('mongoose')
  const HomeProductSection = require('../models/home-product-section-model')
  const normalized = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
  if (!normalized) throw new Error('Invalid slug')

  const update = {}
  if (body.title !== undefined) update.title = body.title
  if (body.subtitle !== undefined) update.subtitle = body.subtitle
  if (body.exploreHref !== undefined) update.exploreHref = body.exploreHref
  if (body.sortOrder !== undefined) update.sortOrder = Number(body.sortOrder)
  if (body.isActive !== undefined) update.isActive = Boolean(body.isActive)
  if (body.productIds !== undefined) {
    const ids = Array.isArray(body.productIds) ? body.productIds : []
    update.productIds = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(String(id)))
      .map((id) => new mongoose.Types.ObjectId(String(id)))
  }

  update.slug = normalized
  return HomeProductSection.findOneAndUpdate({ slug: normalized }, update, {
    upsert: true,
    new: true,
    runValidators: true,
    setDefaultsOnInsert: true
  }).lean()
}

module.exports = { 
  sendSuperAdminOTP, 
  verifySuperAdminOTP, 
  sendSuperAdminPasswordResetOTP,
  resetSuperAdminPassword,
  sendSuperAdminPhoneOTP,
  verifySuperAdminPhoneLogin,
  loginSuperAdmin, 
  getPendingAdmins, 
  approveAdmin, 
  rejectAdmin, 
  getAllProducts, 
  filterProducts,
  editProduct, 
  deleteProduct,
  getAllVenues,
  updateVenue,
  removeVenue,
  getAllAdmins,
  getAllInquiries,
  getCorporateBookings,
  updateCorporateBookingStatus,
  getAllBlogs,
  getBlogById,
  updateBlog,
  removeBlog,
  listHomeProductSections,
  upsertHomeProductSection,
  refreshSuperAdminAccessToken,
  logoutSuperAdmin
}