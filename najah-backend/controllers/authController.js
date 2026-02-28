const User = require('../models/User');
const { sendResetReminderEmail, sendPasswordOtpEmail } = require('../utils/emailService');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, schoolName, class: studentClass, grade, board, country } = req.body;

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      phone,
      schoolName,
      class: studentClass || grade,
      board,
      country
    });

    // Send login response
    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Send normal login response
    sendTokenResponse(user, 200, res);

    // For students, send a one-time reset reminder email after first successful login
    if (user.role === 'student' && !user.hasSeenResetReminder) {
      try {
        // Fire-and-forget email (do not delay response)
        sendResetReminderEmail(user.email, user.name).catch(err => {
          console.error('Failed to send reset reminder email:', err);
        });

        // Mark reminder as sent without triggering pre-save password hashing
        User.findByIdAndUpdate(user._id, { hasSeenResetReminder: true })
          .catch(err => console.error('Failed to mark reset reminder as sent:', err));
      } catch (emailError) {
        console.error('Error scheduling reset reminder email:', emailError);
      }
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  const user = await User.findById(req.user.id);

  // If user doesn't have subjects but has enrollments, backfill from MarketingEnrollment
  if ((!user.subjects || user.subjects.length === 0) && user.email) {
    try {
      const MarketingEnrollment = require('../models/MarketingEnrollment');
      const enrollments = await MarketingEnrollment.find({
        email: user.email.toLowerCase()
      }).sort('-createdAt');

      if (enrollments.length > 0) {
        // Collect all unique subjects from all enrollments
        const allSubjects = [];
        const subjectKeys = new Set();

        enrollments.forEach(enrollment => {
          if (enrollment.subjects && enrollment.subjects.length > 0) {
            enrollment.subjects.forEach(s => {
              const key = `${s.subject}-${s.class || enrollment.class}-${s.board || enrollment.board}`;
              if (!subjectKeys.has(key)) {
                subjectKeys.add(key);
                allSubjects.push({
                  subject: s.subject,
                  class: s.class || enrollment.class,
                  board: s.board || enrollment.board,
                  price: s.price || 0
                });
              }
            });
          }
        });

        if (allSubjects.length > 0) {
          user.subjects = allSubjects;
          await user.save();
          console.log(`Backfilled ${allSubjects.length} subjects for user ${user.email}`);
        }
      }
    } catch (error) {
      console.error('Error backfilling subjects:', error);
      // Continue even if backfill fails
    }
  }

  res.status(200).json({
    success: true,
    data: user
  });
};

// @desc    Send OTP for password reset
// @route   POST /api/auth/forgot-otp
// @access  Public
exports.sendPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If this email is registered, an OTP has been sent'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expire = new Date(Date.now() + 10 * 60 * 1000);

    user.resetOtp = otp;
    user.resetOtpExpire = expire;
    await user.save({ validateBeforeSave: false });

    await sendPasswordOtpEmail(user.email, user.name, otp);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email'
    });
  } catch (error) {
    console.error('Error sending password OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error sending OTP'
    });
  }
};

// @desc    Reset password using OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, OTP, and new password'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetOtp: otp,
      resetOtpExpire: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpire = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password with OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

