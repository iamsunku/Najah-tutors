const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const LiveClass = require('../models/LiveClass');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const activeStudents = await User.countDocuments({ role: 'student', isActive: true });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalCourses = await Course.countDocuments();
    const activeCourses = await Course.countDocuments({ isActive: true });
    const totalEnrollments = await Enrollment.countDocuments();
    const activeEnrollments = await Enrollment.countDocuments({ status: 'active' });
    const pendingEnrollments = await Enrollment.countDocuments({ status: 'pending' });
    const totalClasses = await LiveClass.countDocuments();
    const scheduledClasses = await LiveClass.countDocuments({ status: 'scheduled' });

    // Revenue calculation
    const enrollments = await Enrollment.find({ paymentStatus: 'paid' });
    const totalRevenue = enrollments.reduce((sum, enrollment) => sum + enrollment.amount, 0);

    // Recent enrollments
    const recentEnrollments = await Enrollment.find()
      .populate('student', 'name email')
      .populate('course', 'name board class')
      .sort('-createdAt')
      .limit(5);

    // Recent students
    const recentStudents = await User.find({ role: 'student' })
      .select('name email phone class board createdAt')
      .sort('-createdAt')
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        students: {
          total: totalStudents,
          active: activeStudents
        },
        teachers: {
          total: totalTeachers
        },
        courses: {
          total: totalCourses,
          active: activeCourses
        },
        enrollments: {
          total: totalEnrollments,
          active: activeEnrollments,
          pending: pendingEnrollments
        },
        classes: {
          total: totalClasses,
          scheduled: scheduledClasses
        },
        revenue: {
          total: totalRevenue
        },
        recentEnrollments,
        recentStudents
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all teachers
// @route   GET /api/admin/teachers
// @access  Private/Admin
exports.getTeachers = async (req, res, next) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('-password').sort('-createdAt');

    res.status(200).json({
      success: true,
      count: teachers.length,
      data: teachers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create teacher
// @route   POST /api/admin/teachers
// @access  Private/Admin
exports.createTeacher = async (req, res, next) => {
  try {
    // Ensure teacher role and a backend-generated password if none is provided
    const generatedPassword =
      req.body.password && req.body.password.trim().length >= 6
        ? req.body.password
        : Math.random().toString(36).slice(-10);

    const teacher = await User.create({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      role: 'teacher',
      password: generatedPassword
    });

    res.status(201).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update teacher
// @route   PUT /api/admin/teachers/:id
// @access  Private/Admin
exports.updateTeacher = async (req, res, next) => {
  try {
    const teacher = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

