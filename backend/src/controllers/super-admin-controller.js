const { 
  sendSuperAdminOTP, 
  verifySuperAdminOTP, 
  sendSuperAdminPasswordResetOTP,
  resetSuperAdminPassword,
  sendSuperAdminPhoneOTP,
  verifySuperAdminPhoneLogin,
  loginSuperAdmin, 
  getPendingAdmins, 
  approveAdmin, 
  rejectAdmin, 
  getAllProducts, 
  filterProducts,
  editProduct, 
  deleteProduct,
  getAllVenues,
  updateVenue,
  removeVenue,
  getAllAdmins,
  getAllInquiries,
  logoutSuperAdmin
} = require('../services/super-admin-services')

const {
  getCategoryTree,
  addMainCategory,
  addSubCategory,
  addThirdCategory,
  addAdditionalCategory
} = require('../services/admin-services')

const multerUpload = require('../../configuration/multer-config')

const sendOTP = async (req, res) => {
  try {
    const result = await sendSuperAdminOTP(req.body)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const verifyOTP = async (req, res) => {
  try {
    const result = await verifySuperAdminOTP(req.body, res)
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const login = async (req, res) => {
  try {
    const result = await loginSuperAdmin(req.body, res)
    res.json(result)
  } catch (error) {
    res.status(401).json({ message: error.message })
  }
}

const getPendingAdminRequests = async (req, res) => {
  try {
    const admins = await getPendingAdmins()
    res.status(200).json({ pendingAdmins: admins })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const approveAdminRequest = async (req, res) => {
  try {
    const admin = await approveAdmin(req.params.adminId)
    res.status(200).json({ message: 'Admin approved successfully', admin })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const rejectAdminRequest = async (req, res) => {
  try {
    await rejectAdmin(req.params.adminId)
    res.status(200).json({ message: 'Admin rejected and removed' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getProducts = async (req, res) => {
  try {
    const result = await getAllProducts(req.query.page, req.query.limit)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const filterProductsController = async (req, res) => {
  try {
    const result = await filterProducts(req.query)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const updateProduct = async (req, res) => {
  try {
    const images =
      req.files && req.files.length > 0
        ? req.files.map((f) => multerUpload.getStoredFileUrl(f))
        : undefined
    const body = { ...req.body }
    if (images) body.images = images
    // parse JSON strings from form-data
    const parseField = (key) => {
      if (typeof body[key] === 'string') {
        try { body[key] = JSON.parse(body[key]) } catch { /* keep as-is */ }
      }
    }
    parseField('serviceableAreas')
    parseField('customizationSections')
    parseField('additionalCategories')
    parseField('inclusions')
    parseField('experiences')
    parseField('keyHighlights')
    parseField('tags')
    const product = await editProduct(req.params.productId, body)
    res.status(200).json({ message: 'Product updated successfully', product })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const removeProduct = async (req, res) => {
  try {
    await deleteProduct(req.params.productId)
    res.status(200).json({ message: 'Product deleted successfully' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.superAdminRefreshToken
    await logoutSuperAdmin(refreshToken)
    
    res.clearCookie('superAdminAccessToken')
    res.clearCookie('superAdminRefreshToken')
    res.status(200).json({message: "You are logged out."})
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getVenues = async (req, res) => {
  try {
    const result = await getAllVenues(req.query.page, req.query.limit)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const editVenue = async (req, res) => {
  try {
    const images =
      req.files && req.files.length > 0
        ? req.files.map((f) => multerUpload.getStoredFileUrl(f))
        : undefined
    const updateData = images ? { ...req.body, images } : req.body
    const venue = await updateVenue(req.params.venueId, updateData)
    res.status(200).json({ message: 'Venue updated successfully', venue })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const deleteVenue = async (req, res) => {
  try {
    await removeVenue(req.params.venueId)
    res.status(200).json({ message: 'Venue deleted successfully' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getAdmins = async (req, res) => {
  try {
    const admins = await getAllAdmins()
    res.status(200).json({ admins })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const sendPhoneOTP = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Super admin creation only allowed in development environment' })
  }
  try {
    const result = await sendSuperAdminPhoneOTP(req.body)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const verifyPhoneLogin = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Super admin creation only allowed in development environment' })
  }
  try {
    const result = await verifySuperAdminPhoneLogin(req.body, res)
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const sendResetOTP = async (req, res) => {
  try {
    const result = await sendSuperAdminPasswordResetOTP(req.body)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const verifyResetPassword = async (req, res) => {
  try {
    const result = await resetSuperAdminPassword(req.body)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getInquiries = async (req, res) => {
  try {
    const inquiries = await getAllInquiries()
    res.status(200).json({ inquiries })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// ── Category Management ──

const getCategoryTreeView = async (req, res) => {
  try {
    const categoryTree = await getCategoryTree()
    res.status(200).json({ categoryTree })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const updateMainCategory = async (req, res) => {
  try {
    const MainCategory = require('../models/main-category-model')
    const { name } = req.body
    if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' })
    const category = await MainCategory.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true }
    )
    if (!category) return res.status(404).json({ message: 'Main category not found' })
    res.status(200).json({ message: 'Main category updated', category })
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'A category with this name already exists' })
    res.status(400).json({ message: error.message })
  }
}

const deleteMainCategory = async (req, res) => {
  try {
    const MainCategory = require('../models/main-category-model')
    const category = await MainCategory.findByIdAndDelete(req.params.id)
    if (!category) return res.status(404).json({ message: 'Main category not found' })
    res.status(200).json({ message: 'Main category deleted' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const updateSubCategory = async (req, res) => {
  try {
    const SubCategory = require('../models/sub-category-model')
    const bannerImage = req.file ? multerUpload.getStoredFileUrl(req.file) : undefined
    const updateData = { ...req.body }
    if (bannerImage) updateData.bannerImage = bannerImage
    const category = await SubCategory.findByIdAndUpdate(
      req.params.id, updateData, { new: true }
    )
    if (!category) return res.status(404).json({ message: 'Sub category not found' })
    res.status(200).json({ message: 'Sub category updated', category })
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'A category with this name already exists' })
    res.status(400).json({ message: error.message })
  }
}

const deleteSubCategory = async (req, res) => {
  try {
    const SubCategory = require('../models/sub-category-model')
    const category = await SubCategory.findByIdAndDelete(req.params.id)
    if (!category) return res.status(404).json({ message: 'Sub category not found' })
    res.status(200).json({ message: 'Sub category deleted' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const updateThirdCategory = async (req, res) => {
  try {
    const ThirdCategory = require('../models/third-category-model')
    const bannerImage = req.file ? multerUpload.getStoredFileUrl(req.file) : undefined
    const updateData = { ...req.body }
    if (bannerImage) updateData.bannerImage = bannerImage
    const category = await ThirdCategory.findByIdAndUpdate(
      req.params.id, updateData, { new: true }
    )
    if (!category) return res.status(404).json({ message: 'Third category not found' })
    res.status(200).json({ message: 'Third category updated', category })
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'A category with this name already exists' })
    res.status(400).json({ message: error.message })
  }
}

const deleteThirdCategory = async (req, res) => {
  try {
    const ThirdCategory = require('../models/third-category-model')
    const category = await ThirdCategory.findByIdAndDelete(req.params.id)
    if (!category) return res.status(404).json({ message: 'Third category not found' })
    res.status(200).json({ message: 'Third category deleted' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const updateAdditionalCategory = async (req, res) => {
  try {
    const AdditionalCategory = require('../models/additional-category-model')
    const bannerImage = req.file ? multerUpload.getStoredFileUrl(req.file) : undefined
    const updateData = { ...req.body }
    if (bannerImage) updateData.bannerImage = bannerImage
    const category = await AdditionalCategory.findByIdAndUpdate(
      req.params.id, updateData, { new: true }
    )
    if (!category) return res.status(404).json({ message: 'Additional category not found' })
    res.status(200).json({ message: 'Additional category updated', category })
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'A category with this name already exists' })
    res.status(400).json({ message: error.message })
  }
}

const deleteAdditionalCategory = async (req, res) => {
  try {
    const AdditionalCategory = require('../models/additional-category-model')
    const category = await AdditionalCategory.findByIdAndDelete(req.params.id)
    if (!category) return res.status(404).json({ message: 'Additional category not found' })
    res.status(200).json({ message: 'Additional category deleted' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = {
  sendOTP,
  verifyOTP,
  sendResetOTP,
  verifyResetPassword,
  sendPhoneOTP,
  verifyPhoneLogin,
  login,
  getPendingAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  getProducts,
  filterProducts: filterProductsController,
  updateProduct,
  removeProduct,
  getVenues,
  editVenue,
  deleteVenue,
  getAdmins,
  getInquiries,
  logout,
  getCategoryTree: getCategoryTreeView,
  updateMainCategory,
  deleteMainCategory,
  updateSubCategory,
  deleteSubCategory,
  updateThirdCategory,
  deleteThirdCategory,
  updateAdditionalCategory,
  deleteAdditionalCategory
}