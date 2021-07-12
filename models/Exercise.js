const mongoose = require("mongoose")


const Exercise = new mongoose.Schema({
  user: {
    type: mongoose.ObjectId,
    ref: "User",
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model("Exercise", Exercise)