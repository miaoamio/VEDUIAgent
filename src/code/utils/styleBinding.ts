import { resolveTypographyTokenProfile } from '../../theme/volcengine-design/typography';
import { mergeUnique, toLowerTrim } from './variantNormalize';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TypographyBindingHint = {
    keyCandidates?: string[];
    idCandidates?: string[];
    nameCandidates?: string[];
};

export type TypographyBindingIndexEntry = TypographyBindingHint & {
    enabled: boolean;
    token?: string;
    baseToken?: string;
    textStyleRef?: string;
};

// ---------------------------------------------------------------------------
// Module-level mutable state
// ---------------------------------------------------------------------------

const FONT_LOAD_CACHE = new Map<string, Promise<void>>();

let TYPOGRAPHY_BINDING_INDEX: Record<string, TypographyBindingIndexEntry> | null = null;
const TEXT_STYLE_CACHE = new Map<string, TextStyle | null>();
let LOCAL_TEXT_STYLES_CACHE: TextStyle[] | null = null;
const EFFECT_STYLE_CACHE = new Map<string, EffectStyle | null>();
let LOCAL_EFFECT_STYLES_CACHE: EffectStyle[] | null = null;
const TEXT_STYLE_IMPORT_FAILED_CACHE = new Map<string, number>();
const TEXT_STYLE_IMPORT_FAILURE_TTL_MS = 5 * 60 * 1000;

// COMPONENT_DEFS reference — set via initStyleBindingDefs()
let _componentDefs: Record<string, any> = {};

export function initStyleBindingDefs(defs: Record<string, any>): void {
    _componentDefs = defs;
}

// ---------------------------------------------------------------------------
// Font helpers
// ---------------------------------------------------------------------------

export function loadFontCached(font: FontName): Promise<void> {
  const key = `${font.family}:${font.style}`;
  const cached = FONT_LOAD_CACHE.get(key);
  if (cached) return cached;
  const pending = figma.loadFontAsync(font).catch((e) => {
    console.warn('[Font] failed to load', font, e);
  });
  FONT_LOAD_CACHE.set(key, pending);
  return pending;
}

export async function ensureInterFontsLoaded(): Promise<void> {
  await Promise.all([
    loadFontCached({ family: 'Inter', style: 'Regular' }),
    loadFontCached({ family: 'Inter', style: 'Bold' }),
    loadFontCached({ family: 'Inter', style: 'Medium' })
  ]);
}

// ---------------------------------------------------------------------------
// Style ref helpers
// ---------------------------------------------------------------------------

function normalizeTextStyleRef(raw: string): string {
    let value = String(raw || '').trim();
    if (!value) return '';

    const commaIndex = value.indexOf(',');
    if (commaIndex >= 0) value = value.slice(0, commaIndex);

    if (value.startsWith('S:')) {
        value = value.slice('S:'.length);
    }

    return value.trim();
}

function getLocalTextStyles(): TextStyle[] {
    if (LOCAL_TEXT_STYLES_CACHE) {
        return LOCAL_TEXT_STYLES_CACHE;
    }
    try {
        LOCAL_TEXT_STYLES_CACHE = figma.getLocalTextStyles();
        return LOCAL_TEXT_STYLES_CACHE;
    } catch (e) {
        console.warn('[Typography] failed to read local text styles', e);
        LOCAL_TEXT_STYLES_CACHE = [];
        return LOCAL_TEXT_STYLES_CACHE;
    }
}

function getLocalEffectStyles(): EffectStyle[] {
    if (LOCAL_EFFECT_STYLES_CACHE) {
        return LOCAL_EFFECT_STYLES_CACHE;
    }
    try {
        LOCAL_EFFECT_STYLES_CACHE = figma.getLocalEffectStyles();
        return LOCAL_EFFECT_STYLES_CACHE;
    } catch (e) {
        console.warn('[EffectStyle] failed to read local effect styles', e);
        LOCAL_EFFECT_STYLES_CACHE = [];
        return LOCAL_EFFECT_STYLES_CACHE;
    }
}

// ---------------------------------------------------------------------------
// Typography binding index
// ---------------------------------------------------------------------------

export function getTypographyBindingIndex(): Record<string, TypographyBindingIndexEntry> {
    if (TYPOGRAPHY_BINDING_INDEX) {
        return TYPOGRAPHY_BINDING_INDEX;
    }

    const index: Record<string, TypographyBindingIndexEntry> = {};

    Object.values(_componentDefs).forEach((def: any) => {
        const bindings = def.typographyBindings || {};
        Object.entries(bindings).forEach(([semanticKey, binding]: [string, any]) => {
            const key = String(semanticKey || '').trim();
            if (!key) return;
            const tokenResolved = binding.token ? resolveTypographyTokenProfile(binding.token) : undefined;
            const tokenProfile = tokenResolved?.profile;

            const existing = index[key];
            const normalizedEntry: TypographyBindingIndexEntry = {
                enabled: Boolean(binding.enabled),
                token: binding.token,
                baseToken: tokenResolved?.baseToken,
                textStyleRef: binding.textStyleRef || tokenProfile?.textStyleRef,
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
                textStyleRef: existing.textStyleRef || normalizedEntry.textStyleRef,
                keyCandidates: mergeUnique(existing.keyCandidates, normalizedEntry.keyCandidates),
                idCandidates: mergeUnique(existing.idCandidates, normalizedEntry.idCandidates),
                nameCandidates: mergeUnique(existing.nameCandidates, normalizedEntry.nameCandidates)
            };
        });
    });

    TYPOGRAPHY_BINDING_INDEX = index;
    return TYPOGRAPHY_BINDING_INDEX;
}

// ---------------------------------------------------------------------------
// Component binding key finders
// ---------------------------------------------------------------------------

export function findComponentVariableKey(
    componentId: string,
    preferred: string[],
    fuzzyIncludes: string[]
): string | null {
    const def = _componentDefs[componentId];
    const bindings = def?.colorVariableBindings;
    if (!bindings) return null;

    for (const key of preferred) {
        if (bindings[key]?.enabled) return key;
    }

    for (const [key, binding] of Object.entries(bindings) as [string, any][]) {
        if (!binding?.enabled) continue;
        const normalized = key.toLowerCase();
        if (fuzzyIncludes.some((token) => normalized.includes(token.toLowerCase()))) {
            return key;
        }
    }

    return null;
}

export function findComponentTypographyKey(
    componentId: string,
    preferred: string[],
    fuzzyIncludes: string[]
): string | null {
    const def = _componentDefs[componentId];
    const bindings = def?.typographyBindings;
    if (!bindings) return null;

    for (const key of preferred) {
        if (bindings[key]?.enabled) return key;
    }

    for (const [key, binding] of Object.entries(bindings) as [string, any][]) {
        if (!binding?.enabled) continue;
        const normalized = key.toLowerCase();
        if (fuzzyIncludes.some((token) => normalized.includes(token.toLowerCase()))) {
            return key;
        }
    }

    return null;
}

// ---------------------------------------------------------------------------
// Effect style resolution & application
// ---------------------------------------------------------------------------

export async function resolveEffectStyle(bindingKey: string, refs: string[], names: string[] = []): Promise<EffectStyle | null> {
    const cacheKey = [bindingKey, ...refs, ...names].join('|');
    const cacheHit = EFFECT_STYLE_CACHE.get(cacheKey);
    if (cacheHit !== undefined) return cacheHit;

    const rawCandidates = new Set<string>(refs.filter(Boolean));
    for (const raw of rawCandidates) {
        const keyCandidate = normalizeTextStyleRef(raw);
        if (!keyCandidate) continue;

        try {
            const imported = await figma.importStyleByKeyAsync(keyCandidate);
            if (imported && imported.type === 'EFFECT') {
                const effectStyle = imported as EffectStyle;
                EFFECT_STYLE_CACHE.set(cacheKey, effectStyle);
                return effectStyle;
            }
        } catch {
            // ignore
        }

        try {
            const localByRaw = figma.getStyleById(raw) || figma.getStyleById(keyCandidate);
            if (localByRaw && localByRaw.type === 'EFFECT') {
                const effectStyle = localByRaw as EffectStyle;
                EFFECT_STYLE_CACHE.set(cacheKey, effectStyle);
                return effectStyle;
            }
        } catch {
            // ignore
        }
    }

    const nameCandidates = names
      .map(toLowerTrim)
      .filter(Boolean);
    if (nameCandidates.length > 0) {
        const localStyles = getLocalEffectStyles();
        for (const name of nameCandidates) {
            const exact = localStyles.find((style) => toLowerTrim(style.name) === name);
            if (exact) {
                EFFECT_STYLE_CACHE.set(cacheKey, exact);
                return exact;
            }
        }
        for (const name of nameCandidates) {
            const fuzzy = localStyles.find((style) => toLowerTrim(style.name).includes(name));
            if (fuzzy) {
                EFFECT_STYLE_CACHE.set(cacheKey, fuzzy);
                return fuzzy;
            }
        }
    }

    EFFECT_STYLE_CACHE.set(cacheKey, null);
    return null;
}

export async function applyEffectStyleRef(
    node: SceneNode,
    bindingKey: string,
    refs: string[],
    names: string[] = []
): Promise<boolean> {
    const effectStyle = await resolveEffectStyle(bindingKey, refs, names);
    if (!effectStyle) return false;
    try {
        (node as SceneNode & { effectStyleId?: string }).effectStyleId = effectStyle.id;
        return true;
    } catch (e) {
        console.warn(`[EffectStyle] failed to apply "${bindingKey}"`, e);
        return false;
    }
}

// ---------------------------------------------------------------------------
// Text style resolution & application
// ---------------------------------------------------------------------------

export async function resolveTextStyle(bindingKey: string): Promise<TextStyle | null> {
    const cacheHit = TEXT_STYLE_CACHE.get(bindingKey);
    if (cacheHit !== undefined) return cacheHit;

    const failedAt = TEXT_STYLE_IMPORT_FAILED_CACHE.get(bindingKey);
    if (failedAt && Date.now() - failedAt < TEXT_STYLE_IMPORT_FAILURE_TTL_MS) {
        return null;
    }

    const binding = getTypographyBindingIndex()[bindingKey];
    if (!binding || !binding.enabled) {
        TEXT_STYLE_CACHE.set(bindingKey, null);
        return null;
    }

    const sourceRef = binding.textStyleRef || '';
    const rawCandidates = new Set<string>([
        ...(sourceRef ? [sourceRef] : []),
        ...(binding.keyCandidates || []),
        ...(binding.idCandidates || [])
    ]);

    for (const raw of rawCandidates) {
        const keyCandidate = normalizeTextStyleRef(raw);
        if (!keyCandidate) continue;

        try {
            const localByRaw = figma.getStyleById(raw);
            if (localByRaw && localByRaw.type === 'TEXT') {
                const textStyle = localByRaw as TextStyle;
                TEXT_STYLE_CACHE.set(bindingKey, textStyle);
                return textStyle;
            }
        } catch {
            // ignore
        }

        if (keyCandidate !== raw) {
            try {
                const localByKey = figma.getStyleById(keyCandidate);
                if (localByKey && localByKey.type === 'TEXT') {
                    const textStyle = localByKey as TextStyle;
                    TEXT_STYLE_CACHE.set(bindingKey, textStyle);
                    return textStyle;
                }
            } catch {
                // ignore
            }
        }

        try {
            const imported = await figma.importStyleByKeyAsync(keyCandidate);
            if (imported && imported.type === 'TEXT') {
                const textStyle = imported as TextStyle;
                TEXT_STYLE_CACHE.set(bindingKey, textStyle);
                return textStyle;
            }
        } catch {
            TEXT_STYLE_IMPORT_FAILED_CACHE.set(bindingKey, Date.now());
        }
    }

    const nameCandidates = [
        ...(binding.nameCandidates || []),
        bindingKey
    ]
      .map(toLowerTrim)
      .filter(Boolean);

    if (nameCandidates.length > 0) {
        const localStyles = getLocalTextStyles();
        for (const name of nameCandidates) {
            const exact = localStyles.find((style) => toLowerTrim(style.name) === name);
            if (exact) {
                TEXT_STYLE_CACHE.set(bindingKey, exact);
                return exact;
            }
        }
        for (const name of nameCandidates) {
            const fuzzy = localStyles.find((style) => toLowerTrim(style.name).includes(name));
            if (fuzzy) {
                TEXT_STYLE_CACHE.set(bindingKey, fuzzy);
                return fuzzy;
            }
        }
    }

    console.warn(
        `[Typography] failed to resolve "${bindingKey}" token=${binding.token || '-'} base=${binding.baseToken || '-'} ref=${sourceRef || '-'} key=${(binding.keyCandidates || []).join('|')} id=${(binding.idCandidates || []).join('|')} names=${(binding.nameCandidates || []).join('|')}`
    );
    TEXT_STYLE_CACHE.set(bindingKey, null);
    return null;
}

export async function applyTextStyleBinding(
    node: TextNode,
    bindingKey: string,
    fallback?: { family: string; style: string; size?: number }
): Promise<boolean> {
    const style = await resolveTextStyle(bindingKey);
    if (style) {
        try {
            if (typeof style.fontName !== 'symbol') {
                await figma.loadFontAsync(style.fontName as FontName);
            }
            await node.setTextStyleIdAsync(style.id);
            return true;
        } catch (e) {
            console.warn(`[Typography] failed to apply style for "${bindingKey}"`, e);
        }
    }

    if (fallback) {
        try {
            const fontName: FontName = { family: fallback.family, style: fallback.style };
            await figma.loadFontAsync(fontName);
            node.fontName = fontName;
            if (typeof fallback.size === 'number') {
                node.fontSize = fallback.size;
            }
        } catch (e) {
            console.warn(`[Typography] fallback font load failed for "${bindingKey}"`, e);
        }
    }

    return false;
}
