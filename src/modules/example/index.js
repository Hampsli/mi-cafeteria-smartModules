import routes from './routes.js';
import { handleEvent } from './controller.js';

/**
 * Example Module Manifest
 *
 * This file is auto-discovered by the module-loader.
 * Copy this entire folder to create a new module.
 */

export default {
  name: 'example',
  version: '1.0.0',
  description: 'Example module demonstrating the module pattern with CRUD and webhooks',

  // Events this module emits (for documentation / registry)
  events_emitted: ['example.created', 'example.updated', 'example.deleted'],

  // Events this module wants to listen to (from other modules / external)
  events_subscribed: [],

  // Express Router with all routes
  routes,

  // Handler called when a subscribed event fires
  onEvent: handleEvent,
};
