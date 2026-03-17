const router = require('express').Router();
const ctrl = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth');

router.get('/dashboard', authenticate, ctrl.getDashboard);
router.get('/', authenticate, ctrl.getList);

module.exports = router;
