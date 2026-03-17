const router = require('express').Router();
const ctrl = require('../controllers/inspection.controller');
const checklistCtrl = require('../controllers/checklist.controller');
const findingCtrl = require('../controllers/finding.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', authenticate, ctrl.getAll);
router.post('/', authenticate, requireAdmin, ctrl.create);
router.get('/:id', authenticate, ctrl.getById);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

router.post('/:id/start', authenticate, ctrl.start);
router.post('/:id/complete', authenticate, ctrl.complete);

router.get('/:id/checklist', authenticate, checklistCtrl.getResults);
router.put('/:id/checklist', authenticate, checklistCtrl.saveResults);

router.get('/:id/findings', authenticate, findingCtrl.getByInspection);
router.post('/:id/findings', authenticate, findingCtrl.create);
router.put('/:id/findings/:findingId', authenticate, findingCtrl.update);
router.delete('/:id/findings/:findingId', authenticate, findingCtrl.remove);

router.post('/:id/photos', authenticate, upload.single('photo'), ctrl.uploadPhoto);
router.delete('/:id/photos/:photoId', authenticate, ctrl.deletePhoto);

module.exports = router;
