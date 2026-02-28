const express = require('express');
const {
  getLiveClasses,
  getLiveClass,
  createLiveClass,
  updateLiveClass,
  deleteLiveClass,
  enrollInClass
} = require('../controllers/liveClassController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getLiveClasses)
  .post(protect, authorize('admin'), createLiveClass);

router.route('/:id')
  .get(getLiveClass)
  .put(protect, authorize('admin'), updateLiveClass)
  .delete(protect, authorize('admin'), deleteLiveClass);

router.post('/:id/enroll', protect, enrollInClass);

module.exports = router;

