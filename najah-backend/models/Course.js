const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a course name'],
    trim: true
  },
  board: {
    type: String,
    enum: ['CBSE', 'ICSE'],
    required: [true, 'Please select a board']
  },
  class: {
    type: String,
    required: [true, 'Please add a class'],
    trim: true
  },
  subjects: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      default: 0
    },
    duration: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    }
  }],
  description: {
    type: String,
    default: ''
  },
  thumbnail: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Course', courseSchema);

