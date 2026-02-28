const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const { sendEnrollmentNotification } = require('../utils/notificationService');

// Validate subjects (no duplicates, must exist in course) and compute amount
const validateSubjectsAndAmount = (subjects, course) => {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    const error = new Error('Please select at least one subject');
    error.statusCode = 400;
    throw error;
  }

  // Trim and deduplicate
  const normalized = subjects
    .map(s => (typeof s === 'string' ? s.trim() : s))
    .filter(Boolean);
  const uniqueSubjects = [...new Set(normalized)];

  if (uniqueSubjects.length !== normalized.length) {
    const error = new Error('Each subject can only be selected once');
    error.statusCode = 400;
    throw error;
  }

  let amount = 0;
  for (const subjectName of uniqueSubjects) {
    const subject = course.subjects.find(s => s.name === subjectName);
    if (!subject) {
      const error = new Error(`Subject "${subjectName}" is not available in this course`);
      error.statusCode = 400;
      throw error;
    }
    amount += subject.price;
  }

  return { uniqueSubjects, amount };
};

// @desc    Get all enrollments
// @route   GET /api/enrollments
// @access  Private/Admin
exports.getEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find()
      .populate('student', 'name email phone class board')
      .populate('course', 'name board class')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single enrollment
// @route   GET /api/enrollments/:id
// @access  Private/Admin
exports.getEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('student', 'name email phone class board schoolName')
      .populate('course', 'name board class subjects');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create enrollment
// @route   POST /api/enrollments
// @access  Private
exports.createEnrollment = async (req, res, next) => {
  try {
    const { courseId, subjects, studentId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Resolve student (by id or current user)
    const student = await User.findById(studentId || req.user.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Prevent duplicate enrollment for the same course by the same email/user
    const existingEnrollment = await Enrollment.findOne({
      course: courseId,
      student: student._id
    });
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'This email is already enrolled in this course'
      });
    }

    const { uniqueSubjects, amount } = validateSubjectsAndAmount(subjects, course);

    const enrollment = await Enrollment.create({
      student: student._id,
      course: courseId,
      subjects: uniqueSubjects,
      amount
    });

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('student', 'name email phone notificationPreferences')
      .populate('course', 'name board class');

    // Send notification to the enrolled student
    try {
      const student = populatedEnrollment.student;
      if (student) {
        // Check notification preferences
        let shouldNotify = true;
        if (student.notificationPreferences) {
          const emailEnabled = student.notificationPreferences.email !== false;
          const whatsappEnabled = student.notificationPreferences.whatsapp !== false;
          shouldNotify = emailEnabled || whatsappEnabled;
        }

        if (shouldNotify) {
          sendEnrollmentNotification(student, populatedEnrollment).catch(err => {
            console.error('Error sending enrollment notification:', err);
          });
        }
      }
    } catch (notifError) {
      console.error('Notification error (non-blocking):', notifError);
    }

    res.status(201).json({
      success: true,
      data: populatedEnrollment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update enrollment
// @route   PUT /api/enrollments/:id
// @access  Private/Admin
exports.updateEnrollment = async (req, res, next) => {
  try {
    let enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // If subjects are being updated, validate and recalculate amount
    if (req.body.subjects) {
      const course = await Course.findById(req.body.course || enrollment.course);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
      const { uniqueSubjects, amount } = validateSubjectsAndAmount(req.body.subjects, course);
      req.body.subjects = uniqueSubjects;
      req.body.amount = amount;
    }

    enrollment = await Enrollment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('student', 'name email phone').populate('course', 'name board class');

    res.status(200).json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete enrollment
// @route   DELETE /api/enrollments/:id
// @access  Private/Admin
exports.deleteEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    await enrollment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Enrollment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

