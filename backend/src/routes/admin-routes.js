const express = require('express')
const adminController = require('../controllers/admin-controller')
const { isAdmin } = require('../middleware/auth')
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
router.post("/addproducts", isAdmin, adminController.addProduct)
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
router.post("/addsubcategory", isAdmin, adminController.createSubCategory)
//create new third category
router.post("/addthirdcategory", isAdmin, adminController.createThirdCategory)
//create full category tree
router.post("/create-category-tree", isAdmin, adminController.createCategoryTree)
//create addon for products
router.post("/add-addon", isAdmin, adminController.createAddon)
//create recommended and engagement 
router.post("/add-customization-section", isAdmin, adminController.createCustomizationSection)
//get recommended and engagement
router.get("/customization-sections", isAdmin, adminController.getAllCustomizationSections)
//create venue
router.post("/add-venue", isAdmin, adminController.createVenue)
//get venue
router.get("/venues", isAdmin, adminController.getAllVenues)
//create blog
router.post("/create-blog", isAdmin, adminController.createNewBlog)
//get blogs
router.get("/blogs", isAdmin, adminController.getAdminBlogs)
//edit blogs
router.put("/edit-blog/:blogId", isAdmin, adminController.updateBlog)
//delete blogs
router.delete("/delete-blog/:blogId", isAdmin, adminController.removeBlog)
//logout admin
router.get("/logout", isAdmin, adminController.logout)
//create additional category 
router.post("/create-additional-category", isAdmin, adminController.createAdditionalCategory)
module.exports = router