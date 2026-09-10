import { DEFAULT_CATALOG, DEFAULT_RESOURCES } from './courses.js';
import type { EngineConfig } from './types.js';

export const DEFAULT_CONFIG: EngineConfig = Object.freeze({
  catalog: DEFAULT_CATALOG,
  resources: DEFAULT_RESOURCES,
});

export function resolveConfig(overrides?: Partial<EngineConfig>): EngineConfig {
  return { ...DEFAULT_CONFIG, ...(overrides ?? {}) };
}
