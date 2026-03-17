const router = require('express').Router();
const ctrl = require('../controllers/checklist.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getTemplates);

module.exports = router;
