const reviewModel = require('../models/review-model')
const {
  sendUserOTP,
  verifyUserOTP,
  sendPasswordResetOTP,
  resetPassword,
  sendPhoneOTP,
  verifyPhoneLogin,
  loginUser,
  getProducts,
  getFeaturedProducts,
  getPremiumProducts,
  getProductsByThirdCategory,
  getFilteredProducts,
  getProductDetails,
  addToCart,
  removeFromCart,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkPincode,
  getProductsByCity,
  logoutUser,
  getCart,
  getBirthdayPackagesByCity,
  getAllMainCategories,
  trackProductInterest,
  raiseInquiry,
  getVenuesForUsers,
  getVenueDetails,
  createReview,
  createVenueReview,
  getProfileService,
  getSimilarProducts,
  getPublishedBlogs,
  getBlogBySlug
} = require('../services/user-services')
const { HTTP_STATUS } = require('../utils/constants')

const sendOTP = async (req, res) => {
  try {
    const result = await sendUserOTP(req.body)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const verifyOTP = async (req, res) => {
  try {
    const result = await verifyUserOTP(req.body, res)
    res.status(HTTP_STATUS.CREATED).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized'
      });
    }

    const data = await getProfileService(userId);

    res.status(200).json({
      message: 'Profile fetched successfully',
      data
    });

  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const result = await loginUser(req.body, res)
    res.json(result)
  } catch (error) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: error.message })
  }
}

const home = async (req, res) => {
  try {
    const homeData = await getProducts()
    res.status(HTTP_STATUS.OK).json(homeData)
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const checkPincodeDistrict = async (req, res) => {
  try {
    const result = await checkPincode(req.params.pincode)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: error.message })
  }
}

const getProductsByCityController = async (req, res) => {
  try {
    const { city } = req.params
    const { page, limit } = req.query
    const result = await getProductsByCity(city, page, limit)
    res.json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken
    await logoutUser(refreshToken)

    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')
    res.status(HTTP_STATUS.OK).json({ message: "You are logged out." })
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const sendResetOTP = async (req, res) => {
  try {
    const result = await sendPasswordResetOTP(req.body)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const verifyResetPassword = async (req, res) => {
  try {
    const result = await resetPassword(req.body)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const sendPhoneOTPController = async (req, res) => {
  try {
    const result = await sendPhoneOTP(req.body)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const verifyPhoneLoginController = async (req, res) => {
  try {
    const result = await verifyPhoneLogin(req.body, res)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const featuredProducts = async (req, res) => {
  try {
    const products = await getFeaturedProducts()
    res.status(HTTP_STATUS.OK).json({ products })
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const premiumProducts = async (req, res) => {
  try {
    const products = await getPremiumProducts()
    res.status(HTTP_STATUS.OK).json({ products })
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const getProductsByCategoryController = async (req, res) => {
  try {
    const { categoryName } = req.params
    const { page, limit } = req.query
    const result = await getProductsByThirdCategory(categoryName, page, limit)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const getFilteredProductsController = async (req, res) => {
  try {
    const result = await getFilteredProducts(req.query)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const getProductDetailsController = async (req, res) => {
  try {
    const product = await getProductDetails(req.params.productId)
    const reviews = await reviewModel.find({ product: req.params.productId })
      .populate('user', 'fullName')
      .sort({ createdAt: -1 })
    res.status(HTTP_STATUS.OK).json({ product, reviews })
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: error.message })
  }
}

const getCartController = async (req, res) => {
  try {
    const cart = await getCart(req.user._id)
    res.status(HTTP_STATUS.OK).json(cart)
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const addToCartController = async (req, res) => {
  try {
    const { productId } = req.query
    const cart = await addToCart(req.user._id, productId)
    res.status(HTTP_STATUS.OK).json({ message: 'Product added to cart', cart })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}
const writeReview = async (req, res) => {
  try {
    const { productId } = req.query;
    const { reviewText, rating } = req.body;
    const images = req.files ? req.files.map(f => f.path) : [];

    const review = await createReview(
      req.user._id,
      productId,
      reviewText,
      rating,
      images
    );

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Review submitted successfully',
      review
    });

  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error.message
    });
  }
};
const removeFromCartController = async (req, res) => {
  try {
    const { productId } = req.query
    const cart = await removeFromCart(req.user._id, productId)
    res.status(HTTP_STATUS.OK).json({ message: 'Product removed from cart', cart })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const getWishlistController = async (req, res) => {
  try {
    const wishlist = await getWishlist(req.user._id)
    res.status(HTTP_STATUS.OK).json(wishlist)
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const addToWishlistController = async (req, res) => {
  try {
    const { productId } = req.query
    const wishlist = await addToWishlist(req.user._id, productId)
    res.status(HTTP_STATUS.OK).json({ message: 'Product added to wishlist', wishlist })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const removeFromWishlistController = async (req, res) => {
  try {
    const { productId } = req.query
    const wishlist = await removeFromWishlist(req.user._id, productId)
    res.status(HTTP_STATUS.OK).json({ message: 'Product removed from wishlist', wishlist })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const getAllMainCategoriesController = async (req, res) => {
  try {
    const categories = await getAllMainCategories()
    res.status(HTTP_STATUS.OK).json(categories)
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const getBirthdayPackagesByCityController = async (req, res) => {
  try {
    const result = await getBirthdayPackagesByCity()
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const trackInterestController = async (req, res) => {
  try {
    await trackProductInterest(req.user._id, req.params.productId)
    res.status(HTTP_STATUS.OK).json({ message: 'Interest tracked' })
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const getVenuesController = async (req, res) => {
  try {
    const { page, limit } = req.query
    const result = await getVenuesForUsers(page, limit)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const getVenueDetailsController = async (req, res) => {
  try {
    const venue = await getVenueDetails(req.params.venueId)
    res.status(HTTP_STATUS.OK).json(venue)
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: error.message })
  }
}

const writeVenueReview = async (req, res) => {
  try {
    const { reviewText, rating } = req.body
    const images = req.files ? req.files.map(file => file.path) : []
    const review = await createVenueReview(req.user._id, req.params.venueId, reviewText, rating, images)
    res.status(HTTP_STATUS.CREATED).json({ message: 'Review submitted successfully', review })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const raiseInquiryController = async (req, res) => {
  try {
    const inquiry = await raiseInquiry(req.body)
    res.status(HTTP_STATUS.CREATED).json({ message: 'Inquiry raised successfully', inquiry })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const getPublishedBlogsController = async (req, res) => {
  try {
    const { page, limit, category } = req.query
    const result = await getPublishedBlogs(page, limit, category)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const getBlogBySlugController = async (req, res) => {
  try {
    const blog = await getBlogBySlug(req.params.slug)
    res.status(HTTP_STATUS.OK).json(blog)
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: error.message })
  }
}

const getSimilarProductsController = async (req, res) => {
  try {
    const { productId } = req.params
    const { limit } = req.query
    const products = await getSimilarProducts(productId, limit)
    res.status(HTTP_STATUS.OK).json({ products })
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: error.message })
  }
}

module.exports = {
  sendOTP,
  verifyOTP,
  sendResetOTP,
  verifyResetPassword,
  sendPhoneOTP: sendPhoneOTPController,
  verifyPhoneLogin: verifyPhoneLoginController,
  login,
  home,
  featuredProducts,
  premiumProducts,
  getProductsByCategory: getProductsByCategoryController,
  getFilteredProducts: getFilteredProductsController,
  getProductDetails: getProductDetailsController,
  checkPincodeDistrict,
  getProductsByCity: getProductsByCityController,
  getCart: getCartController,
  addToCart: addToCartController,
  removeFromCart: removeFromCartController,
  getWishlist: getWishlistController,
  addToWishlist: addToWishlistController,
  removeFromWishlist: removeFromWishlistController,
  logout,
  getBirthdayPackagesByCity: getBirthdayPackagesByCityController,
  getAllMainCategories: getAllMainCategoriesController,
  trackInterest: trackInterestController,
  raiseInquiry: raiseInquiryController,
  getVenues: getVenuesController,
  getVenueDetails: getVenueDetailsController,
  writeVenueReview,
  writeReview,
  getProfile,
  getSimilarProducts: getSimilarProductsController,
  getPublishedBlogs: getPublishedBlogsController,
  getBlogBySlug: getBlogBySlugController
}