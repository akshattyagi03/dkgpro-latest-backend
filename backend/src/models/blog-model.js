const mongoose = require('mongoose')

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  excerpt: {
    type: String,
    required: true,
    maxlength: 300
  },
  content: {
    type: String,
    required: [true, 'Blog content is required']
  },
  featuredImage: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  category: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    index: true
  }],
  readingTime: {
    type: Number
  },
  views: {
    type: Number,
    default: 0
  },
  metaTitle: String,
  metaDescription: String,
  published: {
    type: Boolean,
    default: false
  },
  publishedAt: Date
}, {
  timestamps: true
})

blogSchema.index({ slug: 1 })
blogSchema.index({ createdAt: -1 })

module.exports = mongoose.model('Blog', blogSchema)