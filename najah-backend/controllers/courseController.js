const Course = require('../models/Course');
const User = require('../models/User');
const { sendCourseCreationNotification } = require('../utils/notificationService');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
exports.getCourses = async (req, res, next) => {
  try {
    const { board, class: studentClass } = req.query;
    
    let query = { isActive: true };
    if (board) query.board = board;
    if (studentClass) query.class = studentClass;

    const courses = await Course.find(query).populate('createdBy', 'name email').sort('-createdAt');

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
exports.getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).populate('createdBy', 'name email');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create course
// @route   POST /api/courses
// @access  Private/Admin
exports.createCourse = async (req, res, next) => {
  try {
    req.body.createdBy = req.user.id;
    const course = await Course.create(req.body);

    // Send notifications to students matching the course board and class
    try {
      // Find students matching the course board and class
      const query = {
        role: 'student',
        isActive: true
      };

      if (course.board) {
        query.board = course.board;
      }
      if (course.class) {
        query.class = course.class;
      }

      const students = await User.find(query).select('name email phone notificationPreferences');

      if (students.length > 0) {
        // Filter students based on notification preferences
        const studentsToNotify = students.filter(student => {
          if (!student.notificationPreferences) {
            return true; // No preferences set, send notifications
          }
          const emailEnabled = student.notificationPreferences.email !== false;
          const whatsappEnabled = student.notificationPreferences.whatsapp !== false;
          return emailEnabled || whatsappEnabled;
        });

        if (studentsToNotify.length > 0) {
          console.log(`Sending course creation notifications to ${studentsToNotify.length} students for course: ${course.name}`);
          
          // Send notifications asynchronously (don't wait for completion)
          Promise.all(
            studentsToNotify.map(student => 
              sendCourseCreationNotification(student, course).catch(err => {
                console.error(`Error sending notification to ${student.email}:`, err);
              })
            )
          ).catch(err => {
            console.error('Error sending course creation notifications:', err);
          });
        } else {
          console.log('No students to notify (notification preferences disabled for all matching students)');
        }
      } else {
        console.log('No matching students found to notify about new course');
      }
    } catch (notifError) {
      console.error('Notification error (non-blocking):', notifError);
    }

    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Admin
exports.updateCourse = async (req, res, next) => {
  try {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    await course.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

