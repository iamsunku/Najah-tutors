const express = require('express');
const {
  getStudents,
  getStudent,
  enrollStudent,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, authorize('admin'), getStudents)
  .post(enrollStudent);

router.route('/:id')
  .get(protect, authorize('admin'), getStudent)
  .put(protect, authorize('admin'), updateStudent)
  .delete(protect, authorize('admin'), deleteStudent);

module.exports = router;

