const express = require('express')
const { isLoggedIn } = require('../middleware/auth')
const userController = require('../controllers/user-controller')
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
//filtered products with query parameters
router.get('/filter', userController.getFilteredProducts)
//product details by ID
router.get('/product/:productId', userController.getProductDetails)
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
//all main categories
router.get('/main-categories', userController.getAllMainCategories)
//birthday packages grouped by city
router.get('/birthday-packages-by-city', userController.getBirthdayPackagesByCity)

module.exports = router