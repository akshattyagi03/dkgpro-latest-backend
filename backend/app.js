require("dotenv").config()
const express=require("express")
const cookieParser=require("cookie-parser")
const connectDB = require('./src/config/database')
const app=express()
const userRoutes=require("./src/routes/user-routes")
const adminRoutes=require("./src/routes/admin-routes")
const superAdminRoutes=require("./src/routes/super-admin-routes")

connectDB()
app.use(express.json())
app.use(cookieParser())

app.get("/", (req, res)=>{
    res.send("Hey, it's working")
})
app.use("/users", userRoutes)
app.use("/admins", adminRoutes)
app.use("/superadmins", superAdminRoutes)
module.exports=app