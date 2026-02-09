import { Router } from 'express';
import * as controller from './controller.js';

const router = Router();

/**
 * Example Module Routes
 * Prefix: /api/example
 *
 * GET    /           -> List all items
 * GET    /:id        -> Get item by ID
 * POST   /           -> Create new item
 * PUT    /:id        -> Update item
 * DELETE /:id        -> Delete item
 */

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
