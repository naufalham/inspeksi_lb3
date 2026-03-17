const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, requireAdmin, ctrl.getAll);
router.post('/', authenticate, requireAdmin, ctrl.create);
router.put('/:id', authenticate, requireAdmin, ctrl.update);

module.exports = router;
