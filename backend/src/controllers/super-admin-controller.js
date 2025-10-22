const { 
  registerSuperAdmin, 
  loginSuperAdmin, 
  getPendingAdmins, 
  approveAdmin, 
  rejectAdmin, 
  getAllProducts, 
  editProduct, 
  deleteProduct,
  logoutSuperAdmin
} = require('../services/super-admin-services')

const register = async (req, res) => {
  try {
    const result = await registerSuperAdmin(req.body, res)
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

module.exports = {
  register,
  login,
  getPendingAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  getProducts,
  updateProduct,
  removeProduct,
  logout
}