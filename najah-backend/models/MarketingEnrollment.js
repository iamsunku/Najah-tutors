const mongoose = require('mongoose');

const marketingEnrollmentSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  class: {
    type: String,
    required: true,
    trim: true
  },
  board: {
    type: String,
    required: true,
    trim: true
  },
  schoolName: {
    type: String,
    trim: true
  },
  subjects: [
    {
      subject: String,
      class: String,
      board: String,
      price: Number
    }
  ],
  totalAmount: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MarketingEnrollment', marketingEnrollmentSchema);
