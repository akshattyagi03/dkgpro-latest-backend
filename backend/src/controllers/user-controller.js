const { 
  sendUserOTP, 
  verifyUserOTP, 
  sendPasswordResetOTP,
  resetPassword,
  sendPhoneOTP,
  verifyPhoneLogin,
  loginUser, 
  getProducts, 
  getFeaturedProducts,
  getPremiumProducts,
  getProductsByThirdCategory,
  getFilteredProducts,
  checkPincode, 
  getProductsByCity,
  logoutUser 
} = require('../services/user-services')
const { HTTP_STATUS } = require('../utils/constants')

const sendOTP = async (req, res) => {
  try {
    const result = await sendUserOTP(req.body)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const verifyOTP = async (req, res) => {
  try {
    const result = await verifyUserOTP(req.body, res)
    res.status(HTTP_STATUS.CREATED).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}



const login = async (req, res) => {
  try {
    const result = await loginUser(req.body, res)
    res.json(result)
  } catch (error) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: error.message })
  }
}

const home = async (req, res) => {
  try {
    const homeData = await getProducts()
    res.status(HTTP_STATUS.OK).json(homeData)
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const checkPincodeDistrict = async (req, res) => {
  try {
    const result = await checkPincode(req.params.pincode)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: error.message })
  }
}

const getProductsByCityController = async (req, res) => {
  try {
    const { city } = req.params
    const { page, limit } = req.query
    const result = await getProductsByCity(city, page, limit)
    res.json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken
    await logoutUser(refreshToken)
    
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')
    res.status(HTTP_STATUS.OK).json({ message: "You are logged out." })
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const sendResetOTP = async (req, res) => {
  try {
    const result = await sendPasswordResetOTP(req.body)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const verifyResetPassword = async (req, res) => {
  try {
    const result = await resetPassword(req.body)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const sendPhoneOTPController = async (req, res) => {
  try {
    const result = await sendPhoneOTP(req.body)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const verifyPhoneLoginController = async (req, res) => {
  try {
    const result = await verifyPhoneLogin(req.body, res)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const featuredProducts = async (req, res) => {
  try {
    const products = await getFeaturedProducts()
    res.status(HTTP_STATUS.OK).json({ products })
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const premiumProducts = async (req, res) => {
  try {
    const products = await getPremiumProducts()
    res.status(HTTP_STATUS.OK).json({ products })
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message })
  }
}

const getProductsByCategoryController = async (req, res) => {
  try {
    const { categoryName } = req.params
    const { page, limit } = req.query
    const result = await getProductsByThirdCategory(categoryName, page, limit)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

const getFilteredProductsController = async (req, res) => {
  try {
    const result = await getFilteredProducts(req.query)
    res.status(HTTP_STATUS.OK).json(result)
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message })
  }
}

module.exports = {
  sendOTP,
  verifyOTP,
  sendResetOTP,
  verifyResetPassword,
  sendPhoneOTP: sendPhoneOTPController,
  verifyPhoneLogin: verifyPhoneLoginController,
  login,
  home,
  featuredProducts,
  premiumProducts,
  getProductsByCategory: getProductsByCategoryController,
  getFilteredProducts: getFilteredProductsController,
  checkPincodeDistrict,
  getProductsByCity: getProductsByCityController,
  logout
}