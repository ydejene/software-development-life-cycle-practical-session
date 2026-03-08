const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getFinancials, getOverview } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/financials', authenticate, authorize('owner'),         getFinancials);
router.get('/overview',   authenticate, authorize('owner', 'staff'), getOverview);

module.exports = router;