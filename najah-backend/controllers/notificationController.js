const User = require('../models/User');
const LiveClass = require('../models/LiveClass');
const { 
  sendClassScheduleNotification, 
  sendBulkClassNotifications,
  sendClassCancellationNotification,
  getVapidPublicKey 
} = require('../utils/notificationService');

// @desc    Subscribe to push notifications
// @route   POST /api/notifications/subscribe
// @access  Private
exports.subscribeToPush = async (req, res, next) => {
  try {
    const { subscription } = req.body;

    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: 'Push subscription is required'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { pushSubscription: subscription },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Successfully subscribed to push notifications',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Unsubscribe from push notifications
// @route   POST /api/notifications/unsubscribe
// @access  Private
exports.unsubscribeFromPush = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { pushSubscription: null },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from push notifications'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
exports.updateNotificationPreferences = async (req, res, next) => {
  try {
    const { email, whatsapp, push } = req.body;

    const updateData = {};
    if (email !== undefined) updateData['notificationPreferences.email'] = email;
    if (whatsapp !== undefined) updateData['notificationPreferences.whatsapp'] = whatsapp;
    if (push !== undefined) updateData['notificationPreferences.push'] = push;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated',
      data: user.notificationPreferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get VAPID public key for push notifications
// @route   GET /api/notifications/vapid-key
// @access  Public
exports.getVapidKey = async (req, res, next) => {
  try {
    const publicKey = getVapidPublicKey();
    
    if (!publicKey) {
      return res.status(503).json({
        success: false,
        message: 'Push notifications not configured'
      });
    }

    res.status(200).json({
      success: true,
      data: { publicKey }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send test notification
// @route   POST /api/notifications/test
// @access  Private
exports.sendTestNotification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only allow students to test notifications
    if (user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Test notifications are only available for students'
      });
    }

    // Create a dummy live class for testing
    const testClass = {
      _id: 'test',
      subject: 'Test Class',
      board: user.board || 'CBSE',
      className: user.class || '10th',
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      timeSlot: '10:00 AM - 11:00 AM',
      days: ['Mon', 'Wed', 'Fri'],
      meetingLink: 'https://example.com/meeting'
    };

    const results = await sendClassScheduleNotification(user, testClass);

    res.status(200).json({
      success: true,
      message: `Test notification sent to ${user.email}`,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send notification for a specific live class to enrolled students
// @route   POST /api/notifications/class/:classId
// @access  Private/Admin
exports.sendClassNotification = async (req, res, next) => {
  try {
    const liveClass = await LiveClass.findById(req.params.classId)
      .populate('enrolledStudents', 'name email phone pushSubscription notificationPreferences');

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    if (!liveClass.enrolledStudents || liveClass.enrolledStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No students enrolled in this class'
      });
    }

    // Filter students based on their notification preferences
    const studentsToNotify = liveClass.enrolledStudents.filter(student => {
      return student.notificationPreferences && (
        student.notificationPreferences.email ||
        student.notificationPreferences.whatsapp ||
        student.notificationPreferences.push
      );
    });

    const results = await sendBulkClassNotifications(studentsToNotify, liveClass);

    res.status(200).json({
      success: true,
      message: `Notifications sent to ${results.length} students`,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

