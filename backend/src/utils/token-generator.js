const jwt = require('jsonwebtoken')
const jwtConfig = require('../config/jwt')

const generateAccessToken = (payload) => {
  return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.accessTokenExpiry })
}

const generateRefreshTokenValue = () => {
  return require('crypto').randomBytes(64).toString('hex')
}

module.exports = {
  generateAccessToken,
  generateRefreshTokenValue
}