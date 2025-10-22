const jwt = require('jsonwebtoken')
const User = require('../models/user-model')
const Admin = require('../models/admin-model')
const SuperAdmin = require('../models/super-admin-model')

const isLoggedIn = async (req, res, next) => {
  try {
    let accessToken = req.cookies.accessToken
    const refreshToken = req.cookies.refreshToken
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY)
        const user = await User.findById(decoded.userId)
        
        if (user) {
          req.user = user
          return next()
        }
      } catch (error) {
      }
    }
    if (refreshToken) {
      try {
        const { refreshAccessToken } = require('../services/user-services')
        const { accessToken: newAccessToken } = await refreshAccessToken(refreshToken)
        
        const decoded = jwt.verify(newAccessToken, process.env.JWT_SECRET_KEY)
        const user = await User.findById(decoded.userId)
        
        if (user) {
          res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: false, maxAge: 15 * 60 * 1000 })
          req.user = user
          return next()
        }
      } catch (error) {
        res.status(401).json({message: "Unauthorized access."})
      }
    }
    
    return res.status(401).json({ message: 'Access denied. Please login again.' })
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed.' })
  }
}

const isAdmin = async (req, res, next) => {
  try {
    let accessToken = req.cookies.adminAccessToken
    const refreshToken = req.cookies.adminRefreshToken
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY)
        const admin = await Admin.findById(decoded.adminId)
        
        if (admin && admin.isApproved) {
          req.admin = admin
          return next()
        }
      } catch (error) {
        
      }
    }
    if (refreshToken) {
      try {
        const { refreshAdminAccessToken } = require('../services/admin-services')
        const { accessToken: newAccessToken } = await refreshAdminAccessToken(refreshToken)
        
        const decoded = jwt.verify(newAccessToken, process.env.JWT_SECRET_KEY)
        const admin = await Admin.findById(decoded.adminId)
        
        if (admin && admin.isApproved) {
          res.cookie('adminAccessToken', newAccessToken, { httpOnly: true, secure: false, maxAge: 15 * 60 * 1000 })
          req.admin = admin
          return next()
        }
      } catch (error) {
      }
    }
    
    return res.status(401).json({ message: 'Access denied. Please login again.' })
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed.' })
  }
}

const isSuperAdmin = async (req, res, next) => {
  try {
    let accessToken = req.cookies.superAdminAccessToken
    const refreshToken = req.cookies.superAdminRefreshToken
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY)
        const superAdmin = await SuperAdmin.findById(decoded.superAdminId)
        
        if (superAdmin) {
          req.superAdmin = superAdmin
          return next()
        }
      } catch (error) {
      
      }
    }
    
    if (refreshToken) {
      try {
        const { refreshSuperAdminAccessToken } = require('../services/super-admin-services')
        const { accessToken: newAccessToken } = await refreshSuperAdminAccessToken(refreshToken)
        
        const decoded = jwt.verify(newAccessToken, process.env.JWT_SECRET_KEY)
        const superAdmin = await SuperAdmin.findById(decoded.superAdminId)
        
        if (superAdmin) {
          res.cookie('superAdminAccessToken', newAccessToken, { httpOnly: true, secure: false, maxAge: 15 * 60 * 1000 })
          req.superAdmin = superAdmin
          return next()
        }
      } catch (error) {
    
      }
    }
    
    return res.status(401).json({ message: 'Access denied. Please login again.' })
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed.' })
  }
}

module.exports = { isLoggedIn, isAdmin, isSuperAdmin }