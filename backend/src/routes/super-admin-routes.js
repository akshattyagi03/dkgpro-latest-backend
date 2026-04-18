const express = require('express')
const superAdminController = require('../controllers/super-admin-controller')
const { isSuperAdmin } = require('../middleware/auth')
const { wrapUpload } = require('../middleware/multer-upload-error')
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
//filter products
router.get("/products/filter", isSuperAdmin, superAdminController.filterProducts)
//edit product
router.put("/edit-product/:productId", isSuperAdmin, wrapUpload(upload.array('images', 10)), superAdminController.updateProduct)
//delete product
router.delete("/delete-product/:productId", isSuperAdmin, superAdminController.removeProduct)
//get all venues
router.get("/venues", isSuperAdmin, superAdminController.getVenues)
//edit venue
router.put("/edit-venue/:venueId", isSuperAdmin, wrapUpload(upload.array('images', 10)), superAdminController.editVenue)
//delete venue
router.delete("/delete-venue/:venueId", isSuperAdmin, superAdminController.deleteVenue)
//get all inquiries
router.get("/inquiries", isSuperAdmin, superAdminController.getInquiries)
//orders (platform-wide, read-only list/detail)
router.get("/orders", isSuperAdmin, superAdminController.getOrders)
router.get("/orders/:orderId", isSuperAdmin, superAdminController.getOrderById)
//blog management
router.get("/blogs", isSuperAdmin, superAdminController.getBlogs)
router.get("/blogs/:blogId", isSuperAdmin, superAdminController.getBlogById)
router.put("/blogs/:blogId", isSuperAdmin, wrapUpload(upload.single('featuredImage')), superAdminController.editBlog)
router.delete("/blogs/:blogId", isSuperAdmin, superAdminController.deleteBlog)
//logout super admin
router.get("/logout", isSuperAdmin, superAdminController.logout)
//get category tree
router.get("/category-tree", isSuperAdmin, superAdminController.getCategoryTree)
//main category
router.put("/main-category/:id", isSuperAdmin, superAdminController.updateMainCategory)
router.delete("/main-category/:id", isSuperAdmin, superAdminController.deleteMainCategory)
//sub category
router.put("/sub-category/:id", isSuperAdmin, wrapUpload(upload.single('bannerImage')), superAdminController.updateSubCategory)
router.delete("/sub-category/:id", isSuperAdmin, superAdminController.deleteSubCategory)
//third category
router.put("/third-category/:id", isSuperAdmin, wrapUpload(upload.single('bannerImage')), superAdminController.updateThirdCategory)
router.delete("/third-category/:id", isSuperAdmin, superAdminController.deleteThirdCategory)
//additional category
router.put("/additional-category/:id", isSuperAdmin, wrapUpload(upload.single('bannerImage')), superAdminController.updateAdditionalCategory)
router.delete("/additional-category/:id", isSuperAdmin, superAdminController.deleteAdditionalCategory)
// Same payload as POST /admins/add-hero-section-banner — multipart `image` + subCategory XOR thirdCategory (names).
router.post("/add-hero-section-banner", isSuperAdmin, wrapUpload(upload.single('image')), superAdminController.addHeroSectionBanner)
// Home page product rows (optional overrides per slug — see home-sections-service DEFAULT_SECTIONS)
router.get("/home-product-sections", isSuperAdmin, superAdminController.getHomeProductSections)
router.put("/home-product-sections/:slug", isSuperAdmin, superAdminController.putHomeProductSection)

module.exports = router