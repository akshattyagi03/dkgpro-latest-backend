# DKGPro — API README

Role-based REST API for an e-commerce style application with wedding services focus. This README documents setup notes and available routes grouped by role: User, Admin, and Super-Admin. Each route lists method, endpoint, authentication/authorization, description, expected request body, and example responses.

## Table of contents
- About
- Prerequisites
- Environment
- Running the project
- Authentication notes
- User routes
- Admin routes
- Super-Admin routes
- Category system
- Error handling & status codes

---

## About
DKGPro provides user accounts, product management, blog system, and role-based admin functionality. Roles supported:
- **user** — regular customer
- **admin** — manages products, categories, blogs (requires super-admin approval)
- **super-admin** — manages admins, approves admin accounts, system-wide product management

## Prerequisites
- Node.js >= 14
- MongoDB instance (local or hosted)
- npm

## Environment variables
Create a `.env` file with:
```
MONGODB_URI=mongodb://localhost:27017/dkgpro
JWT_SECRET_KEY=your_jwt_secret_key
PORT=6969
```

## Running the project
1. `npm install`
2. Configure `.env` with required variables
3. `npm start` or `npm run dev`

## Authentication notes
- Uses **cookie-based JWT authentication with access/refresh tokens**
- Different cookies for different roles:
  - `accessToken` + `refreshToken` — user authentication
  - `adminAccessToken` + `adminRefreshToken` — admin authentication  
  - `superAdminAccessToken` + `superAdminRefreshToken` — super admin authentication
- Access tokens expire in 15 minutes, refresh tokens in 7 days
- Middleware automatically refreshes expired access tokens using refresh tokens
- Admin accounts require super-admin approval before login
- Super admin registration restricted to development environment only

---

# Routes

**Notes:**
- All request bodies are JSON
- IDs are MongoDB ObjectId strings
- Replace `{id}` with actual resource ID
- Cookie authentication is automatic after login

## User routes
Base URL: `/users`

### 1. Send Registration OTP
- **Method:** POST
- **Endpoint:** `/users/send-otp`
- **Auth:** none
- **Description:** Send OTP to email for registration
- **Body:**
```json
{
  "email": "jane@example.com"
}
```
- **Success:** 200 OK

### 2. Verify OTP & Register
- **Method:** POST
- **Endpoint:** `/users/verify-otp`
- **Auth:** none
- **Description:** Verify OTP and create user account
- **Body:**
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "phoneNumber": "+1234567890",
  "otp": "123456"
}
```
- **Success:** 201 Created + sets `accessToken` and `refreshToken` cookies

### 3. Send Phone OTP
- **Method:** POST
- **Endpoint:** `/users/send-phone-otp`
- **Auth:** none
- **Description:** Send OTP to phone for login/registration
- **Body:**
```json
{
  "phoneNumber": "+1234567890"
}
```
- **Success:** 200 OK

### 4. Phone Login/Register
- **Method:** POST
- **Endpoint:** `/users/verify-phone-login`
- **Auth:** none
- **Description:** Login existing user or register new user with phone OTP
- **Body (Login):**
```json
{
  "phoneNumber": "+1234567890",
  "otp": "123456"
}
```
- **Body (Register):**
```json
{
  "phoneNumber": "+1234567890",
  "otp": "123456",
  "fullName": "Jane Doe",
  "email": "jane@example.com"
}
```
- **Success:** 200 OK + sets `accessToken` and `refreshToken` cookies

### 5. Login User
- **Method:** POST
- **Endpoint:** `/users/login`
- **Auth:** none
- **Description:** Authenticate user with email/password
- **Body:**
```json
{
  "email": "jane@example.com",
  "password": "secret123"
}
```
- **Success:** 200 OK + sets `accessToken` and `refreshToken` cookies

### 6. Forgot Password
- **Method:** POST
- **Endpoint:** `/users/forgot-password`
- **Auth:** none
- **Description:** Send password reset OTP to email
- **Body:**
```json
{
  "email": "jane@example.com"
}
```
- **Success:** 200 OK

### 7. Reset Password
- **Method:** POST
- **Endpoint:** `/users/reset-password`
- **Auth:** none
- **Description:** Reset password with OTP
- **Body:**
```json
{
  "email": "jane@example.com",
  "otp": "123456",
  "newPassword": "newPassword123"
}
```
- **Success:** 200 OK

### 8. Get Products (Home)
- **Method:** GET
- **Endpoint:** `/users/home`
- **Auth:** none
- **Description:** Get all products with categories and customizations
- **Success:** 200 OK with products array

### 9. Get Featured Products
- **Method:** GET
- **Endpoint:** `/users/featured`
- **Auth:** none
- **Description:** Get only featured products
- **Success:** 200 OK with featured products array

### 10. Get Premium Products
- **Method:** GET
- **Endpoint:** `/users/premium`
- **Auth:** none
- **Description:** Get only premium tier products
- **Success:** 200 OK with premium products array

### 11. Get Products by City
- **Method:** GET
- **Endpoint:** `/users/products/{city}`
- **Auth:** none
- **Description:** Get products available in specific city
- **Success:** 200 OK with filtered products

### 12. Check Pincode
- **Method:** GET
- **Endpoint:** `/users/check/{pincode}`
- **Auth:** none
- **Description:** Get district name for pincode
- **Success:** 200 OK `{ "district": "Mumbai" }`

### 13. Logout
- **Method:** GET
- **Endpoint:** `/users/logout`
- **Auth:** user cookie
- **Description:** Clear authentication cookie
- **Success:** 200 OK

---

## Admin routes
Base URL: `/admins`
**Note:** Admin accounts require super-admin approval before login access

### Authentication

#### 1. Send Admin OTP
- **Method:** POST
- **Endpoint:** `/admins/send-otp`
- **Auth:** none
- **Description:** Send OTP to email for admin registration
- **Body:**
```json
{
  "email": "admin@example.com"
}
```
- **Success:** 200 OK

#### 2. Verify Admin OTP & Register
- **Method:** POST
- **Endpoint:** `/admins/verify-otp`
- **Auth:** none
- **Description:** Verify OTP and submit admin registration (pending approval)
- **Body:**
```json
{
  "fullName": "John Admin",
  "email": "admin@example.com",
  "password": "secure123",
  "otp": "123456"
}
```
- **Success:** 201 Created (pending approval message)

#### 3. Send Admin Phone OTP
- **Method:** POST
- **Endpoint:** `/admins/send-phone-otp`
- **Auth:** none
- **Description:** Send OTP to phone for admin registration/login
- **Body:**
```json
{
  "phoneNumber": "8882123456"
}
```
- **Success:** 200 OK

#### 4. Admin Phone Login/Register
- **Method:** POST
- **Endpoint:** `/admins/verify-phone-login`
- **Auth:** none
- **Description:** Login existing admin or register new admin with phone OTP
- **Body (Login):**
```json
{
  "phoneNumber": "8882123456",
  "otp": "123456"
}
```
- **Body (Register):**
```json
{
  "phoneNumber": "8882123456",
  "otp": "123456",
  "fullName": "John Admin",
  "email": "admin@example.com",
  "password": "secure123"
}
```
- **Success:** 200 OK (pending approval for new registrations)

#### 5. Login Admin
- **Method:** POST
- **Endpoint:** `/admins/login`
- **Auth:** none (requires approval)
- **Description:** Login approved admin
- **Body:**
```json
{
  "email": "admin@example.com",
  "password": "secure123"
}
```
- **Success:** 200 OK + sets `adminAccessToken` and `adminRefreshToken` cookies

### Admin Dashboard

#### 4. Admin Home
- **Method:** GET
- **Endpoint:** `/admins/home`
- **Auth:** admin cookie
- **Description:** Get admin profile info
- **Success:** 200 OK with admin object

### Product Management

#### 5. Add Product
- **Method:** POST
- **Endpoint:** `/admins/addproducts`
- **Auth:** admin cookie
- **Description:** Create new product with categories, addons, and customizations
- **Note:** Use `/addproducts` not `/products` for creating products
- **Body:**
```json
{
  "name": "Premium Wedding Photography Package",
  "description": "Complete wedding photography with professional editing",
  "price": 75000,
  "mainCategory": "Wedding",
  "subCategory": "Photography",
  "thirdCategory": "Traditional",
  "additionalCategories": ["Outdoor", "Garden"],
  "customizationSections": ["Recommended"],
  "images": ["https://example.com/photo1.jpg"],
  "serviceableAreas": [
    {
      "city": "Mumbai",
      "districts": ["Andheri", "Bandra", "Colaba"]
    }
  ]
}
```
- **Success:** 201 Created with populated product object

#### 6. Get Admin Products
- **Method:** GET
- **Endpoint:** `/admins/products`
- **Auth:** admin cookie
- **Description:** Get products created by authenticated admin with full population
- **Success:** 200 OK with products array including categories, addons, and customizations

#### 7. Toggle Product Featured Status
- **Method:** PUT
- **Endpoint:** `/admins/toggle-featured/{productId}`
- **Auth:** admin cookie
- **Description:** Change featured status of admin's own product
- **Body:**
```json
{
  "isFeatured": true
}
```
- **Success:** 200 OK with updated product

#### 8. Toggle Product Tier
- **Method:** PUT
- **Endpoint:** `/admins/toggle-tier/{productId}`
- **Auth:** admin cookie
- **Description:** Toggle product tier between premium and standard
- **Body:**
```json
{
  "tier": "premium"
}
```
- **Success:** 200 OK with updated product

### Category Management

#### 9. Get Categories (Hierarchical)
- **Method:** GET
- **Endpoint:** `/admins/categories`
- **Auth:** admin cookie
- **Description:** Get all categories with nested structure
- **Success:** 200 OK with nested categories

#### 10. Add Main Category
- **Method:** POST
- **Endpoint:** `/admins/addcategory`
- **Auth:** admin cookie
- **Body:**
```json
{
  "name": "Wedding",
  "description": "Wedding services and products"
}
```

#### 11. Add Sub Category
- **Method:** POST
- **Endpoint:** `/admins/addsubcategory`
- **Auth:** admin cookie
- **Body:**
```json
{
  "name": "Photography",
  "description": "Photography services",
  "mainCategory": "Wedding"
}
```

#### 12. Add Third Category
- **Method:** POST
- **Endpoint:** `/admins/addthirdcategory`
- **Auth:** admin cookie
- **Body:**
```json
{
  "name": "Traditional",
  "description": "Traditional photography style",
  "subCategory": "Photography"
}
```

#### 13. Create Category Hierarchy
- **Method:** POST
- **Endpoint:** `/admins/create-category-tree`
- **Auth:** admin cookie
- **Description:** Create complete category hierarchy in one request
- **Body:**
```json
{
  "mainCategory": {
    "name": "Wedding",
    "description": "Wedding services"
  },
  "subCategory": {
    "name": "Photography",
    "description": "Photography services"
  },
  "thirdCategory": {
    "name": "Traditional",
    "description": "Traditional photography"
  },
  "additionalCategories": [
    {
      "name": "Outdoor",
      "description": "Outdoor photography"
    }
  ]
}
```

#### 14. Get Category Tree
- **Method:** GET
- **Endpoint:** `/admins/category-tree`
- **Auth:** admin cookie
- **Description:** Get complete hierarchical category structure
- **Success:** 200 OK with nested category tree

#### 15. Add Addon
- **Method:** POST
- **Endpoint:** `/admins/add-addon`
- **Auth:** admin cookie
- **Description:** Create product addon
- **Body:**
```json
{
  "name": "Extra Photo Album",
  "description": "Premium leather-bound photo album",
  "price": 5000,
  "image": "https://example.com/album.jpg"
}
```

#### 16. Add Customization Section
- **Method:** POST
- **Endpoint:** `/admins/add-customization-section`
- **Auth:** admin cookie
- **Description:** Create customization section with sub-sections and addons
- **Body:**
```json
{
  "name": "Recommended",
  "description": "Popular add-ons",
  "subSections": [
    {
      "name": "Photography Extras",
      "description": "Additional photography services",
      "addons": ["Extra Photo Album", "Drone Photography"]
    }
  ]
}
```

#### 17. Add Venue
- **Method:** POST
- **Endpoint:** `/admins/add-venue`
- **Auth:** admin cookie
- **Description:** Create venue
- **Body:**
```json
{
  "name": "Grand Ballroom Palace",
  "location": "Mumbai, Maharashtra",
  "images": ["https://example.com/venue1.jpg"],
  "description": "Elegant ballroom for weddings"
}
```

#### 18. Get Venues
- **Method:** GET
- **Endpoint:** `/admins/venues`
- **Auth:** admin cookie
- **Description:** Get all venues
- **Success:** 200 OK with venues array

### Blog Management

#### 19. Create Blog
- **Method:** POST
- **Endpoint:** `/admins/create-blog`
- **Auth:** admin cookie
- **Body:**
```json
{
  "title": "Wedding Planning Tips",
  "content": "Here are some great tips for planning your wedding...",
  "tags": ["wedding", "planning", "tips"],
  "published": true
}
```

#### 20. Get Admin Blogs
- **Method:** GET
- **Endpoint:** `/admins/blogs`
- **Auth:** admin cookie
- **Description:** Get blogs created by authenticated admin

#### 21. Edit Blog
- **Method:** PUT
- **Endpoint:** `/admins/edit-blog/{blogId}`
- **Auth:** admin cookie
- **Body:** Same as create blog (partial updates allowed)

#### 22. Delete Blog
- **Method:** DELETE
- **Endpoint:** `/admins/delete-blog/{blogId}`
- **Auth:** admin cookie
- **Description:** Delete admin's own blog

#### 23. Logout
- **Method:** GET
- **Endpoint:** `/admins/logout`
- **Auth:** admin cookie
- **Description:** Clear admin authentication cookie

---

## Super-Admin routes
Base URL: `/superadmins`

### Authentication

#### 1. Send Super Admin OTP
- **Method:** POST
- **Endpoint:** `/superadmins/send-otp`
- **Auth:** none (development only)
- **Body:**
```json
{
  "email": "superadmin@example.com"
}
```

#### 2. Verify Super Admin OTP & Register
- **Method:** POST
- **Endpoint:** `/superadmins/verify-otp`
- **Auth:** none (development only)
- **Body:**
```json
{
  "fullName": "Super Admin",
  "email": "superadmin@example.com",
  "password": "supersecure123",
  "otp": "123456"
}
```
- **Success:** 201 Created + sets `superAdminAccessToken` and `superAdminRefreshToken` cookies

#### 3. Send Super Admin Phone OTP
- **Method:** POST
- **Endpoint:** `/superadmins/send-phone-otp`
- **Auth:** none (development only)
- **Description:** Send OTP to phone for super admin registration
- **Body:**
```json
{
  "phoneNumber": "8882123456"
}
```
- **Success:** 200 OK

#### 4. Super Admin Phone Register
- **Method:** POST
- **Endpoint:** `/superadmins/verify-phone-login`
- **Auth:** none (development only)
- **Description:** Register new super admin with phone OTP
- **Body:**
```json
{
  "phoneNumber": "8882123456",
  "otp": "123456",
  "fullName": "Super Admin",
  "email": "superadmin@example.com",
  "password": "supersecure123"
}
```
- **Success:** 201 Created + sets `superAdminAccessToken` and `superAdminRefreshToken` cookies

#### 5. Login Super Admin
- **Method:** POST
- **Endpoint:** `/superadmins/login`
- **Auth:** none
- **Body:**
```json
{
  "email": "superadmin@example.com",
  "password": "supersecure123"
}
```
- **Success:** 200 OK + sets `superAdminAccessToken` and `superAdminRefreshToken` cookies

### Admin Management

#### 3. Get Pending Admins
- **Method:** GET
- **Endpoint:** `/superadmins/pending-admins`
- **Auth:** super-admin cookie
- **Description:** List all unapproved admin registrations

#### 4. Get All Admins
- **Method:** GET
- **Endpoint:** `/superadmins/admins`
- **Auth:** super-admin cookie
- **Description:** Get all admins (approved and pending) without passwords
- **Success:** 200 OK with admins array

#### 6. Approve Admin
- **Method:** POST
- **Endpoint:** `/superadmins/approve-admin/{adminId}`
- **Auth:** super-admin cookie
- **Description:** Approve admin registration (enables login)

#### 7. Reject Admin
- **Method:** POST
- **Endpoint:** `/superadmins/reject-admin/{adminId}`
- **Auth:** super-admin cookie
- **Description:** Reject and delete admin registration

### Product Management

#### 8. Get All Products
- **Method:** GET
- **Endpoint:** `/superadmins/products`
- **Auth:** super-admin cookie
- **Description:** View all products from all admins with full population
- **Success:** 200 OK with complete product data

#### 9. Edit Any Product
- **Method:** PUT
- **Endpoint:** `/superadmins/edit-product/{productId}`
- **Auth:** super-admin cookie
- **Description:** Edit any product regardless of creator

#### 10. Delete Any Product
- **Method:** DELETE
- **Endpoint:** `/superadmins/delete-product/{productId}`
- **Auth:** super-admin cookie
- **Description:** Delete any product from system

#### 11. Get All Venues
- **Method:** GET
- **Endpoint:** `/superadmins/venues`
- **Auth:** super-admin cookie
- **Description:** View all venues

#### 12. Edit Venue
- **Method:** PUT
- **Endpoint:** `/superadmins/edit-venue/{venueId}`
- **Auth:** super-admin cookie
- **Description:** Edit any venue

#### 13. Delete Venue
- **Method:** DELETE
- **Endpoint:** `/superadmins/delete-venue/{venueId}`
- **Auth:** super-admin cookie
- **Description:** Delete any venue

---

## Category System
DKGPro uses a three-tier category hierarchy:

1. **Main Category** (e.g., "Wedding")
2. **Sub Category** (e.g., "Photography") 
3. **Third Category** (e.g., "Traditional")

Products must be assigned to all three category levels. Categories are created using category names, and the system automatically resolves the hierarchy relationships.

## Product Structure
Products include:
- Basic info (name, description, price)
- Multi-tier category assignment (main, sub, third, additional)
- Customization sections with addons
- Keywords for search optimization
- Featured status and tier (standard/premium)
- Service areas (cities with their serviceable districts)
- Images array
- Creator admin reference
- **New fields:**
  - Optional: location, setupDuration, teamSize, advanceBooking, cancellationPolicy, youtubeVideoLink
  - Mandatory: inclusions (array), experiences (array), keyHighlights (array)

## Error handling & status codes
- **200 OK** — successful GET/PUT/POST
- **201 Created** — resource created successfully
- **400 Bad Request** — validation error or malformed input
- **401 Unauthorized** — missing/invalid authentication cookie
- **403 Forbidden** — authenticated but insufficient permissions
- **404 Not Found** — resource not found
- **500 Internal Server Error** — unexpected server error

## New Features

### OTP Authentication
- Email OTP for user/admin/super-admin registration
- Phone OTP for user login/registration (Twilio integration)
- Password reset with email OTP
- 5-minute OTP expiry

### Enhanced Category System
- Unlimited category levels (4th, 5th, 6th...)
- Single route for complete category hierarchy creation
- Category tree view with full nesting
- Name-based category references

### Product Customization
- Customization sections with sub-sections
- Product addons with name, description, price, image
- Flexible addon organization
- Full population in product responses

### Venue Management
- Venue creation by admins
- Venue modification/deletion by super-admins
- Venue details: name, location, images, description

### Phone Authentication
- SMS OTP via Twilio for users, admins, and super admins
- Login existing accounts or register new accounts with phone OTP
- Automatic +91 prefix addition for Indian phone numbers
- New registrations require fullName, email, and password
- Admin phone registration still requires super admin approval

### Cities and Districts Data
- JSON file with hierarchical city-district mapping
- Special handling for Delhi NCR (metro → sub-cities → districts)
- Regular cities have direct city → districts mapping
- Located at: `/src/utils/cities-districts.json`
- Usage: Delhi NCR → Delhi → Shahdara

## Implementation notes
- Cookie-based JWT authentication with httpOnly cookies
- Admin approval workflow managed by super-admin
- Flexible category system with unlimited depth
- Service areas support city/district granularity
- All passwords hashed with bcryptjs
- MongoDB with Mongoose ODM
- Name-based entity references for easier API usage

---

## API Testing
Use tools like Postman or Thunder Client. Remember:
1. Register/login to get authentication cookies
2. Cookies are automatically sent with subsequent requests
3. Admin accounts need super-admin approval before login
4. Create categories before adding products
5. Use actual ObjectIds from database responses
6. Use `/addproducts` endpoint for creating products, not `/products`