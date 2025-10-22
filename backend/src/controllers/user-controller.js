const { 
  registerUser, 
  loginUser, 
  getProducts, 
  checkPincode, 
  getProductsByCity,
  logoutUser 
} = require('../services/user-services')
const { HTTP_STATUS } = require('../utils/constants')

const register = async (req, res) => {
  try {
    const result = await registerUser(req.body, res)
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
    const products = await getProducts()
    res.status(HTTP_STATUS.OK).json({ products })
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

module.exports = {
  register,
  login,
  home,
  checkPincodeDistrict,
  getProductsByCity: getProductsByCityController,
  logout
}