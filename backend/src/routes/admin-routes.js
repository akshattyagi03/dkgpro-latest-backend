const express = require('express')
const adminController = require('../controllers/admin-controller')
const { isAdmin } = require('../middleware/auth')
const { wrapUpload } = require('../middleware/multer-upload-error')
const upload = require('../../configuration/multer-config')
const { uploadNoWatermark } = require('../../configuration/multer-config')
const router = express.Router()
//send otp for registration
router.post('/send-otp', adminController.sendOTP)
//verify otp for verification
router.post('/verify-otp', adminController.verifyOTP)
//send otp to reset password
router.post('/forgot-password', adminController.sendResetOTP)
//verify otp and reset password
router.post('/reset-password', adminController.verifyResetPassword)
//send phone otp for login/registration
router.post('/send-phone-otp', adminController.sendPhoneOTP)
//verify phone otp for login/registration
router.post('/verify-phone-login', adminController.verifyPhoneLogin)
//login admin
router.post('/login', adminController.login)
//home page for admin
router.get("/home", isAdmin, adminController.getHome)
//creating products
router.post("/addproducts", isAdmin, wrapUpload(upload.array('images', 10)), adminController.addProduct)
//get products
router.get("/products", isAdmin, adminController.getAdminProducts)
//put isFeatured property for product
router.put("/toggle-featured/:productId", isAdmin, adminController.toggleFeatured)
//toggle product tier between premium and standard
router.put("/toggle-tier/:productId", isAdmin, adminController.toggleTier)
//get categories
router.get("/categories", isAdmin, adminController.getAllCategories)
//get category tree with all categories and altCategories 
router.get("/category-tree", isAdmin, adminController.getCategoryTreeView)
//create new main category
router.post("/addcategory", isAdmin, adminController.createMainCategory)
//create new sub category
router.post("/addsubcategory", isAdmin, wrapUpload(upload.single('bannerImage')), adminController.createSubCategory)
//create new third category
router.post("/addthirdcategory", isAdmin, wrapUpload(upload.single('bannerImage')), adminController.createThirdCategory)
//create full category tree
router.post("/create-category-tree", isAdmin, adminController.createCategoryTree)
//create addon for products
router.post("/add-addon", isAdmin, wrapUpload(upload.single('image')), adminController.createAddon)
//search addons by text
router.get("/search-addons", isAdmin, adminController.searchAddons)
//create venue
router.post("/add-venue", isAdmin, wrapUpload(upload.array('images', 10)), adminController.createVenue)
//get venue
router.get("/venues", isAdmin, adminController.getAllVenues)
//create blog
router.post("/create-blog", isAdmin, wrapUpload(upload.single('featuredImage')), adminController.createNewBlog)
//get blogs
router.get("/blogs", isAdmin, adminController.getAdminBlogs)
//edit blogs
router.put("/edit-blog/:blogId", isAdmin, wrapUpload(upload.single('featuredImage')), adminController.updateBlog)
//delete blogs
router.delete("/delete-blog/:blogId", isAdmin, adminController.removeBlog)
//get all users, admins and super admins
router.get("/all-users", isAdmin, adminController.getAllUsers)
//get orders
router.get("/orders", isAdmin, adminController.getOrders)
//view invoice in browser
router.get("/orders/:orderId/invoice", isAdmin, adminController.viewInvoice)
//download invoice as PDF
router.get("/orders/:orderId/invoice/download", isAdmin, adminController.downloadInvoice)
//send invoice to customer via email and whatsapp
router.post("/orders/:orderId/invoice/send", isAdmin, adminController.sendInvoiceToCustomer)
//get single order (admin must sell at least one product in the order)
router.get("/orders/:orderId", isAdmin, adminController.getOrderById)
//update order status
router.put("/orders/:orderId/status", isAdmin, adminController.updateOrderStatus)
//get analytics
router.get("/analytics", isAdmin, adminController.getAnalytics)
// corporate event booking leads (from guest /corporate-events form)
router.get("/corporate-bookings", isAdmin, adminController.getCorporateBookings)
router.patch("/corporate-bookings/:contactId/status", isAdmin, adminController.updateCorporateBookingStatus)
// product-detail service pages (photography / catering / games / special effects)
router.get("/service-pages", isAdmin, adminController.listServicePages)
router.get("/service-pages/:serviceKey", isAdmin, adminController.getServicePageAdmin)
router.put(
  "/service-pages/:serviceKey",
  isAdmin,
  wrapUpload(upload.single('heroImage')),
  adminController.updateServicePage
)
router.post(
  "/service-pages/:serviceKey/items",
  isAdmin,
  wrapUpload(upload.single('image')),
  adminController.addServicePageItem
)
router.put(
  "/service-pages/:serviceKey/items/:itemId",
  isAdmin,
  wrapUpload(upload.single('image')),
  adminController.updateServicePageItem
)
router.delete(
  "/service-pages/:serviceKey/items/:itemId",
  isAdmin,
  adminController.deleteServicePageItem
)
//logout admin
router.get("/logout", isAdmin, adminController.logout)
//create additional category 
router.post("/create-additional-category", isAdmin, wrapUpload(uploadNoWatermark.single('bannerImage')), adminController.createAdditionalCategory)
//add hero section banner
router.post("/add-hero-section-banner", isAdmin, wrapUpload(upload.single('image')), adminController.addHeroBanner)
module.exports = router