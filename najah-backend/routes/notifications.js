const express = require('express');
const {
  subscribeToPush,
  unsubscribeFromPush,
  updateNotificationPreferences,
  getVapidKey,
  sendTestNotification,
  sendClassNotification
} = require('../controllers/notificationController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/vapid-key', getVapidKey);

// Protected routes
router.post('/subscribe', protect, subscribeToPush);
router.post('/unsubscribe', protect, unsubscribeFromPush);
router.put('/preferences', protect, updateNotificationPreferences);
router.post('/test', protect, sendTestNotification);

// Admin routes
router.post('/class/:classId', protect, authorize('admin'), sendClassNotification);

module.exports = router;

