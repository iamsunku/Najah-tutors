const LiveClass = require('../models/LiveClass');
const Course = require('../models/Course');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const MarketingEnrollment = require('../models/MarketingEnrollment');
const { sendBulkClassNotifications, sendClassCancellationNotification } = require('../utils/notificationService');

// @desc    Get all live classes
// @route   GET /api/live-classes
// @access  Public
exports.getLiveClasses = async (req, res, next) => {
  try {
    const { status, courseId } = req.query;
    let query = {};
    if (status) query.status = status;
    if (courseId) query.course = courseId;

    const classes = await LiveClass.find(query)
      .populate('course', 'name board class')
      .populate('teacher', 'name email')
      .populate('enrolledStudents', 'name email')
      .sort('scheduledDate');

    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single live class
// @route   GET /api/live-classes/:id
// @access  Public
exports.getLiveClass = async (req, res, next) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id)
      .populate('course', 'name board class')
      .populate('teacher', 'name email phone')
      .populate('enrolledStudents', 'name email');

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    res.status(200).json({
      success: true,
      data: liveClass
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create live class
// @route   POST /api/live-classes
// @access  Private/Admin
exports.createLiveClass = async (req, res, next) => {
  try {
    const liveClass = await LiveClass.create(req.body);

    const populatedClass = await LiveClass.findById(liveClass._id)
      .populate('course', 'name board class')
      .populate('teacher', 'name email')
      .populate('enrolledStudents', 'name email phone pushSubscription notificationPreferences');

    // Send notifications to enrolled students only
    try {
      // Get all enrollments (active and pending status)
      const enrollments = await Enrollment.find({
        status: { $in: ['active', 'pending'] }
      }).select('student');

      // Get all marketing enrollments (all are considered enrolled)
      const marketingEnrollments = await MarketingEnrollment.find().select('email');

      // Get unique student IDs from regular enrollments
      const enrolledStudentIds = [...new Set(enrollments.map(enrollment => enrollment.student.toString()))];

      // Get unique emails from marketing enrollments
      const marketingEnrollmentEmails = [...new Set(marketingEnrollments.map(me => me.email.toLowerCase()))];

      // Get students from both sources
      const enrolledStudentsFromEnrollments = enrolledStudentIds.length > 0 
        ? await User.find({
            _id: { $in: enrolledStudentIds },
            role: 'student',
            isActive: true
          }).select('name email phone pushSubscription notificationPreferences board class')
        : [];

      const enrolledStudentsFromMarketing = marketingEnrollmentEmails.length > 0
        ? await User.find({
            email: { $in: marketingEnrollmentEmails },
            role: 'student',
            isActive: true
          }).select('name email phone pushSubscription notificationPreferences board class')
        : [];

      // Combine and deduplicate by email
      const allEnrolledStudentsMap = new Map();
      [...enrolledStudentsFromEnrollments, ...enrolledStudentsFromMarketing].forEach(student => {
        const email = student.email.toLowerCase();
        if (!allEnrolledStudentsMap.has(email)) {
          allEnrolledStudentsMap.set(email, student);
        }
      });

      const allEnrolledStudents = Array.from(allEnrolledStudentsMap.values());

      if (allEnrolledStudents.length === 0) {
        console.log('No enrolled students found to notify');
      } else {
        // Filter students based on notification preferences
        // Default to true if preferences not set (to ensure all students get notified)
        const studentsToNotify = allEnrolledStudents.filter(student => {
          // Check if student has at least one notification channel enabled
          if (!student.notificationPreferences) {
            return true; // No preferences set, send notifications
          }

          // Check if at least one channel is enabled
          const emailEnabled = student.notificationPreferences.email !== false;
          const whatsappEnabled = student.notificationPreferences.whatsapp !== false;
          const pushEnabled = student.notificationPreferences.push !== false;

          // Send notification if at least one channel is enabled
          return emailEnabled || whatsappEnabled || pushEnabled;
        });
        
        if (studentsToNotify.length > 0) {
          console.log(`Sending notifications to ${studentsToNotify.length} enrolled students for new live class: ${populatedClass.subject}`);
          // Send notifications asynchronously (don't wait for completion)
          sendBulkClassNotifications(studentsToNotify, populatedClass).catch(err => {
            console.error('Error sending class notifications:', err);
          });
        } else {
          console.log('No students to notify (notification preferences disabled for all enrolled students)');
        }
      }
    } catch (notifError) {
      console.error('Notification error (non-blocking):', notifError);
    }

    res.status(201).json({
      success: true,
      data: populatedClass
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update live class
// @route   PUT /api/live-classes/:id
// @access  Private/Admin
exports.updateLiveClass = async (req, res, next) => {
  try {
    let liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    const wasCancelled = liveClass.status !== 'cancelled' && req.body.status === 'cancelled';

    liveClass = await LiveClass.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('course', 'name board class')
      .populate('teacher', 'name email')
      .populate('enrolledStudents', 'name email phone pushSubscription notificationPreferences');

    // Send cancellation notifications if class was cancelled
    if (wasCancelled && liveClass.enrolledStudents && liveClass.enrolledStudents.length > 0) {
      try {
        const studentsToNotify = liveClass.enrolledStudents.filter(student => {
          return student.notificationPreferences && (
            student.notificationPreferences.email ||
            student.notificationPreferences.whatsapp ||
            student.notificationPreferences.push
          );
        });
        
        if (studentsToNotify.length > 0) {
          const reason = req.body.cancellationReason || 'Class has been cancelled';
          for (const student of studentsToNotify) {
            sendClassCancellationNotification(student, liveClass, reason).catch(err => {
              console.error('Error sending cancellation notification:', err);
            });
          }
        }
      } catch (notifError) {
        console.error('Notification error (non-blocking):', notifError);
      }
    }

    res.status(200).json({
      success: true,
      data: liveClass
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete live class
// @route   DELETE /api/live-classes/:id
// @access  Private/Admin
exports.deleteLiveClass = async (req, res, next) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    await liveClass.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Live class deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Enroll student in live class
// @route   POST /api/live-classes/:id/enroll
// @access  Private
exports.enrollInClass = async (req, res, next) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    if (liveClass.enrolledStudents.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Student already enrolled in this class'
      });
    }

    if (liveClass.enrolledStudents.length >= liveClass.maxStudents) {
      return res.status(400).json({
        success: false,
        message: 'Class is full'
      });
    }

    liveClass.enrolledStudents.push(req.user.id);
    await liveClass.save();

    // Send notification to the newly enrolled student
    try {
      const student = await User.findById(req.user.id);
      if (student) {
        const populatedClass = await LiveClass.findById(liveClass._id)
          .populate('course', 'name board class')
          .populate('teacher', 'name email');
        
        const { sendClassScheduleNotification } = require('../utils/notificationService');
        sendClassScheduleNotification(student, populatedClass).catch(err => {
          console.error('Error sending enrollment notification:', err);
        });
      }
    } catch (notifError) {
      console.error('Notification error (non-blocking):', notifError);
    }

    res.status(200).json({
      success: true,
      data: liveClass
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

