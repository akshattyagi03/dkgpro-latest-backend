const express = require('express')
const { isLoggedIn } = require('../middleware/auth')
const userController = require('../controllers/user-controller')
const router = express.Router()

router.post('/register', userController.register)
router.post('/login', userController.login)
router.get('/home', userController.home)
router.get('/check/:pincode', userController.checkPincodeDistrict)
router.get('/products/:city', userController.getProductsByCity)
router.get('/logout', isLoggedIn, userController.logout)

module.exports = router