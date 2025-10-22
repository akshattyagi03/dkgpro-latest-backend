const jwtConfig = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days 
  secret: process.env.JWT_SECRET_KEY,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: {
      access: 15 * 60 * 1000, // 15 minutes
      refresh: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }
}

module.exports = jwtConfig