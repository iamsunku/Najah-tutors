const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, 'Please add a subject name'],
    trim: true
  },
  class: {
    type: String,
    required: [true, 'Please add a class'],
    trim: true
  },
  board: {
    type: String,
    enum: ['CBSE', 'ICSE'],
    required: [true, 'Please select a board']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    default: 0
  },
  description: {
    type: String,
    default: ''
  },
  duration: {
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

module.exports = mongoose.model('Subject', subjectSchema);
