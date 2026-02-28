const express = require('express');
const { createMarketingEnrollment, getMyMarketingEnrollments } = require('../controllers/marketingEnrollmentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public marketing enrollment endpoint
router.post('/', createMarketingEnrollment);

// Authenticated student invoices endpoint
router.get('/me', protect, getMyMarketingEnrollments);

module.exports = router;
