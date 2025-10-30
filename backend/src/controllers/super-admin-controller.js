const { 
  sendSuperAdminOTP, 
  verifySuperAdminOTP, 
  sendSuperAdminPasswordResetOTP,
  resetSuperAdminPassword,
  loginSuperAdmin, 
  getPendingAdmins, 
  approveAdmin, 
  rejectAdmin, 
  getAllProducts, 
  editProduct, 
  deleteProduct,
  getAllVenues,
  updateVenue,
  removeVenue,
  getAllAdmins,
  logoutSuperAdmin
} = require('../services/super-admin-services')

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
    const products = await getAllProducts()
    res.status(200).json({ products })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const updateProduct = async (req, res) => {
  try {
    const product = await editProduct(req.params.productId, req.body)
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
    const venues = await getAllVenues()
    res.status(200).json({ venues })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const editVenue = async (req, res) => {
  try {
    const venue = await updateVenue(req.params.venueId, req.body)
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

module.exports = {
  sendOTP,
  verifyOTP,
  sendResetOTP,
  verifyResetPassword,
  login,
  getPendingAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  getProducts,
  updateProduct,
  removeProduct,
  getVenues,
  editVenue,
  deleteVenue,
  getAdmins,
  logout
}