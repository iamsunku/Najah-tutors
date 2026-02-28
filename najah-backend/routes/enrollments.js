const express = require('express');
const {
  getEnrollments,
  getEnrollment,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment
} = require('../controllers/enrollmentController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, authorize('admin'), getEnrollments)
  .post(protect, createEnrollment);

router.route('/:id')
  .get(protect, authorize('admin'), getEnrollment)
  .put(protect, authorize('admin'), updateEnrollment)
  .delete(protect, authorize('admin'), deleteEnrollment);

module.exports = router;

