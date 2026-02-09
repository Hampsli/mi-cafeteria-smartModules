import * as model from './model.js';
import webhookManager from '../../core/webhook-manager.js';
import { notify } from '../../core/notifier.js';
import { success, created, notFound, badRequest } from '../../utils/response.js';
import logger from '../../utils/logger.js';

/**
 * Example Module - Business logic / route handlers.
 */

export async function list(req, res, next) {
  try {
    const items = await model.findAll();
    return success(res, items, 'Items retrieved');
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const item = await model.findById(req.params.id);
    if (!item) return notFound(res, 'Item not found');
    return success(res, item);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return badRequest(res, 'Name is required');

    const item = await model.create(req.body);

    // Dispatch webhook event
    await webhookManager.dispatch('example.created', item);

    // Send Telegram notification
    await notify(`New item created: ${item.name}`);

    return created(res, item, 'Item created');
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const item = await model.update(req.params.id, req.body);
    if (!item) return notFound(res, 'Item not found');

    await webhookManager.dispatch('example.updated', item);

    return success(res, item, 'Item updated');
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const deleted = await model.remove(req.params.id);
    if (!deleted) return notFound(res, 'Item not found');

    await webhookManager.dispatch('example.deleted', { id: req.params.id });

    return success(res, null, 'Item deleted');
  } catch (error) {
    next(error);
  }
}

/**
 * Handle incoming events from other modules or external webhooks.
 */
export async function handleEvent(eventData) {
  logger.info(`[Example] Received event: ${eventData.event}`, eventData.payload);
  // Add your cross-module reaction logic here
}

export default { list, getById, create, update, remove, handleEvent };
