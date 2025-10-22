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

### 1. Register User
- **Method:** POST
- **Endpoint:** `/users/register`
- **Auth:** none
- **Description:** Create new user account
- **Body:**
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com", 
  "password": "secret123",
  "phoneNumber": "+1234567890"
}
```
- **Success:** 201 Created + sets `accessToken` and `refreshToken` cookies

### 2. Login User
- **Method:** POST
- **Endpoint:** `/users/login`
- **Auth:** none
- **Description:** Authenticate user and set cookie
- **Body:**
```json
{
  "email": "jane@example.com",
  "password": "secret123"
}
```
- **Success:** 200 OK + sets `accessToken` and `refreshToken` cookies

### 3. Get Products (Home)
- **Method:** GET
- **Endpoint:** `/users/home`
- **Auth:** none
- **Description:** Get all products for browsing
- **Success:** 200 OK with products array

### 4. Check Pincode
- **Method:** GET
- **Endpoint:** `/users/check/{pincode}`
- **Auth:** none
- **Description:** Get district name for pincode
- **Success:** 200 OK `{ "district": "Mumbai" }`

### 5. Logout
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

#### 1. Register Admin
- **Method:** POST
- **Endpoint:** `/admins/register`
- **Auth:** none
- **Description:** Submit admin registration (pending approval)
- **Body:**
```json
{
  "fullName": "John Admin",
  "email": "admin@example.com",
  "password": "secure123"
}
```
- **Success:** 201 Created (pending approval message, no cookies set)

#### 2. Login Admin
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

#### 3. Admin Home
- **Method:** GET
- **Endpoint:** `/admins/home`
- **Auth:** admin cookie
- **Description:** Get admin profile info
- **Success:** 200 OK with admin object

### Product Management

#### 4. Add Product
- **Method:** POST
- **Endpoint:** `/admins/addproducts`
- **Auth:** admin cookie
- **Description:** Create new product with categories and service areas
- **Body:**
```json
{
  "name": "Wedding Photography",
  "description": "Professional wedding photography services",
  "price": 50000,
  "mainCategory": "Wedding",
  "subCategory": "Photography", 
  "thirdCategory": "Traditional",
  "serviceableAreas": [
    {
      "city": "Mumbai",
      "districts": ["Andheri", "Bandra", "Colaba"]
    },
    {
      "city": "Delhi", 
      "districts": ["CP", "Karol Bagh"]
    }
  ]
}
```
- **Success:** 201 Created with product object

#### 5. Get Admin Products
- **Method:** GET
- **Endpoint:** `/admins/products`
- **Auth:** admin cookie
- **Description:** Get products created by authenticated admin
- **Success:** 200 OK with products array

### Category Management

#### 6. Get Categories (Hierarchical)
- **Method:** GET
- **Endpoint:** `/admins/categories`
- **Auth:** admin cookie
- **Description:** Get all categories with nested structure
- **Success:** 200 OK with nested categories

#### 7. Add Main Category
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

#### 8. Add Sub Category
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

#### 9. Add Third Category
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

### Blog Management

#### 10. Create Blog
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

#### 11. Get Admin Blogs
- **Method:** GET
- **Endpoint:** `/admins/blogs`
- **Auth:** admin cookie
- **Description:** Get blogs created by authenticated admin

#### 12. Edit Blog
- **Method:** PUT
- **Endpoint:** `/admins/edit-blog/{blogId}`
- **Auth:** admin cookie
- **Body:** Same as create blog (partial updates allowed)

#### 13. Delete Blog
- **Method:** DELETE
- **Endpoint:** `/admins/delete-blog/{blogId}`
- **Auth:** admin cookie
- **Description:** Delete admin's own blog

#### 14. Logout
- **Method:** GET
- **Endpoint:** `/admins/logout`
- **Auth:** admin cookie
- **Description:** Clear admin authentication cookie

---

## Super-Admin routes
Base URL: `/superadmins`

### Authentication

#### 1. Register Super Admin
- **Method:** POST
- **Endpoint:** `/superadmins/register`
- **Auth:** none
- **Body:**
```json
{
  "fullName": "Super Admin",
  "email": "superadmin@example.com",
  "password": "supersecure123"
}
```

#### 2. Login Super Admin
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
- **Success:** 200 OK + sets `superAdminToken` cookie

### Admin Management

#### 3. Get Pending Admins
- **Method:** GET
- **Endpoint:** `/superadmins/pending-admins`
- **Auth:** super-admin cookie
- **Description:** List all unapproved admin registrations

#### 4. Approve Admin
- **Method:** POST
- **Endpoint:** `/superadmins/approve-admin/{adminId}`
- **Auth:** super-admin cookie
- **Description:** Approve admin registration (enables login)

#### 5. Reject Admin
- **Method:** POST
- **Endpoint:** `/superadmins/reject-admin/{adminId}`
- **Auth:** super-admin cookie
- **Description:** Reject and delete admin registration

### Product Management

#### 6. Get All Products
- **Method:** GET
- **Endpoint:** `/superadmins/products`
- **Auth:** super-admin cookie
- **Description:** View all products from all admins

#### 7. Edit Any Product
- **Method:** PUT
- **Endpoint:** `/superadmins/edit-product/{productId}`
- **Auth:** super-admin cookie
- **Description:** Edit any product regardless of creator

#### 8. Delete Any Product
- **Method:** DELETE
- **Endpoint:** `/superadmins/delete-product/{productId}`
- **Auth:** super-admin cookie
- **Description:** Delete any product from system

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
- Three-tier category assignment
- Service areas (cities with their serviceable districts)
- Images array
- Creator admin reference

## Error handling & status codes
- **200 OK** — successful GET/PUT/POST
- **201 Created** — resource created successfully
- **400 Bad Request** — validation error or malformed input
- **401 Unauthorized** — missing/invalid authentication cookie
- **403 Forbidden** — authenticated but insufficient permissions
- **404 Not Found** — resource not found
- **500 Internal Server Error** — unexpected server error

## Implementation notes
- Cookie-based JWT authentication with httpOnly cookies
- Admin approval workflow managed by super-admin
- Three-tier category system with name-based lookups
- Service areas support city/district granularity
- All passwords hashed with bcryptjs
- MongoDB with Mongoose ODM
- No semicolons in codebase (style choice)

---

## API Testing
Use tools like Postman or Thunder Client. Remember:
1. Register/login to get authentication cookies
2. Cookies are automatically sent with subsequent requests
3. Admin accounts need super-admin approval before login
4. Create categories before adding products
5. Use actual ObjectIds from database responses