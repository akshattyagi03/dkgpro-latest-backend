const express = require('express')
const { isLoggedIn } = require('../middleware/auth')
const userController = require('../controllers/user-controller')
const router = express.Router()
//registration otp
router.post('/send-otp', userController.sendOTP)
//otp verification
router.post('/verify-otp', userController.verifyOTP)
//mobile login(TBD)
router.post('/send-phone-otp', userController.sendPhoneOTP)
//mobile login(TBD)
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
//district of provided pincode
router.get('/check/:pincode', userController.checkPincodeDistrict)
//all products in a city 
router.get('/products/:city', userController.getProductsByCity)
//logout user
router.get('/logout', isLoggedIn, userController.logout)

module.exports = router