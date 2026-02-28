const express = require('express');
const {
  getDashboardStats,
  getTeachers,
  createTeacher,
  updateTeacher
} = require('../controllers/adminController');
const { getMarketingEnrollments } = require('../controllers/marketingEnrollmentController');
const { getSettings, updateSettings } = require('../controllers/settingsController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require admin access
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/marketing-enrollments', getMarketingEnrollments);
router.route('/teachers')
  .get(getTeachers)
  .post(createTeacher);

router.route('/teachers/:id')
  .put(updateTeacher);

router.route('/settings')
  .get(getSettings)
  .put(updateSettings);

module.exports = router;

