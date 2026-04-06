const express = require('express')
const superAdminController = require('../controllers/super-admin-controller')
const { isSuperAdmin } = require('../middleware/auth')
const upload = require('../../configuration/multer-config')
const router = express.Router()
//send otp for registration
router.post('/send-otp', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Super admin creation only allowed in development environment' })
  }
  superAdminController.sendOTP(req, res)
})
//verify otp for registration
router.post('/verify-otp', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Super admin creation only allowed in development environment' })
  }
  superAdminController.verifyOTP(req, res)
})
//send otp for reset password
router.post('/forgot-password', superAdminController.sendResetOTP)
//verify otp for reset password
router.post('/reset-password', superAdminController.verifyResetPassword)
//send phone otp for registration (dev only)
router.post('/send-phone-otp', superAdminController.sendPhoneOTP)
//verify phone otp for registration (dev only)
router.post('/verify-phone-login', superAdminController.verifyPhoneLogin)
//login super admin
router.post('/login', superAdminController.login)
//get pending admins list
router.get("/pending-admins", isSuperAdmin, superAdminController.getPendingAdminRequests)
//get all admins
router.get("/admins", isSuperAdmin, superAdminController.getAdmins)
//approve admins
router.post("/approve-admin/:adminId", isSuperAdmin, superAdminController.approveAdminRequest)
//reject admins
router.post("/reject-admin/:adminId", isSuperAdmin, superAdminController.rejectAdminRequest)
//get all products
router.get("/products", isSuperAdmin, superAdminController.getProducts)
//edit product
router.put("/edit-product/:productId", isSuperAdmin, upload.array('images', 10), superAdminController.updateProduct)
//delete product
router.delete("/delete-product/:productId", isSuperAdmin, superAdminController.removeProduct)
//get all venues
router.get("/venues", isSuperAdmin, superAdminController.getVenues)
//edit venue
router.put("/edit-venue/:venueId", isSuperAdmin, upload.array('images', 10), superAdminController.editVenue)
//delete venue
router.delete("/delete-venue/:venueId", isSuperAdmin, superAdminController.deleteVenue)
//get all inquiries
router.get("/inquiries", isSuperAdmin, superAdminController.getInquiries)
//logout super admin
router.get("/logout", isSuperAdmin, superAdminController.logout)

module.exports = router