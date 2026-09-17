const { getMergedHomeProductSections } = require('./home-sections-service')
const { checkPincode: checkPincodeService } = require('./pincode-services')
const User = require('../models/user-model')
const RefreshToken = require('../models/refresh-token-model')
const OTP = require('../models/otp-model')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { generateOTP } = require('../utils/otp-generator')
const { sendOTP } = require('../utils/email-service')
const { sendSMSOTP } = require('../utils/sms-service')
const { accessTokenOptions, refreshTokenOptions } = require('../utils/cookie-options')

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

  res.cookie('accessToken', accessToken, accessTokenOptions)
  res.cookie('refreshToken', refreshToken, refreshTokenOptions)

  return { user: { id: user._id, fullName, email } }
}

const loginUser = async (userData, res) => {
  const { email, password } = userData

  const user = await User.findOne({ email })
  if (!user || !(await user.comparePassword(password))) {
    throw new Error('Invalid credentials')
  }

  const { accessToken, refreshToken } = await generateTokens(user._id)

  res.cookie('accessToken', accessToken, accessTokenOptions)
  res.cookie('refreshToken', refreshToken, refreshTokenOptions)

  return { user: { id: user._id, fullName: user.fullName, email } }
}
const createReview = async (userId, productId, reviewText, rating, images = []) => {
  const Review = require('../models/review-model');
  const Product = require('../models/product-model');
  const mongoose = require('mongoose');

  if (!reviewText || !rating) {
    throw new Error('Review text and rating are required');
  }

  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const existingReview = await Review.findOne({
    user: userId,
    product: productId,
  });

  if (existingReview) {
    throw new Error('You have already reviewed this product');
  }

  const review = await Review.create({
    user: userId,
    product: productId,
    reviewText,
    rating,
    images
  });

  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, numReviews: { $sum: 1 } } }
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      averageRating: stats[0].avgRating,
      numReviews: stats[0].numReviews,
    });
  }

  return review;
};

const createVenueReview = async (userId, venueId, reviewText, rating, images = []) => {
  const VenueReview = require('../models/venue-review-model');
  const Venue = require('../models/venue-model');
  const mongoose = require('mongoose');

  if (!reviewText || !rating) {
    throw new Error('Review text and rating are required');
  }

  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const existingReview = await VenueReview.findOne({
    user: userId,
    venue: venueId,
  });

  if (existingReview) {
    throw new Error('You have already reviewed this venue');
  }

  const venue = await Venue.findById(venueId)
  if (!venue) {
    throw new Error('Venue not found')
  }

  const review = await VenueReview.create({
    user: userId,
    venue: venueId,
    reviewText,
    rating,
    images
  });

  const stats = await VenueReview.aggregate([
    { $match: { venue: new mongoose.Types.ObjectId(venueId) } },
    { $group: { _id: '$venue', avgRating: { $avg: '$rating' }, numReviews: { $sum: 1 } } }
  ]);

  if (stats.length > 0) {
    venue.ratings.average = stats[0].avgRating
    venue.ratings.count = stats[0].numReviews
  } else {
    venue.ratings.average = 0
    venue.ratings.count = 0
  }

  venue.reviews.push({
    user: userId,
    rating,
    comment: reviewText
  });

  await venue.save()
  return review;
};
const getProfileService = async (userId) => {
  const User = require('../models/user-model');
  const Review = require('../models/review-model');

  // 🔍 Get user with cart & orders
  const user = await User.findById(userId)
    .select('-password') // 🔒 never expose password
    .populate('cart')
    // .populate({
    //   path: 'orders',
    //   options: { sort: { createdAt: -1 } }
    // })
    .lean();

  if (!user) {
    throw new Error('User not found');
  }

  // ⭐ Get user reviews (optional but powerful)
  const reviews = await Review.find({ user: userId })
    .populate('product', 'name images averageRating')
    .sort({ createdAt: -1 })
    .lean();

  return {
    user,
    reviews
  };
};

const {
  buildProductCityFilter,
  buildVenueCityFilter,
  buildBlogCityFilter,
} = require('../utils/cityMatch')

/**
 * Build a Mongo filter that matches a product whose `serviceableAreas.city`
 * (or location label) belongs to the selected city/metro, including aliases
 * such as Delhi → Greater Noida / Noida / Gurugram.
 * Returns `{}` when city is empty/"across-india".
 */
const buildCityFilter = (city) => buildProductCityFilter(city)

/** Safe partial text match on product name / description / tags (no user-controlled regex operators). */
const buildProductTextSearchCondition = (rawQ) => {
  const q = typeof rawQ === 'string' ? rawQ.trim().slice(0, 200) : ''
  if (!q) return null
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return {
    $or: [
      { name: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
      { tags: { $regex: escaped, $options: 'i' } }
    ]
  }
}

const getProducts = async (city = '') => {
  const Product = require('../models/product-model')
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')
  const Addon = require('../models/addon-model')
  const HeroBanner = require('../models/hero-banner-model')

  const cityFilter = buildCityFilter(city)

  const featuredProducts = await Product.find({ isFeatured: true, ...cityFilter })
    .limit(6)
    .sort({ createdAt: -1 })
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate({
      path: 'customizationSections.addons.addon'
    })
    .populate('addedBy')

  const featuredIds = featuredProducts.map(p => p._id)

  const premiumProducts = await Product.find({
    tier: 'premium',
    _id: { $nin: featuredIds },
    ...cityFilter
  })
    .limit(6)
    .sort({ isFeatured: -1, createdAt: -1 })
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate({
      path: 'customizationSections.addons.addon'
    })
    .populate('addedBy')

  const premiumIds = premiumProducts.map(p => p._id)
  const excludeIds = [...featuredIds, ...premiumIds]

  const allProducts = await Product.find({ _id: { $nin: excludeIds }, ...cityFilter })
    .limit(12)
    .sort({ isFeatured: -1, createdAt: -1 })
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate({
      path: 'customizationSections.addons.addon'
    })
    .populate('addedBy')

  const heroBanners = await HeroBanner.find({ isActive: true })
    .populate({
      path: 'subCategory',
      populate: { path: 'mainCategory', select: 'name' }
    })
    .populate({
      path: 'thirdCategory',
      populate: {
        path: 'subCategory',
        populate: { path: 'mainCategory', select: 'name' }
      }
    })
    .populate('addedBy', 'fullName email')
    .sort({ sortOrder: 1, createdAt: -1 })

  // fetch third category banners under subCategory named 'By Event Type'
  const byEventTypeSub = await SubCategory.findOne({ name: { $regex: 'by event type', $options: 'i' } })
  const eventTypeBanners = byEventTypeSub
    ? await ThirdCategory.find({ subCategory: byEventTypeSub._id })
        .select('name bannerImage description')
        .lean()
    : []

  let homeProductSections = []
  try {
    homeProductSections = await getMergedHomeProductSections(city)
  } catch (e) {
    console.error('getMergedHomeProductSections:', e.message)
    homeProductSections = []
  }

  return {
    heroBanners,
    featuredProducts,
    premiumProducts,
    allProducts,
    eventTypeBanners,
    homeProductSections
  }
}

const checkPincode = checkPincodeService

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
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')

  const Addon = require('../models/addon-model')

  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum
  const query = buildCityFilter(city)

  const products = await Product.find(query)
    .skip(skip)
    .limit(limitNum)
    .populate('mainCategory subCategory thirdCategory')
    .populate('additionalCategories')
    .populate({
      path: 'customizationSections.addons.addon'
    })

  const total = await Product.countDocuments(query)
  const categories = {}
  products.forEach(product => {
    if (!product.mainCategory || !product.subCategory || !product.thirdCategory) {
      return
    }

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

  res.cookie('accessToken', accessToken, accessTokenOptions)
  res.cookie('refreshToken', refreshToken, refreshTokenOptions)

  return { user: { id: user._id, fullName: user.fullName, email: user.email, phoneNumber: user.phoneNumber } }
}

const getFeaturedProducts = async () => {
  const Product = require('../models/product-model')
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')
  const Addon = require('../models/addon-model')

  const products = await Product.find({ isFeatured: true })
    .sort({ createdAt: -1 })
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate({
      path: 'customizationSections.addons.addon'
    })
    .populate('addedBy')
  return products
}

const getPremiumProducts = async () => {
  const Product = require('../models/product-model')
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')

  const Addon = require('../models/addon-model')

  const products = await Product.find({ tier: 'premium' })
    .sort({ isFeatured: -1, createdAt: -1 })
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate({
      path: 'customizationSections.addons.addon'
    })
    .populate('addedBy')
  return products
}

const getProductsByThirdCategory = async (categoryName, page = 1, limit = 10, city = '') => {
  const { findCategoryByNameOrSlug } = require('../utils/categoryNameLookup')
  const Product = require('../models/product-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const Addon = require('../models/addon-model')

  const thirdCategoryDoc = await findCategoryByNameOrSlug(ThirdCategory, categoryName)
  if (!thirdCategoryDoc) {
    throw new Error(`Third category '${categoryName}' not found`)
  }
  const thirdCategory = thirdCategoryDoc.toObject ? thirdCategoryDoc.toObject() : thirdCategoryDoc

  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum

  const populate = (q) => q
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate({ path: 'customizationSections.addons.addon' })
    .populate('addedBy')

  const baseQuery = { thirdCategory: thirdCategory._id, ...buildCityFilter(city) }

  const [featuredAndPremium, featuredOnly, premiumOnly, standard] = await Promise.all([
    populate(Product.find({ ...baseQuery, isFeatured: true, tier: 'premium' }).sort({ createdAt: -1 })),
    populate(Product.find({ ...baseQuery, isFeatured: true, tier: 'standard' }).sort({ createdAt: -1 })),
    populate(Product.find({ ...baseQuery, isFeatured: false, tier: 'premium' }).sort({ createdAt: -1 })),
    populate(Product.find({ ...baseQuery, isFeatured: false, tier: 'standard' }).sort({ createdAt: -1 }))
  ])

  const allProducts = [...featuredAndPremium, ...featuredOnly, ...premiumOnly, ...standard]
  const total = allProducts.length
  const products = allProducts.slice(skip, skip + limitNum)

  const buildAdditionalTree = async (parentId, parentModel) => {
    const children = await AdditionalCategory.find({ parentCategory: parentId, parentModel }).lean()
    return Promise.all(
      children.map(async child => ({
        ...child,
        children: await buildAdditionalTree(child._id, 'AdditionalCategory')
      }))
    )
  }

  const additionalCategories = await buildAdditionalTree(thirdCategory._id, 'ThirdCategory')

  return {
    products,
    category: thirdCategory,
    additionalCategories,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalProducts: total,
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    }
  }
}

const getFilteredProducts = async (filters) => {
  const Product = require('../models/product-model')
  const ThirdCategory = require('../models/third-category-model')

  const { category, tier, minPrice, maxPrice, city, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', q } = filters

  const query = {}

  if (category) {
    const { findCategoryByNameOrSlug } = require('../utils/categoryNameLookup')
    const thirdCategory = await findCategoryByNameOrSlug(ThirdCategory, category)
    if (thirdCategory) {
      query.thirdCategory = thirdCategory._id
    }
  }

  const textCond = buildProductTextSearchCondition(q)
  if (textCond) {
    query.$or = textCond.$or
  }

  const qNormalized =
    typeof q === 'string' && textCond ? q.trim().slice(0, 200) : undefined

  if (tier && ['standard', 'premium'].includes(tier)) {
    query.tier = tier
  }

  if (minPrice || maxPrice) {
    query.price = {}
    if (minPrice) query.price.$gte = parseInt(minPrice)
    if (maxPrice) query.price.$lte = parseInt(maxPrice)
  }

  Object.assign(query, buildCityFilter(city))

  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum

  const sortOptions = {}
  const validSortFields = ['price', 'createdAt', 'isFeatured']
  if (validSortFields.includes(sortBy)) {
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1
  } else {
    sortOptions.createdAt = -1
  }

  const products = await Product.find(query)
    .skip(skip)
    .limit(limitNum)
    .sort(sortOptions)
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate({
      path: 'customizationSections.addons.addon'
    })
    .populate('addedBy')

  const total = await Product.countDocuments(query)

  return {
    products,
    filters: {
      category,
      q: qNormalized,
      tier,
      minPrice,
      maxPrice,
      city,
      sortBy,
      sortOrder
    },
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalProducts: total,
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    }
  }
}

/**
 * Typeahead suggestions for header search — lightweight fields only.
 */
const getSearchSuggestions = async (rawQ, city, limit = 8) => {
  const Product = require('../models/product-model')
  const q = typeof rawQ === 'string' ? rawQ.trim().slice(0, 120) : ''
  if (q.length < 2) return { suggestions: [] }

  const textCond = buildProductTextSearchCondition(q)
  if (!textCond) return { suggestions: [] }

  const lim = Math.min(Math.max(parseInt(limit, 10) || 8, 1), 15)
  const base = { ...buildCityFilter(city), ...textCond }

  const rows = await Product.find(base)
    .select('name images price discountedPrice _id')
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(lim)
    .lean()

  return {
    suggestions: rows.map((p) => ({
      id: String(p._id),
      title: p.name,
      image: Array.isArray(p.images) && p.images[0] ? p.images[0] : null,
      price: p.discountedPrice != null ? p.discountedPrice : p.price,
      href: `/product/${p._id}`
    }))
  }
}

/**
 * Replace user cart from checkout snapshot (product ids, quantities, optional addon lines + booking details).
 * Used by guest checkout so totals match customization add-ons.
 */
const normalizeBookingDetails = (raw) => {
  if (!raw || typeof raw !== 'object') return undefined
  const { parsePositivePrice } = require('../utils/giftCardPrice')
  const pincode = String(raw.pincode || '').trim().slice(0, 12)
  const district = raw.district != null ? String(raw.district).trim().slice(0, 120) : undefined
  const bookingDate = String(raw.bookingDate || '').trim().slice(0, 32)
  const startTime = String(raw.startTime || '').trim().slice(0, 16)
  const endTime = String(raw.endTime || '').trim().slice(0, 16)

  let balloonColorChoice
  const bc = raw.balloonColorChoice
  if (bc && typeof bc === 'object') {
    const mode = ['default', 'preset', 'custom'].includes(bc.mode) ? bc.mode : 'default'
    const label = String(bc.label || '').trim().slice(0, 200)
    const colors = Array.isArray(bc.colors)
      ? bc.colors.map((c) => String(c).trim().slice(0, 80)).filter(Boolean).slice(0, 4)
      : undefined
    balloonColorChoice = { mode, label, ...(colors?.length ? { colors } : {}) }
  }

  let giftCardChoice
  const gc = raw.giftCardChoice
  if (gc && typeof gc === 'object') {
    const babyName = String(gc.babyName || '').trim().slice(0, 120)
    const whichBirthday = String(gc.whichBirthday || '').trim().slice(0, 80)
    const size = String(gc.size || '').trim().slice(0, 120)
    const sizePrice = parsePositivePrice(gc.sizePrice)
    if (babyName || whichBirthday || size) {
      giftCardChoice = {
        ...(babyName ? { babyName } : {}),
        ...(whichBirthday ? { whichBirthday } : {}),
        ...(size ? { size } : {}),
        ...(sizePrice != null ? { sizePrice } : {}),
      }
    }
  }

  if (!pincode && !bookingDate && !balloonColorChoice && !giftCardChoice) return undefined

  return {
    ...(pincode ? { pincode } : {}),
    ...(district ? { district } : {}),
    ...(bookingDate ? { bookingDate } : {}),
    ...(startTime ? { startTime } : {}),
    ...(endTime ? { endTime } : {}),
    ...(balloonColorChoice ? { balloonColorChoice } : {}),
    ...(giftCardChoice ? { giftCardChoice } : {}),
  }
}

const syncCheckoutCart = async (userId, rawItems) => {
  const Cart = require('../models/cart-model')
  const Product = require('../models/product-model')
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('Cart snapshot is required')
  }
  if (rawItems.length > 40) {
    throw new Error('Too many line items')
  }
  let cart = await Cart.findOne({ user: userId })
  if (!cart) {
    cart = new Cart({ user: userId, items: [] })
  }
  const newItems = []
  for (const row of rawItems) {
    const productId = row.productId
    if (!productId) throw new Error('Each item needs productId')
    const product = await Product.findById(productId).populate('thirdCategory')
    if (!product) throw new Error('Product not found')
    let quantity = parseInt(row.quantity, 10)
    if (!Number.isFinite(quantity) || quantity < 1) quantity = 1
    if (quantity > 99) quantity = 99
    const bookingAddonLines = []
    if (Array.isArray(row.bookingAddonLines)) {
      for (const l of row.bookingAddonLines.slice(0, 40)) {
        const lt = Number(l.lineTotal)
        if (!Number.isFinite(lt) || lt < 0 || lt > 2_000_000) continue
        bookingAddonLines.push({
          sectionName: String(l.sectionName || '').slice(0, 220),
          addonName: String(l.addonName || '').slice(0, 220),
          quantity: Math.min(Math.max(parseInt(l.quantity, 10) || 1, 1), 999),
          lineTotal: Math.round(lt * 100) / 100
        })
      }
    }
    const bookingDetails = normalizeBookingDetails(row.bookingDetails)
    if (bookingDetails?.giftCardChoice?.size) {
      const { resolveGiftCardUnitPrice } = require('../utils/giftCardPrice')
      const resolved = resolveGiftCardUnitPrice(product, bookingDetails.giftCardChoice)
      if (resolved != null) {
        bookingDetails.giftCardChoice.sizePrice = resolved
      }
    }
    newItems.push({
      product: product._id,
      quantity,
      bookingAddonLines,
      ...(bookingDetails ? { bookingDetails } : {}),
    })
  }
  cart.items = newItems
  cart.totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0)
  await cart.save()
  return cart
}

const cartProductPopulate = {
  path: 'items.product',
  populate: [
    { path: 'mainCategory' },
    { path: 'subCategory' },
    { path: 'thirdCategory' }
  ]
}

const wishlistProductPopulate = {
  path: 'products',
  populate: [
    { path: 'mainCategory' },
    { path: 'subCategory' },
    { path: 'thirdCategory' }
  ]
}

function cartItemProductId(item) {
  const p = item?.product
  if (!p) return ''
  if (typeof p === 'object' && p._id) return String(p._id)
  return String(p)
}

const addToCart = async (userId, productId) => {
  const Cart = require('../models/cart-model')
  const Product = require('../models/product-model')
  const id = String(productId || '').trim()
  if (!id) {
    throw new Error('Product id is required')
  }
  const product = await Product.findById(id)
  if (!product) {
    throw new Error('Product not found')
  }

  let cart = await Cart.findOne({ user: userId })

  if (!cart) {
    cart = new Cart({ user: userId, items: [] })
  }

  const existingItem = cart.items.find((item) => cartItemProductId(item) === id)

  if (existingItem) {
    existingItem.quantity += 1
  } else {
    cart.items.push({ product: id, quantity: 1 })
  }

  cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  await cart.save()
  await cart.populate(cartProductPopulate)
  return cart
}

const removeFromCart = async (userId, productId) => {
  const Cart = require('../models/cart-model')
  const id = String(productId || '').trim()

  const cart = await Cart.findOne({ user: userId })

  if (!cart) {
    throw new Error('Cart not found')
  }

  cart.items = cart.items.filter((item) => cartItemProductId(item) !== id)
  cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  await cart.save()
  await cart.populate(cartProductPopulate)
  return cart
}

const getCart = async (userId) => {
  const Cart = require('../models/cart-model')
  const cart = await Cart.findOne({ user: userId }).populate(cartProductPopulate)
  if (!cart) return { items: [], totalItems: 0 }
  return cart
}

const getWishlist = async (userId) => {
  const Wishlist = require('../models/wishlist-model')
  const wishlist = await Wishlist.findOne({ user: userId }).populate(wishlistProductPopulate)
  if (!wishlist) return { products: [], totalItems: 0 }
  return wishlist
}

const addToWishlist = async (userId, productId) => {
  const Wishlist = require('../models/wishlist-model')
  const Product = require('../models/product-model')
  const id = String(productId || '').trim()
  if (!id) {
    throw new Error('Product id is required')
  }

  const product = await Product.findById(id)
  if (!product) {
    throw new Error('Product not found')
  }

  let wishlist = await Wishlist.findOne({ user: userId })

  if (!wishlist) {
    wishlist = new Wishlist({ user: userId, products: [] })
  }

  if (wishlist.products.some((existing) => String(existing) === id)) {
    throw new Error('Product already in wishlist')
  }

  wishlist.products.push(id)
  wishlist.totalItems = wishlist.products.length
  await wishlist.save()
  await wishlist.populate(wishlistProductPopulate)
  return wishlist
}

const removeFromWishlist = async (userId, productId) => {
  const Wishlist = require('../models/wishlist-model')
  const id = String(productId || '').trim()

  const wishlist = await Wishlist.findOne({ user: userId })

  if (!wishlist) {
    throw new Error('Wishlist not found')
  }

  wishlist.products = wishlist.products.filter((existing) => String(existing) !== id)
  wishlist.totalItems = wishlist.products.length

  await wishlist.save()
  await wishlist.populate(wishlistProductPopulate)
  return wishlist
}

const getProductDetails = async (productId) => {
  const Product = require('../models/product-model')
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')

  const Addon = require('../models/addon-model')

  const product = await Product.findById(productId)
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate({
      path: 'customizationSections.addons.addon'
    })
    .populate('addedBy', 'fullName email')

  if (!product) {
    throw new Error('Product not found')
  }

  return product
}

const trackProductInterest = async (userId, productId) => {
  const Product = require('../models/product-model')
  const User = require('../models/user-model')
  const applyDecay = require('../utils/interestDecay')

  const product = await Product.findById(productId).select('tags')
  if (!product || !product.tags.length) return

  const user = await User.findById(userId)
  if (!user) return

  product.tags.forEach(tag => {
    const existing = user.interests.find(i => i.tag === tag)
    if (existing) {
      applyDecay(existing)
      existing.score += 1
      existing.lastUpdated = new Date()
    } else {
      user.interests.push({ tag, score: 1, lastUpdated: new Date() })
    }
  })

  await user.save()
}

const getAllMainCategories = async () => {
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')

  const mainCategories = await MainCategory.find().sort({ name: 1 }).lean()

  const buildAdditionalTree = async (parentId, parentModel) => {
    const children = await AdditionalCategory.find({ parentCategory: parentId, parentModel }).lean()
    return Promise.all(children.map(async child => ({
      ...child,
      children: await buildAdditionalTree(child._id, 'AdditionalCategory')
    })))
  }

  const result = await Promise.all(mainCategories.map(async mainCat => {
    const subCategories = await SubCategory.find({ mainCategory: mainCat._id }).lean()

    const subCategoriesWithChildren = await Promise.all(subCategories.map(async subCat => {
      const thirdCategories = await ThirdCategory.find({ subCategory: subCat._id }).lean()

      const thirdCategoriesWithChildren = await Promise.all(thirdCategories.map(async thirdCat => ({
        ...thirdCat,
        additionalCategories: await buildAdditionalTree(thirdCat._id, 'ThirdCategory')
      })))

      return { ...subCat, thirdCategories: thirdCategoriesWithChildren }
    }))

    return { ...mainCat, subCategories: subCategoriesWithChildren }
  }))

  return result
}

const getBirthdayPackagesByCity = async () => {
  const Product = require('../models/product-model')
  const ThirdCategory = require('../models/third-category-model')

  const birthdayCategories = await ThirdCategory.find({ name: { $regex: 'birthday', $options: 'i' } })
  const birthdayCategoryIds = birthdayCategories.map(c => c._id)

  const results = await Product.aggregate([
    { $match: { thirdCategory: { $in: birthdayCategoryIds } } },
    { $unwind: '$serviceableAreas' },
    {
      $group: {
        _id: '$serviceableAreas.city',
        products: { $push: '$$ROOT' }
      }
    },
    { $project: { _id: 0, city: '$_id', products: 1 } },
    { $sort: { city: 1 } }
  ])

  await Product.populate(results.flatMap(r => r.products), { path: 'thirdCategory' })

  return results
}

const getVenuesForUsers = async (page = 1, limit = 10, city = '', q = '') => {
  const Venue = require('../models/venue-model')
  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum

  const venueCityFilter = (raw) => buildVenueCityFilter(raw)

  const buildVenueTextSearchCondition = (rawQ) => {
    const text = typeof rawQ === 'string' ? rawQ.trim().slice(0, 200) : ''
    if (!text) return null
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return {
      $or: [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { typesOfVenues: { $regex: escaped, $options: 'i' } },
        { facilities: { $regex: escaped, $options: 'i' } },
        { 'location.address': { $regex: escaped, $options: 'i' } },
        { 'location.city': { $regex: escaped, $options: 'i' } }
      ]
    }
  }

  const parts = []
  const cityFilter = venueCityFilter(city)
  if (Object.keys(cityFilter).length) parts.push(cityFilter)
  const textCond = buildVenueTextSearchCondition(q)
  if (textCond) parts.push(textCond)

  const filter = parts.length === 0 ? {} : parts.length === 1 ? parts[0] : { $and: parts }

  const venues = await Venue.find(filter)
    .select('name description images typesOfVenues facilities startingPrice location createdAt')
    .skip(skip)
    .limit(limitNum)
    .sort({ createdAt: -1 })
  const total = await Venue.countDocuments(filter)

  return {
    venues,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      totalVenues: total,
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    }
  }
}

const getVenueDetails = async (venueId) => {
  const Venue = require('../models/venue-model')
  const VenueReview = require('../models/venue-review-model')
  const venue = await Venue.findById(venueId)
  if (!venue) throw new Error('Venue not found')
  const reviews = await VenueReview.find({ venue: venueId })
    .populate('user', 'fullName')
    .sort({ createdAt: -1 })
  return { venue, reviews }
}

const raiseInquiry = async (inquiryData) => {
  const Inquiry = require('../models/inquiry-model')
  const Venue = require('../models/venue-model')
  const { sendInquiryNotification } = require('../utils/email-service')
  const {
    fullName: fn,
    mobileNo: mob,
    eventType: et,
    startDate: sd,
    endDate: ed,
    startTime: st,
    endTime: en,
    guests: g,
    requirements: req,
    venue: v
  } = inquiryData

  const fullName = String(fn ?? '').trim()
  const mobileNo = String(mob ?? '').trim()
  const eventType = String(et ?? '').trim()
  const startTime = String(st ?? '').trim()
  const endTime = String(en ?? '').trim()
  const guests = Number(g)
  const requirements = req != null && String(req).trim() !== '' ? String(req).trim().slice(0, 1000) : undefined
  const startDate = new Date(sd)
  const endDate = new Date(ed)
  const venue = v != null && String(v).trim() !== '' ? String(v).trim() : undefined

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error('Invalid start or end date')
  }
  if (Number.isNaN(guests) || guests < 1) {
    throw new Error('Guests must be a positive number')
  }

  const inquiry = new Inquiry({
    fullName,
    mobileNo,
    eventType,
    startDate,
    endDate,
    startTime,
    endTime,
    guests,
    requirements,
    venue
  })
  await inquiry.save()

  // notify all super admins via email (fire and forget)
  const populatedInquiry = await inquiry.populate('venue', 'name location description')
  sendInquiryNotification(populatedInquiry).catch(err =>
    console.error('Failed to send inquiry notification:', err.message)
  )

  return inquiry
}

const getPublishedBlogs = async (page = 1, limit = 10, category, city = '', q = '') => {
  const Blog = require('../models/blog-model')
  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum

  const query = { published: true }
  if (category) query.category = category

  const blogCityFilter = (raw) => buildBlogCityFilter(raw)

  const buildBlogTextSearchCondition = (rawQ) => {
    const text = typeof rawQ === 'string' ? rawQ.trim().slice(0, 200) : ''
    if (!text) return null
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return {
      $or: [
        { title: { $regex: escaped, $options: 'i' } },
        { excerpt: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
        { tags: { $regex: escaped, $options: 'i' } }
      ]
    }
  }

  const parts = [{ ...query }]
  const cityFilter = blogCityFilter(city)
  if (Object.keys(cityFilter).length) parts.push(cityFilter)
  const textCond = buildBlogTextSearchCondition(q)
  if (textCond) parts.push(textCond)

  const filter = parts.length === 1 ? query : { $and: parts }

  const blogs = await Blog.find(filter)
    .select('-content')
    .populate('author', 'fullName')
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limitNum)

  const total = await Blog.countDocuments(filter)

  return {
    blogs,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      totalBlogs: total,
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    }
  }
}

const getBlogBySlug = async (slug) => {
  const Blog = require('../models/blog-model')
  const blog = await Blog.findOneAndUpdate(
    { slug, published: true },
    { $inc: { views: 1 } },
    { new: true }
  ).populate('author', 'fullName')

  if (!blog) throw new Error('Blog not found')
  return blog
}

const submitContact = async (contactData) => {
  const Contact = require('../models/contact-model')
  const { sendContactNotification } = require('../utils/email-service')

  const { name, phone, serviceType, email, message } = contactData

  const contact = new Contact({ name, phone, serviceType, email, message })
  await contact.save()

  sendContactNotification(contact).catch(err =>
    console.error('Failed to send contact notification:', err.message)
  )

  return contact
}

const getSimilarProducts = async (productId, limit = 8, city = '') => {
  const Product = require('../models/product-model')
  const mainCategory = require("../models/main-category-model")
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')
  const AddOn = require("../models/addon-model")
  const product = await Product.findById(productId).select('thirdCategory serviceableAreas')
  if (!product) throw new Error('Product not found')

  const cities = (product.serviceableAreas || []).map(a => a.city).filter(Boolean)

  const similarQuery = {
    _id: { $ne: product._id },
    thirdCategory: product.thirdCategory,
  }

  // When the visitor has explicitly chosen a city, restrict the similar list
  // to products that serve that city; otherwise keep the legacy behaviour
  // of matching any city the source product itself serves.
  const userCityFilter = buildCityFilter(city)
  if (userCityFilter && Object.keys(userCityFilter).length) {
    Object.assign(similarQuery, userCityFilter)
  } else if (cities.length > 0) {
    similarQuery['serviceableAreas.city'] = { $in: cities }
  }

  const similar = await Product.find(similarQuery)
    .limit(limit)
    .sort({ isFeatured: -1, createdAt: -1 })
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate({ path: 'customizationSections.addons.addon' })
    .populate('addedBy', 'fullName email')

  return similar
}

const editReview = async (userId, reviewId, reviewText, rating) => {
  const Review = require('../models/review-model')
  const mongoose = require('mongoose')
  if (!mongoose.Types.ObjectId.isValid(reviewId)) throw new Error('Invalid review ID')
  const review = await Review.findById(reviewId)
  if (!review) throw new Error('Review not found')
  if (review.user.toString() !== userId.toString()) throw new Error('Unauthorized')

  const update = {}
  if (reviewText) update.reviewText = reviewText
  if (rating !== undefined) {
    const parsed = Number(rating)
    if (parsed < 1 || parsed > 5) throw new Error('Rating must be between 1 and 5')
    update.rating = parsed
  }

  if (Object.keys(update).length === 0) throw new Error('Provide reviewText or rating to update')
  return await Review.findByIdAndUpdate(reviewId, { $set: update }, { new: true })
}

const deleteReview = async (userId, reviewId) => {
  const Review = require('../models/review-model')
  const Product = require('../models/product-model')
  const mongoose = require('mongoose')
  if (!mongoose.Types.ObjectId.isValid(reviewId)) throw new Error('Invalid review ID')
  const review = await Review.findById(reviewId)
  if (!review) throw new Error('Review not found')
  if (review.user.toString() !== userId.toString()) throw new Error('Unauthorized')
  await Review.findByIdAndDelete(reviewId)
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(review.product) } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, numReviews: { $sum: 1 } } }
  ])
  await Product.findByIdAndUpdate(review.product, {
    averageRating: stats.length > 0 ? stats[0].avgRating : 0,
    numReviews: stats.length > 0 ? stats[0].numReviews : 0
  })
}

const editVenueReview = async (userId, reviewId, reviewText, rating) => {
  const VenueReview = require('../models/venue-review-model')
  const mongoose = require('mongoose')
  if (!mongoose.Types.ObjectId.isValid(reviewId)) throw new Error('Invalid review ID')
  const review = await VenueReview.findById(reviewId)
  if (!review) throw new Error('Review not found')
  if (review.user.toString() !== userId.toString()) throw new Error('Unauthorized')

  const update = {}
  if (reviewText) update.reviewText = reviewText
  if (rating !== undefined) {
    const parsed = Number(rating)
    if (parsed < 1 || parsed > 5) throw new Error('Rating must be between 1 and 5')
    update.rating = parsed
  }

  if (Object.keys(update).length === 0) throw new Error('Provide reviewText or rating to update')
  return await VenueReview.findByIdAndUpdate(reviewId, { $set: update }, { new: true })
}

const deleteVenueReview = async (userId, reviewId) => {
  const VenueReview = require('../models/venue-review-model')
  const mongoose = require('mongoose')
  if (!mongoose.Types.ObjectId.isValid(reviewId)) throw new Error('Invalid review ID')
  const review = await VenueReview.findById(reviewId)
  if (!review) throw new Error('Review not found')
  if (review.user.toString() !== userId.toString()) throw new Error('Unauthorized')
  await VenueReview.findByIdAndDelete(reviewId)
}

const getSubCategoryPage = async (subCategoryName, city = '') => {
  const { findCategoryByNameOrSlug } = require('../utils/categoryNameLookup')
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const HeroBanner = require('../models/hero-banner-model')
  const Product = require('../models/product-model')
  const AdditionalCategory = require('../models/additional-category-model')
  const AddOn = require('../models/addon-model')
  const subCat = await findCategoryByNameOrSlug(SubCategory, subCategoryName)
  if (!subCat) throw new Error(`Sub category '${subCategoryName}' not found`)

  const heroBanner = await HeroBanner.findOne({ subCategory: subCat._id, isActive: true })
    .sort({ createdAt: -1 })
    .select('image')

  const thirdCategories = await ThirdCategory.find({ subCategory: subCat._id })
    .select('name description bannerImage')
    .lean()

  const thirdCategoryIds = thirdCategories.map(t => t._id)

  const populate = (q) => q
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate({ path: 'customizationSections.addons.addon' })
    .populate('addedBy')

  const baseQuery = { thirdCategory: { $in: thirdCategoryIds }, ...buildCityFilter(city) }

  const [featuredAndPremium, featuredOnly, premiumOnly, standard] = await Promise.all([
    populate(Product.find({ ...baseQuery, isFeatured: true, tier: 'premium' }).sort({ createdAt: -1 })),
    populate(Product.find({ ...baseQuery, isFeatured: true, tier: 'standard' }).sort({ createdAt: -1 })),
    populate(Product.find({ ...baseQuery, isFeatured: false, tier: 'premium' }).sort({ createdAt: -1 })),
    populate(Product.find({ ...baseQuery, isFeatured: false, tier: 'standard' }).sort({ createdAt: -1 }))
  ])

  const products = [...featuredAndPremium, ...featuredOnly, ...premiumOnly, ...standard]

  return {
    subCategory: { _id: subCat._id, name: subCat.name, description: subCat.description, bannerImage: subCat.bannerImage },
    heroBanner: heroBanner ? heroBanner.image : null,
    thirdCategories,
    products
  }
}

module.exports = {getProfileService, sendUserOTP, verifyUserOTP, sendPasswordResetOTP, resetPassword, sendPhoneOTP, verifyPhoneLogin, loginUser, getProducts, getFeaturedProducts, getPremiumProducts, getProductsByThirdCategory, getFilteredProducts, getSearchSuggestions, getProductDetails, syncCheckoutCart, addToCart, removeFromCart, getCart, getWishlist, addToWishlist, removeFromWishlist, checkPincode, getProductsByCity, refreshAccessToken, logoutUser, getBirthdayPackagesByCity, getAllMainCategories, trackProductInterest, raiseInquiry, submitContact, getVenuesForUsers, getVenueDetails, createReview, createVenueReview, editReview, deleteReview, editVenueReview, deleteVenueReview, getSimilarProducts, getPublishedBlogs, getBlogBySlug, getSubCategoryPage }

