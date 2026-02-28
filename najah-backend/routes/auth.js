const express = require('express');
const {
  register,
  login,
  getMe,
  sendPasswordOtp,
  resetPasswordWithOtp
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-otp', sendPasswordOtp);
router.post('/reset-password', resetPasswordWithOtp);
router.get('/me', protect, getMe);

module.exports = router;

