const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getAllMembers, getMemberById } = require('../controllers/memberController');

const router = express.Router();

router.get('/',    authenticate, authorize('owner', 'staff'), getAllMembers);
router.get('/:id', authenticate,                              getMemberById);

module.exports = router;