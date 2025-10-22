const USER_ROLES = {
  USER: 'User',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'SuperAdmin'
}

const COOKIE_NAMES = {
  USER: {
    ACCESS: 'accessToken',
    REFRESH: 'refreshToken'
  },
  ADMIN: {
    ACCESS: 'adminAccessToken',
    REFRESH: 'adminRefreshToken'
  },
  SUPER_ADMIN: {
    ACCESS: 'superAdminAccessToken',
    REFRESH: 'superAdminRefreshToken'
  }
}

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
}

module.exports = {
  USER_ROLES,
  COOKIE_NAMES,
  HTTP_STATUS
}