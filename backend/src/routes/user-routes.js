const express = require('express')
const { isLoggedIn } = require('../middleware/auth')
const userController = require('../controllers/user-controller')
const router = express.Router()

router.post('/send-otp', userController.sendOTP)
router.post('/verify-otp', userController.verifyOTP)
router.post('/send-phone-otp', userController.sendPhoneOTP)
router.post('/verify-phone-login', userController.verifyPhoneLogin)
router.post('/forgot-password', userController.sendResetOTP)
router.post('/reset-password', userController.verifyResetPassword)
router.post('/login', userController.login)
router.get('/home', userController.home)
router.get('/check/:pincode', userController.checkPincodeDistrict)
router.get('/products/:city', userController.getProductsByCity)
router.get('/logout', isLoggedIn, userController.logout)

module.exports = router