const mongoose = require("mongoose")

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    phone: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, "Please use a valid Indian mobile number"]
    },

    serviceType: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email"]
    },

    message: {
      type: String,
      trim: true
    },

    status: {
      type: String,
      enum: ["new", "contacted", "closed"],
      default: "new"
    }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model("Contact", contactSchema)