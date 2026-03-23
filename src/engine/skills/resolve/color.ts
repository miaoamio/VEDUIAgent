import { COMPONENT_REGISTRY } from '../../../registry';
import { resolveColorTokenProfile } from '../../../theme/volcengine-design/color-tokens';

type ColorVariableHint = {
  keyCandidates?: string[];
  idCandidates?: string[];
  nameCandidates?: string[];
};

type ResolveColorVariableOptions = {
  allowCreateToken?: boolean;
};

type ColorVariableBindingIndexEntry = ColorVariableHint & {
  enabled: boolean;
  token?: string;
  baseToken?: string;
  variableRef?: string;
};

const COMPONENT_DEFS = COMPONENT_REGISTRY.components;
let COLOR_VARIABLE_BINDING_INDEX: Record<string, ColorVariableBindingIndexEntry> | null = null;
const COLOR_VARIABLE_CACHE = new Map<string, Variable | null>();
let LOCAL_COLOR_VARIABLES_CACHE: Variable[] | null = null;
const TOKEN_COLOR_COLLECTION_NAME = 'UI Agent Theme Tokens';
let TOKEN_COLOR_COLLECTION_CACHE: VariableCollection | null | undefined = undefined;

const THEME_TOKENS: { [key: string]: { light: string; dark: string } } = {
  'bg-base': { light: '#FFFFFF', dark: '#1F1F1F' },
  'bg-secondary': { light: '#F5F5F5', dark: '#2C2C2C' },
  'text-primary': { light: '#0C0D0E', dark: '#FFFFFF' },
  'text-secondary': { light: '#42464E', dark: '#A0A0A0' },
  'border-base': { light: '#EAEDF1', dark: '#333333' },
  'brand-primary': { light: '#1664FF', dark: '#3D7EFF' },
  'success-bg': { light: '#F6FFED', dark: '#135200' },
  'success-text': { light: '#52C41A', dark: '#73D13D' }
};

let currentTheme: 'light' | 'dark' = 'light';

export function setCurrentTheme(theme: 'light' | 'dark') {
  currentTheme = theme;
}

function mergeUnique(base: string[] | undefined, incoming: string[] | undefined): string[] | undefined {
  const merged = new Set<string>();
  (base || []).forEach((value) => {
    const normalized = String(value || '').trim();
    if (normalized) merged.add(normalized);
  });
  (incoming || []).forEach((value) => {
    const normalized = String(value || '').trim();
    if (normalized) merged.add(normalized);
  });
  if (merged.size === 0) return undefined;
  return Array.from(merged);
}

function normalizeVariableRef(raw: string): string {
  let key = String(raw || '').trim();
  if (!key) return '';
  if (key.startsWith('VariableID:')) {
    key = key.replace('VariableID:', '');
  }
  if (key.startsWith('VariableId:')) {
    key = key.replace('VariableId:', '');
  }
  return key.trim();
}

function toLowerTrim(value: string): string {
  return value.trim().toLowerCase();
}

function getColorVariableBindingIndex(): Record<string, ColorVariableBindingIndexEntry> {
  if (COLOR_VARIABLE_BINDING_INDEX) {
    return COLOR_VARIABLE_BINDING_INDEX;
  }

  const index: Record<string, ColorVariableBindingIndexEntry> = {};

  Object.values(COMPONENT_DEFS).forEach((def) => {
    const bindings = def.colorVariableBindings || {};
    Object.entries(bindings).forEach(([semanticKey, binding]) => {
      const key = String(semanticKey || '').trim();
      if (!key) return;
      const tokenResolved = binding.token ? resolveColorTokenProfile(binding.token) : undefined;
      const tokenProfile = tokenResolved?.profile;

      const existing = index[key];
      const normalizedEntry: ColorVariableBindingIndexEntry = {
        enabled: Boolean(binding.enabled),
        token: binding.token,
        baseToken: tokenResolved?.baseToken,
        variableRef: binding.variableRef || tokenProfile?.variableRef,
        keyCandidates: mergeUnique(tokenProfile?.keyCandidates, binding.keyCandidates),
        idCandidates: mergeUnique(tokenProfile?.idCandidates, binding.idCandidates),
        nameCandidates: mergeUnique(tokenProfile?.nameCandidates, binding.nameCandidates)
      };

      if (!existing) {
        index[key] = normalizedEntry;
        return;
      }

      index[key] = {
        enabled: existing.enabled || normalizedEntry.enabled,
        token: existing.token || normalizedEntry.token,
        baseToken: existing.baseToken || normalizedEntry.baseToken,
        variableRef: existing.variableRef || normalizedEntry.variableRef,
        keyCandidates: mergeUnique(existing.keyCandidates, normalizedEntry.keyCandidates),
        idCandidates: mergeUnique(existing.idCandidates, normalizedEntry.idCandidates),
        nameCandidates: mergeUnique(existing.nameCandidates, normalizedEntry.nameCandidates)
      };
    });
  });

  COLOR_VARIABLE_BINDING_INDEX = index;
  return COLOR_VARIABLE_BINDING_INDEX;
}

async function getLocalColorVariables(): Promise<Variable[]> {
  if (LOCAL_COLOR_VARIABLES_CACHE) return LOCAL_COLOR_VARIABLES_CACHE;
  if (typeof figma.variables === 'undefined') return [];

  try {
    const variables = await figma.variables.getLocalVariablesAsync();
    LOCAL_COLOR_VARIABLES_CACHE = variables.filter((v) => v.resolvedType === 'COLOR');
    return LOCAL_COLOR_VARIABLES_CACHE;
  } catch (e) {
    console.warn('Failed to read local color variables:', e);
    LOCAL_COLOR_VARIABLES_CACHE = [];
    return LOCAL_COLOR_VARIABLES_CACHE;
  }
}

async function getOrCreateTokenColorCollection(): Promise<VariableCollection | null> {
  if (TOKEN_COLOR_COLLECTION_CACHE !== undefined) {
    return TOKEN_COLOR_COLLECTION_CACHE;
  }
  if (typeof figma.variables === 'undefined') {
    TOKEN_COLOR_COLLECTION_CACHE = null;
    return TOKEN_COLOR_COLLECTION_CACHE;
  }

  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const existing = collections.find((collection) => collection.name === TOKEN_COLOR_COLLECTION_NAME);
    if (existing) {
      TOKEN_COLOR_COLLECTION_CACHE = existing;
      return TOKEN_COLOR_COLLECTION_CACHE;
    }

    const created = figma.variables.createVariableCollection(TOKEN_COLOR_COLLECTION_NAME);
    TOKEN_COLOR_COLLECTION_CACHE = created;
    return TOKEN_COLOR_COLLECTION_CACHE;
  } catch (e) {
    console.warn('[ColorVar] failed to get/create token collection', e);
    TOKEN_COLOR_COLLECTION_CACHE = null;
    return TOKEN_COLOR_COLLECTION_CACHE;
  }
}

async function ensureTokenColorVariable(token: string, fallbackHex: string): Promise<Variable | null> {
  if (typeof figma.variables === 'undefined') return null;

  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) return null;

  const localVariables = await getLocalColorVariables();
  const tokenNames = [normalizedToken, `UIAgent/${normalizedToken}`].map(toLowerTrim);
  const existing = localVariables.find((variable) => tokenNames.includes(toLowerTrim(variable.name)));
  if (existing) return existing;

  const collection = await getOrCreateTokenColorCollection();
  if (!collection) return null;
  if (!collection.modes || collection.modes.length === 0) return null;

  try {
    const variable = figma.variables.createVariable(normalizedToken, collection, 'COLOR');
    const fallbackColor = parseColor(fallbackHex);
    const colorValue: RGBA = { ...fallbackColor, a: 1 };
    collection.modes.forEach((mode) => {
      variable.setValueForMode(mode.modeId, colorValue);
    });

    if (LOCAL_COLOR_VARIABLES_CACHE) {
      LOCAL_COLOR_VARIABLES_CACHE = [...LOCAL_COLOR_VARIABLES_CACHE, variable];
    }
    return variable;
  } catch (e) {
    console.warn(`[ColorVar] failed to create local token variable "${normalizedToken}"`, e);
    return null;
  }
}

async function resolveColorVariable(
  variableKey: string,
  fallbackHex?: string,
  options?: ResolveColorVariableOptions
): Promise<Variable | null> {
  const allowCreateToken = options?.allowCreateToken !== false;
  const cacheKey = allowCreateToken ? variableKey : `${variableKey}::strict`;
  const cacheHit = COLOR_VARIABLE_CACHE.get(cacheKey);
  if (cacheHit !== undefined) return cacheHit;

  if (typeof figma.variables === 'undefined') {
    console.warn(`[ColorVar] figma.variables unavailable; skip binding for "${variableKey}"`);
    COLOR_VARIABLE_CACHE.set(cacheKey, null);
    return null;
  }

  const binding = getColorVariableBindingIndex()[variableKey];
  if (!binding || !binding.enabled) {
    console.warn(`[ColorVar] binding missing or disabled for "${variableKey}"`);
    COLOR_VARIABLE_CACHE.set(cacheKey, null);
    return null;
  }

  const sourceRef = binding.variableRef || '';
  const rawCandidates = new Set<string>([
    ...(sourceRef ? [sourceRef] : []),
    ...(binding.keyCandidates || []),
    ...(binding.idCandidates || [])
  ]);

  for (const raw of rawCandidates) {
    const candidate = normalizeVariableRef(raw);
    if (!candidate) continue;

    try {
      const imported = await figma.variables.importVariableByKeyAsync(candidate);
      if (imported && imported.resolvedType === 'COLOR') {
        COLOR_VARIABLE_CACHE.set(cacheKey, imported);
        return imported;
      }
    } catch {
    }

    try {
      const byId = await figma.variables.getVariableByIdAsync(raw);
      if (byId && byId.resolvedType === 'COLOR') {
        COLOR_VARIABLE_CACHE.set(cacheKey, byId);
        return byId;
      }
    } catch {
    }

    if (candidate !== raw) {
      try {
        const byNormalizedId = await figma.variables.getVariableByIdAsync(candidate);
        if (byNormalizedId && byNormalizedId.resolvedType === 'COLOR') {
          COLOR_VARIABLE_CACHE.set(cacheKey, byNormalizedId);
          return byNormalizedId;
        }
      } catch {
      }
    }
  }

  const nameCandidates = [
    ...(binding.nameCandidates || []),
    variableKey
  ];

  const localColors = await getLocalColorVariables();
  const localColorsCount = localColors.length;
  if (localColorsCount > 0) {
    for (const rawName of nameCandidates) {
      const name = toLowerTrim(rawName);
      if (!name) continue;
      const exact = localColors.find((v) => toLowerTrim(v.name) === name);
      if (exact) {
        COLOR_VARIABLE_CACHE.set(cacheKey, exact);
        return exact;
      }
    }
    for (const rawName of nameCandidates) {
      const name = toLowerTrim(rawName);
      if (!name) continue;
      const fuzzy = localColors.find((v) => toLowerTrim(v.name).includes(name));
      if (fuzzy) {
        COLOR_VARIABLE_CACHE.set(cacheKey, fuzzy);
        return fuzzy;
      }
    }
  }

  const tokenForCreate = binding.token || binding.baseToken || variableKey;
  if (allowCreateToken && fallbackHex) {
    const created = await ensureTokenColorVariable(tokenForCreate, fallbackHex);
    if (created && created.resolvedType === 'COLOR') {
      COLOR_VARIABLE_CACHE.set(cacheKey, created);
      console.info(`[ColorVar] created local variable for token "${tokenForCreate}" (semantic=${binding.token || '-'}) and bound to "${variableKey}"`);
      return created;
    }
  }

  console.warn(
    `[ColorVar] failed to resolve "${variableKey}" token=${binding.token || '-'} base=${binding.baseToken || '-'} ref=${sourceRef || '-'} localColors=${localColorsCount} key=${(binding.keyCandidates || []).join('|')} id=${(binding.idCandidates || []).join('|')} names=${(binding.nameCandidates || []).join('|')}`
  );
  COLOR_VARIABLE_CACHE.set(cacheKey, null);
  return null;
}

type PaintProperty = 'fills' | 'strokes';
type PaintBindingNode = SceneNode & {
  fills?: readonly Paint[] | PluginAPI['mixed'];
  strokes?: readonly Paint[] | PluginAPI['mixed'];
};
type EffectBindingNode = SceneNode & {
  effects?: readonly Effect[] | PluginAPI['mixed'];
};

async function bindVariableToPaintProperty(
  node: SceneNode,
  variableKey: string,
  property: PaintProperty,
  fallbackColor: RGB,
  fallbackHex: string
): Promise<boolean> {
  if (typeof figma.variables === 'undefined') return false;

  const paintNode = node as PaintBindingNode;
  if (!(property in paintNode)) return false;

  const variable = await resolveColorVariable(variableKey, fallbackHex);
  if (!variable) return false;

  try {
    const currentPaints = (paintNode[property] === figma.mixed || !paintNode[property])
      ? []
      : [...(paintNode[property] as Paint[])];
    const paints = currentPaints.length > 0
      ? currentPaints
      : [{ type: 'SOLID', color: fallbackColor } as SolidPaint];

    const boundPaints = paints.map((paint) => {
      if (paint.type === 'SOLID') {
        return figma.variables.setBoundVariableForPaint(paint, 'color', variable);
      }
      return paint;
    });

    (paintNode as any)[property] = boundPaints;
    return true;
  } catch (e) {
    console.warn(`Failed to bind variable ${variableKey} to ${property}:`, e);
    return false;
  }
}

async function bindVariableToEffectProperty(
  node: SceneNode,
  effectIndex: number,
  variableKey: string,
  fallbackHex: string
): Promise<boolean> {
  if (typeof figma.variables === 'undefined') return false;

  const effectNode = node as EffectBindingNode;
  if (!('effects' in effectNode)) return false;

  const variable = await resolveColorVariable(variableKey, fallbackHex, { allowCreateToken: false });
  if (!variable) return false;

  try {
    const currentEffects = (effectNode.effects === figma.mixed || !effectNode.effects)
      ? []
      : [...(effectNode.effects as Effect[])];
    const currentEffect = currentEffects[effectIndex];
    if (!currentEffect) return false;

    currentEffects[effectIndex] = figma.variables.setBoundVariableForEffect(currentEffect, 'color', variable);
    (effectNode as any).effects = currentEffects;
    return true;
  } catch (e) {
    console.warn(`Failed to bind variable ${variableKey} to effects[${effectIndex}].color:`, e);
    return false;
  }
}

function resolveThemeFallbackHex(variableKey: string, fallbackHex: string): string {
  if (variableKey === 'bg-var-key' || variableKey === 'layout-bg-key') {
    if (fallbackHex === '#F5F5F5') return THEME_TOKENS['bg-secondary'][currentTheme];
    if (fallbackHex === '#FFFFFF') return THEME_TOKENS['bg-base'][currentTheme];
    return fallbackHex;
  }
  if (variableKey === 'layout-border-key' || variableKey === 'input-border-key' || variableKey === 'select-border-key') {
    return fallbackHex === '#EAEDF1' ? THEME_TOKENS['border-base'][currentTheme] : fallbackHex;
  }
  if (variableKey === 'text-primary-key' || variableKey === 'table-cell-text-key') {
    return fallbackHex === '#0C0D0E' ? THEME_TOKENS['text-primary'][currentTheme] : fallbackHex;
  }
  if (variableKey === 'text-secondary-key' || variableKey === 'table-header-text-key') {
    return fallbackHex === '#42464E' ? THEME_TOKENS['text-secondary'][currentTheme] : fallbackHex;
  }
  if (variableKey === 'btn-primary-bg') {
    return fallbackHex === '#1890FF' ? THEME_TOKENS['brand-primary'][currentTheme] : fallbackHex;
  }
  if (variableKey === 'table-action-primary-key') {
    return THEME_TOKENS['brand-primary'][currentTheme];
  }
  if (variableKey === 'table-action-icon-key') {
    return THEME_TOKENS['text-secondary'][currentTheme];
  }
  if (variableKey === 'table-cell-bg-key') {
    return fallbackHex === '#FFFFFF' ? THEME_TOKENS['bg-base'][currentTheme] : fallbackHex;
  }
  if (variableKey === 'table-header-bg-key') {
    return fallbackHex === '#F5F5F5' ? THEME_TOKENS['bg-secondary'][currentTheme] : fallbackHex;
  }
  if (variableKey === 'table-border-key') {
    return fallbackHex === '#EAEDF1' ? THEME_TOKENS['border-base'][currentTheme] : fallbackHex;
  }
  return fallbackHex;
}

export async function applyColorVariable(node: SceneNode, variableKey: string, fallbackHex: string) {
  const colorHex = resolveThemeFallbackHex(variableKey, fallbackHex);
  const color = parseColor(colorHex);
  const bound = await bindVariableToPaintProperty(node, variableKey, 'fills', color, colorHex);
  if (bound) return;

  if ('fills' in node) {
    (node as any).fills = [{ type: 'SOLID', color }];
  }
}

export async function applyStrokeColorVariable(node: SceneNode, variableKey: string, fallbackHex: string) {
  const colorHex = resolveThemeFallbackHex(variableKey, fallbackHex);
  const color = parseColor(colorHex);
  const bound = await bindVariableToPaintProperty(node, variableKey, 'strokes', color, colorHex);
  if (bound) return;

  if ('strokes' in node) {
    (node as any).strokes = [{ type: 'SOLID', color }];
  }
}

export async function applyEffectColorVariable(
  node: SceneNode,
  effectIndex: number,
  variableKey: string,
  fallbackHex: string
) {
  const colorHex = resolveThemeFallbackHex(variableKey, fallbackHex);
  const color = parseColor(colorHex);
  const bound = await bindVariableToEffectProperty(node, effectIndex, variableKey, colorHex);
  if (bound) return;

  const effectNode = node as EffectBindingNode;
  if (!('effects' in effectNode)) return;
  const currentEffects = (effectNode.effects === figma.mixed || !effectNode.effects)
    ? []
    : [...(effectNode.effects as Effect[])];
  const currentEffect = currentEffects[effectIndex];
  if (!currentEffect || !('color' in currentEffect)) return;

  const alpha = typeof currentEffect.color?.a === 'number' ? currentEffect.color.a : 1;
  currentEffects[effectIndex] = {
    ...currentEffect,
    color: { ...color, a: alpha }
  } as Effect;
  (effectNode as any).effects = currentEffects;
}

export function parseColor(hex: string): RGB {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized.split('').map((c) => c + c).join('');
  }
  const r = parseInt(normalized.substring(0, 2), 16) / 255;
  const g = parseInt(normalized.substring(2, 4), 16) / 255;
  const b = parseInt(normalized.substring(4, 6), 16) / 255;
  return { r, g, b };
}
