const User = require('../models/user-model')
const RefreshToken = require('../models/refresh-token-model')
const OTP = require('../models/otp-model')
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

const getProducts = async () => {
  const Product = require('../models/product-model')
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')
  const Addon = require('../models/addon-model')
  const HeroBanner = require('../models/hero-banner-model')

  const featuredProducts = await Product.find({ isFeatured: true })
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
    _id: { $nin: featuredIds }
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

  const allProducts = await Product.find({ _id: { $nin: excludeIds } })
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
    .populate('subCategory')
    .populate('addedBy', 'fullName email')
    .sort({ createdAt: -1 })

  return {
    heroBanners,
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
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')

  const Addon = require('../models/addon-model')

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

  res.cookie('accessToken', accessToken, { httpOnly: true, secure: false, maxAge: 15 * 60 * 1000 })
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 })

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

const getProductsByThirdCategory = async (categoryName, page = 1, limit = 10) => {
  const Product = require('../models/product-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const Addon = require('../models/addon-model')

  const thirdCategory = await ThirdCategory.findOne({ name: categoryName }).lean()
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
    .populate({ path: 'customizationSections.addons.addon' })
    .populate('addedBy')

  const total = await Product.countDocuments({ thirdCategory: thirdCategory._id })

  // fetch additional categories tree rooted at this thirdCategory
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

  const { category, tier, minPrice, maxPrice, city, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = filters

  const query = {}

  if (category) {
    const thirdCategory = await ThirdCategory.findOne({ name: category })
    if (thirdCategory) {
      query.thirdCategory = thirdCategory._id
    }
  }

  if (tier && ['standard', 'premium'].includes(tier)) {
    query.tier = tier
  }

  if (minPrice || maxPrice) {
    query.price = {}
    if (minPrice) query.price.$gte = parseInt(minPrice)
    if (maxPrice) query.price.$lte = parseInt(maxPrice)
  }

  if (city) {
    query['serviceableAreas.city'] = { $regex: city, $options: 'i' }
  }

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

const addToCart = async (userId, productId) => {
  const Cart = require('../models/cart-model')
  const Product = require('../models/product-model')
  const MainCategory = require("../models/main-category-model");
  const SubCategory = require("../models/sub-category-model");
  const ThirdCategory = require("../models/third-category-model");
  const product = await Product.findById(productId)
  if (!product) {
    throw new Error('Product not found')
  }

  let cart = await Cart.findOne({ user: userId })

  if (!cart) {
    cart = new Cart({ user: userId, items: [] })
  }

  const existingItem = cart.items.find(item => item.product.toString() === productId)

  if (existingItem) {
    existingItem.quantity += 1
  } else {
    cart.items.push({ product: productId, quantity: 1 })
  }

  cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  await cart.save()

  await cart.populate({
    path: 'items.product',
    populate: [
      { path: 'mainCategory' },
      { path: 'subCategory' },
      { path: 'thirdCategory' }
    ]
  })

  return cart
}

const removeFromCart = async (userId, productId) => {
  const Cart = require('../models/cart-model')

  const cart = await Cart.findOne({ user: userId })

  if (!cart) {
    throw new Error('Cart not found')
  }

  cart.items = cart.items.filter(item => item.product.toString() !== productId)
  cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  await cart.save()

  await cart.populate({
    path: 'items.product',
    populate: [
      { path: 'mainCategory' },
      { path: 'subCategory' },
      { path: 'thirdCategory' }
    ]
  })

  return cart
}

const getCart = async (userId) => {
  const Cart = require('../models/cart-model')
  const cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    populate: [
      { path: 'mainCategory' },
      { path: 'subCategory' },
      { path: 'thirdCategory' }
    ]
  })
  if (!cart) return { items: [], totalItems: 0 }
  return cart
}

const getWishlist = async (userId) => {
  const Wishlist = require('../models/wishlist-model')
  const wishlist = await Wishlist.findOne({ user: userId }).populate({
    path: 'products',
    populate: [
      { path: 'mainCategory' },
      { path: 'subCategory' },
      { path: 'thirdCategory' }
    ]
  })
  if (!wishlist) return { products: [], totalItems: 0 }
  return wishlist
}

const addToWishlist = async (userId, productId) => {
  const Wishlist = require('../models/wishlist-model')
  const Product = require('../models/product-model')

  const product = await Product.findById(productId)
  if (!product) {
    throw new Error('Product not found')
  }

  let wishlist = await Wishlist.findOne({ user: userId })

  if (!wishlist) {
    wishlist = new Wishlist({ user: userId, products: [] })
  }

  if (wishlist.products.includes(productId)) {
    throw new Error('Product already in wishlist')
  }

  wishlist.products.push(productId)
  wishlist.totalItems = wishlist.products.length
  await wishlist.save()

  await wishlist.populate({
    path: 'products',
    populate: [
      { path: 'mainCategory' },
      { path: 'subCategory' },
      { path: 'thirdCategory' }
    ]
  })

  return wishlist
}

const removeFromWishlist = async (userId, productId) => {
  const Wishlist = require('../models/wishlist-model')

  const wishlist = await Wishlist.findOne({ user: userId })

  if (!wishlist) {
    throw new Error('Wishlist not found')
  }

  wishlist.products = wishlist.products.filter(id => id.toString() !== productId)
  wishlist.totalItems = wishlist.products.length

  await wishlist.save()

  await wishlist.populate({
    path: 'products',
    populate: [
      { path: 'mainCategory' },
      { path: 'subCategory' },
      { path: 'thirdCategory' }
    ]
  })

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

const getVenuesForUsers = async (page = 1, limit = 10) => {
  const Venue = require('../models/venue-model')
  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum

  const venues = await Venue.find().select('name description images').skip(skip).limit(limitNum).sort({ createdAt: -1 })
  const total = await Venue.countDocuments()

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
  const { fullName, mobileNo, eventType, startDate, endDate, startTime, endTime, guests, requirements, venue } = inquiryData

  const inquiry = new Inquiry({ fullName, mobileNo, eventType, startDate, endDate, startTime, endTime, guests, requirements, venue })
  await inquiry.save()
  return inquiry
}

const getPublishedBlogs = async (page = 1, limit = 10, category) => {
  const Blog = require('../models/blog-model')
  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum

  const query = { published: true }
  if (category) query.category = category

  const blogs = await Blog.find(query)
    .select('-content')
    .populate('author', 'fullName')
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limitNum)

  const total = await Blog.countDocuments(query)

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

const getSimilarProducts = async (productId, limit = 8) => {
  const Product = require('../models/product-model')
  const mainCategory = require("../models/main-category-model")
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')
  const AddOn = require("../models/addon-model")
  const product = await Product.findById(productId).select('thirdCategory serviceableAreas')
  if (!product) throw new Error('Product not found')

  const cities = product.serviceableAreas.map(a => a.city)

  const similar = await Product.find({
    _id: { $ne: product._id },
    thirdCategory: product.thirdCategory,
    'serviceableAreas.city': { $in: cities }
  })
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

module.exports = {getProfileService, sendUserOTP, verifyUserOTP, sendPasswordResetOTP, resetPassword, sendPhoneOTP, verifyPhoneLogin, loginUser, getProducts, getFeaturedProducts, getPremiumProducts, getProductsByThirdCategory, getFilteredProducts, getProductDetails, addToCart, removeFromCart, getCart, getWishlist, addToWishlist, removeFromWishlist, checkPincode, getProductsByCity, refreshAccessToken, logoutUser, getBirthdayPackagesByCity, getAllMainCategories, trackProductInterest, raiseInquiry, getVenuesForUsers, getVenueDetails, createReview, createVenueReview, editReview, deleteReview, editVenueReview, deleteVenueReview, getSimilarProducts, getPublishedBlogs, getBlogBySlug }

