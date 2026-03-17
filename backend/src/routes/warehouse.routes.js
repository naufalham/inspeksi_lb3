const router = require('express').Router();
const ctrl = require('../controllers/warehouse.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.post('/', authenticate, requireAdmin, ctrl.create);
router.get('/:id', authenticate, ctrl.getById);
router.put('/:id', authenticate, requireAdmin, ctrl.update);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

module.exports = router;
