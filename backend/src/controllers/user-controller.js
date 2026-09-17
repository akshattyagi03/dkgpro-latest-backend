const reviewModel = require('../models/review-model')
const multerUpload = require('../../configuration/multer-config')
const { isPincodeServiceableForProduct } = require('../services/pincode-services')
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
  getSearchSuggestions,
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
  submitContact,
  getVenuesForUsers,
  getVenueDetails,
  createReview,
  createVenueReview,
  editReview,
  deleteReview,
  editVenueReview,
  deleteVenueReview,
  getProfileService,
  getSubCategoryPage,
  getSimilarProducts,
  getPublishedBlogs,
  getBlogBySlug
} = require('../services/user-services')
const { getCorporatePage, submitCorporateBooking } = require('../services/corporate-page-service')
const { getServicePage } = require('../services/service-page-service')
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
    const city = typeof req.query.city === 'string' ? req.query.city : ''
    const homeData = await getProducts(city)
    res.status(HTTP_STATUS.OK).json(homeData)
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const checkPincodeDistrict = async (req, res) => {
  try {
    const pincode = String(req.params.pincode || '').trim()
    const result = await checkPincode(pincode)

    if (!result) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        serviceable: false,
        message: 'Pincode not found or could not be resolved',
      })
    }

    const { productId } = req.query
    let serviceable = true

    if (productId) {
      const Product = require('../models/product-model')
      const product = await Product.findById(productId).select('serviceableAreas')
      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Product not found' })
      }
      serviceable = isPincodeServiceableForProduct(result, product)
    }

    return res.status(HTTP_STATUS.OK).json({
      ...result,
      serviceable,
      district: result.district,
      city: result.city,
      state: result.state,
    })
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      serviceable: false,
      error: error.message,
    })
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
    const { page, limit, city } = req.query
    const result = await getProductsByThirdCategory(categoryName, page, limit, city)
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

const searchSuggestController = async (req, res) => {
  try {
    const { q, city, limit } = req.query
    const result = await getSearchSuggestions(q, city, limit)
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

const writeVenueReview = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { reviewText, rating } = req.body;
    const images = req.files
      ? req.files.map((f) => multerUpload.getStoredFileUrl(f))
      : [];

    const review = await createVenueReview(
      req.user._id,
      venueId,
      reviewText,
      Number(rating),
      images
    );

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Review submitted successfully',
      review
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
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
    const categoryTree = await getAllMainCategories()
    res.status(HTTP_STATUS.OK).json({ categoryTree })
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
    const { page, limit, city, q } = req.query
    const result = await getVenuesForUsers(page, limit, city, q)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

/** Plain venue document — matches GET /users/get-venues/:venueId (guest detail). */
const getVenueByIdController = async (req, res) => {
  try {
    const { venue } = await getVenueDetails(req.params.venueId)
    res.status(HTTP_STATUS.OK).json(venue)
  } catch (error) {
    const msg = error.message || 'Failed to load venue'
    if (msg === 'Venue not found') {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: msg })
      return
    }
    if (error.name === 'CastError') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Invalid venue id' })
      return
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: msg })
  }
}

/** Venue + populated reviews — GET /users/venue/:venueId */
const getVenueDetailsController = async (req, res) => {
  try {
    const result = await getVenueDetails(req.params.venueId)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    const msg = error.message || 'Failed to load venue'
    if (msg === 'Venue not found') {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: msg })
      return
    }
    if (error.name === 'CastError') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Invalid venue id' })
      return
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: msg })
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

const submitContactController = async (req, res) => {
  try {
    const contact = await submitContact(req.body)
    res.status(HTTP_STATUS.CREATED).json({ message: 'Message sent successfully', contact })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const getPublishedBlogsController = async (req, res) => {
  try {
    const { page, limit, category, city, q } = req.query
    const result = await getPublishedBlogs(page, limit, category, city, q)
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
    const { limit, city } = req.query
    const products = await getSimilarProducts(productId, limit, city)
    res.status(HTTP_STATUS.OK).json({ products })
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: error.message })
  }
}

const editReviewController = async (req, res) => {
  try {
    const { reviewText, rating } = req.body || {}
    const review = await editReview(req.user._id, req.params.reviewId, reviewText, rating)
    res.status(HTTP_STATUS.OK).json({ message: 'Review updated successfully', review })
  } catch (error) {
    const status = error.message === 'Unauthorized' ? HTTP_STATUS.FORBIDDEN : HTTP_STATUS.BAD_REQUEST
    res.status(status).json({ message: error.message })
  }
}

const deleteReviewController = async (req, res) => {
  try {
    await deleteReview(req.user._id, req.params.reviewId)
    res.status(HTTP_STATUS.OK).json({ message: 'Review deleted successfully' })
  } catch (error) {
    const status = error.message === 'Unauthorized' ? HTTP_STATUS.FORBIDDEN : HTTP_STATUS.BAD_REQUEST
    res.status(status).json({ message: error.message })
  }
}

const editVenueReviewController = async (req, res) => {
  try {
    const { reviewText, rating } = req.body || {}
    const review = await editVenueReview(req.user._id, req.params.reviewId, reviewText, rating)
    res.status(HTTP_STATUS.OK).json({ message: 'Venue review updated successfully', review })
  } catch (error) {
    const status = error.message === 'Unauthorized' ? HTTP_STATUS.FORBIDDEN : HTTP_STATUS.BAD_REQUEST
    res.status(status).json({ message: error.message })
  }
}

const deleteVenueReviewController = async (req, res) => {
  try {
    await deleteVenueReview(req.user._id, req.params.reviewId)
    res.status(HTTP_STATUS.OK).json({ message: 'Venue review deleted successfully' })
  } catch (error) {
    const status = error.message === 'Unauthorized' ? HTTP_STATUS.FORBIDDEN : HTTP_STATUS.BAD_REQUEST
    res.status(status).json({ message: error.message })
  }
}

const getSubCategoryPageController = async (req, res) => {
  try {
    const result = await getSubCategoryPage(req.params.subCategory, req.query.city)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: error.message })
  }
}

const getCorporatePageController = async (req, res) => {
  try {
    const result = await getCorporatePage()
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const submitCorporateBookingController = async (req, res) => {
  try {
    const contact = await submitCorporateBooking(req.body?.fields ?? req.body)
    res.status(HTTP_STATUS.CREATED).json({
      message: 'Booking request submitted successfully',
      contact,
    })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const getServicePageController = async (req, res) => {
  try {
    const result = await getServicePage(req.params.serviceKey)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    const msg = error.message || 'Failed to load service page'
    const status =
      msg === 'Invalid service page' || msg === 'Service page is not available'
        ? HTTP_STATUS.NOT_FOUND || 404
        : HTTP_STATUS.BAD_REQUEST
    res.status(status).json({ message: msg })
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
  getCorporatePage: getCorporatePageController,
  submitCorporateBooking: submitCorporateBookingController,
  getServicePage: getServicePageController,
  featuredProducts,
  premiumProducts,
  getProductsByCategory: getProductsByCategoryController,
  getFilteredProducts: getFilteredProductsController,
  searchSuggest: searchSuggestController,
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
  submitContact: submitContactController,
  getVenues: getVenuesController,
  getVenueById: getVenueByIdController,
  getVenueDetails: getVenueDetailsController,
  writeVenueReview,
  writeReview,
  editReview: editReviewController,
  deleteReview: deleteReviewController,
  editVenueReview: editVenueReviewController,
  deleteVenueReview: deleteVenueReviewController,
  getProfile,
  getSimilarProducts: getSimilarProductsController,
  getSubCategoryPage: getSubCategoryPageController,
  getPublishedBlogs: getPublishedBlogsController,
  getBlogBySlug: getBlogBySlugController
}