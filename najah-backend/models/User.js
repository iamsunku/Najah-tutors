const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student'],
    default: 'student'
  },
  phone: {
    type: String,
    trim: true
  },
  schoolName: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  class: {
    type: String,
    trim: true
  },
  board: {
    type: String,
    enum: ['CBSE', 'ICSE', 'IGCSE', 'Other', ''],
    default: ''
  },
  subjects: [
    {
      subject: String,
      class: String,
      board: String,
      price: Number
    }
  ],
  isActive: {
    type: Boolean,
    default: true
  },
  hasSeenResetReminder: {
    type: Boolean,
    default: false
  },
  resetOtp: {
    type: String
  },
  resetOtpExpire: {
    type: Date
  },
  pushSubscription: {
    type: mongoose.Schema.Types.Mixed, // Store push notification subscription object
    default: null
  },
  notificationPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    whatsapp: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

