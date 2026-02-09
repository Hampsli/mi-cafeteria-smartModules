import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import webhookManager from './webhook-manager.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = join(__dirname, '..', 'modules');

/**
 * Module Loader
 *
 * Auto-discovers modules in src/modules/<name>/index.js
 * Each module exports a manifest with:
 *   - name, version, description
 *   - events_emitted, events_subscribed
 *   - routes (Express Router)
 *   - onEvent(eventData) handler
 */

const loadedModules = new Map();

/**
 * Discover and register all modules.
 * @param {import('express').Application} app - Express app instance
 */
export async function loadModules(app) {
  let dirs;
  try {
    dirs = await readdir(MODULES_DIR, { withFileTypes: true });
  } catch (error) {
    logger.warn(`[ModuleLoader] Modules directory not found or empty: ${error.message}`);
    return;
  }

  const moduleDirs = dirs.filter((d) => d.isDirectory());

  for (const dir of moduleDirs) {
    try {
      const modulePath = join(MODULES_DIR, dir.name, 'index.js');
      const moduleManifest = await import(`file://${modulePath}`);
      const manifest = moduleManifest.default || moduleManifest;

      // Validate manifest
      if (!manifest.name || !manifest.routes) {
        logger.warn(`[ModuleLoader] Skipping "${dir.name}": missing name or routes`);
        continue;
      }

      // Register routes under /api/<module-name>/
      const prefix = `/api/${manifest.name}`;
      app.use(prefix, manifest.routes);

      // Subscribe to events this module cares about
      if (manifest.events_subscribed && manifest.onEvent) {
        for (const event of manifest.events_subscribed) {
          webhookManager.on(event, (eventData) => {
            manifest.onEvent(eventData).catch((err) => {
              logger.error(`[${manifest.name}] Error handling event "${event}": ${err.message}`);
            });
          });
        }
      }

      loadedModules.set(manifest.name, {
        name: manifest.name,
        version: manifest.version || '1.0.0',
        description: manifest.description || '',
        events_emitted: manifest.events_emitted || [],
        events_subscribed: manifest.events_subscribed || [],
        prefix,
      });

      logger.info(`[ModuleLoader] Loaded module: ${manifest.name} v${manifest.version || '1.0.0'} -> ${prefix}`);
    } catch (error) {
      logger.error(`[ModuleLoader] Failed to load module "${dir.name}": ${error.message}`);
    }
  }

  logger.info(`[ModuleLoader] ${loadedModules.size} module(s) loaded`);
}

/**
 * Get info about all loaded modules.
 */
export function getLoadedModules() {
  return Array.from(loadedModules.values());
}

export default { loadModules, getLoadedModules };
