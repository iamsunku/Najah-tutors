const MarketingEnrollment = require('../models/MarketingEnrollment');
const User = require('../models/User');
const { sendWelcomeEmail } = require('../utils/emailService');
const { sendWelcomeWhatsApp } = require('../utils/notificationService');

// Generate random password
const generateRandomPassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// @desc    Public enrollment from marketing site
// @route   POST /api/public/enroll
// @access  Public
exports.createMarketingEnrollment = async (req, res) => {
  try {
    const {
      studentName,
      phone,
      email,
      class: studentClass,
      board,
      schoolName,
      subjects,
      totalAmount
    } = req.body;

    if (!studentName || !phone || !email || !studentClass || !board || !subjects || !subjects.length) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields or subjects'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() });
    let generatedPassword = null;

    // If user doesn't exist, create one with random password
    if (!user) {
      generatedPassword = generateRandomPassword();
      // Normalize subjects to ensure all fields are set
      const normalizedSubjects = subjects.map(s => ({
        subject: s.subject,
        class: s.class || studentClass,
        board: s.board || board.toUpperCase(),
        price: s.price || 0
      }));
      
      user = await User.create({
        name: studentName,
        email: email.toLowerCase(),
        password: generatedPassword,
        phone,
        role: 'student',
        class: studentClass,
        board: board.toUpperCase(),
        schoolName,
        subjects: normalizedSubjects, // Save normalized subjects to user
        isActive: true
      });
      console.log(`User created for ${email} with ${normalizedSubjects.length} subjects`);
    } else {
      // User exists - update their subjects (merge with existing, avoid duplicates)
      const existingSubjects = user.subjects || [];
      const existingSubjectKeys = new Set(
        existingSubjects.map(s => `${s.subject}-${s.class || ''}-${s.board || ''}`)
      );
      
      // Normalize and add new subjects that don't already exist
      const newSubjects = subjects
        .map(s => ({
          subject: s.subject,
          class: s.class || studentClass,
          board: s.board || board.toUpperCase(),
          price: s.price || 0
        }))
        .filter(s => {
          const key = `${s.subject}-${s.class}-${s.board}`;
          return !existingSubjectKeys.has(key);
        });
      
      if (newSubjects.length > 0) {
        user.subjects = [...existingSubjects, ...newSubjects];
        await user.save();
        console.log(`Updated user ${email} with ${newSubjects.length} new subjects`);
      } else {
        console.log(`User ${email} already has all these subjects`);
      }
    }

    // Create marketing enrollment
    const enrollment = await MarketingEnrollment.create({
      studentName,
      phone,
      email,
      class: studentClass,
      board,
      schoolName,
      subjects,
      totalAmount
    });

    // Send email and WhatsApp with password if new user was created
    if (generatedPassword) {
      try {
        console.log(`Attempting to send welcome email to ${email}...`);
        await sendWelcomeEmail(email, studentName, generatedPassword);
        console.log(`✅ Welcome email sent successfully to ${email}`);
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError.message);
        console.error('Email error details:', emailError);
        // Don't fail the enrollment if email fails, but log it clearly
        console.log('⚠️ Enrollment saved but email was not sent. Password:', generatedPassword);
      }

      // Send WhatsApp notification
      try {
        if (phone) {
          console.log(`Attempting to send welcome WhatsApp to ${phone}...`);
          await sendWelcomeWhatsApp(phone, studentName, generatedPassword);
          console.log(`✅ Welcome WhatsApp sent successfully to ${phone}`);
        }
      } catch (whatsappError) {
        console.error('❌ Failed to send WhatsApp:', whatsappError.message);
        console.error('WhatsApp error details:', whatsappError);
        // Don't fail the enrollment if WhatsApp fails
        console.log('⚠️ Enrollment saved but WhatsApp was not sent.');
      }
    } else {
      console.log(`User ${email} already exists, no email/WhatsApp sent`);
    }

    return res.status(201).json({
      success: true,
      data: enrollment,
      message: user ? 'Account created and email sent with login credentials' : 'Enrollment recorded'
    });
  } catch (error) {
    console.error('Error creating marketing enrollment:', error);
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all marketing enrollments (for admin)
// @route   GET /api/admin/marketing-enrollments
// @access  Private/Admin
exports.getMarketingEnrollments = async (req, res) => {
  try {
    const enrollments = await MarketingEnrollment.find()
      .sort('-createdAt');

    return res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    console.error('Error fetching marketing enrollments:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get current student's marketing enrollments (for invoices)
// @route   GET /api/public/enroll/me
// @access  Private (student)
exports.getMyMarketingEnrollments = async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const email = req.user.email.toLowerCase();

    const enrollments = await MarketingEnrollment.find({ email }).sort('-createdAt');

    return res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    console.error('Error fetching student marketing enrollments:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
