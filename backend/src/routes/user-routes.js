const express = require('express')
const { isLoggedIn } = require('../middleware/auth')
const userController = require('../controllers/user-controller')
const paymentController = require('../controllers/payment-controller')
const { wrapUpload } = require('../middleware/multer-upload-error')
const upload = require('../../configuration/multer-config')
const router = express.Router()
//registration otp
router.post('/send-otp', userController.sendOTP)
//otp verification
router.post('/verify-otp', userController.verifyOTP)
//mobile login
router.post('/send-phone-otp', userController.sendPhoneOTP)
//mobile login
router.post('/verify-phone-login', userController.verifyPhoneLogin)
//forgot password otp 
router.post('/forgot-password', userController.sendResetOTP)
//forgot password otp verification
router.post('/reset-password', userController.verifyResetPassword)
//login
router.post('/login', userController.login)
//home page with featured and/or premium products 
router.get('/home', userController.home)
//featured products 
router.get('/featured', userController.featuredProducts)
//premium products
router.get('/premium', userController.premiumProducts)
//category wise products
router.get('/category/:categoryName', userController.getProductsByCategory)
//sub category page with hero banner and third categories
router.get('/subcategory/:subCategory', userController.getSubCategoryPage)
//filtered products with query parameters
router.get('/filter', userController.getFilteredProducts)
//product details by ID
router.get('/product/:productId', userController.getProductDetails)
//similar products by third category and city
router.get('/product/:productId/similar', userController.getSimilarProducts)
//district of provided pincode
router.get('/check/:pincode', userController.checkPincodeDistrict)
//all products in a city 
router.get('/products/:city', userController.getProductsByCity)
//logout user
router.get('/logout', isLoggedIn, userController.logout)
//get cart
router.get('/cart', isLoggedIn, userController.getCart)
//add to cart
router.post('/add-to-cart', isLoggedIn, userController.addToCart)
//remove from cart
router.delete('/remove-from-cart', isLoggedIn, userController.removeFromCart)
//get wishlist
router.get('/wishlist', isLoggedIn, userController.getWishlist)
//add to wishlist
router.post('/add-to-wishlist', isLoggedIn, userController.addToWishlist)
//remove from wishlist
router.delete('/remove-from-wishlist', isLoggedIn, userController.removeFromWishlist)
// single venue (must be before /get-venues to avoid param capturing "get-venues" as id — not an issue; order is for clarity)
router.get('/get-venues/:venueId', userController.getVenueById)
//get venues
router.get('/get-venues', userController.getVenues)
//get single venue details
router.get('/venue/:venueId', userController.getVenueDetails)
//raise an enquiry
router.post('/raise-inquiry', userController.raiseInquiry)
//contact form
router.post('/contact', userController.submitContact)
//track product interest
router.post('/track-interest/:productId', isLoggedIn, userController.trackInterest)
//all main categories
router.get('/main-categories', userController.getAllMainCategories)
//birthday packages grouped by city
router.get('/birthday-packages-by-city', userController.getBirthdayPackagesByCity)
//write review
router.post('/write-review', isLoggedIn, upload.array('images', 5), userController.writeReview)
//write venue review
router.post('/venue/:venueId/review', isLoggedIn, wrapUpload(upload.array('images', 5)), userController.writeVenueReview)
//edit venue review
router.put('/venue-review/:reviewId', isLoggedIn, userController.editVenueReview)
//delete venue review
router.delete('/venue-review/:reviewId', isLoggedIn, userController.deleteVenueReview)
//edit product review
router.put('/review/:reviewId', isLoggedIn, userController.editReview)
//delete product review
router.delete('/review/:reviewId', isLoggedIn, userController.deleteReview)
//get profile
router.get('/profile', isLoggedIn, userController.getProfile)
//get all published blogs
router.get('/blogs', userController.getPublishedBlogs)
//get single blog by slug (increments views)
router.get('/blogs/:slug', userController.getBlogBySlug)
//payment routes
router.post('/create-order', isLoggedIn, paymentController.createOrderController)
router.post('/verify-payment', isLoggedIn, paymentController.verifyPaymentController)
router.get('/orders', isLoggedIn, paymentController.getOrderHistoryController)
router.get('/order/:orderId', isLoggedIn, paymentController.getOrderDetailsController)
module.exports = router