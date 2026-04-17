/**
 * Small Figma node utilities shared across modules.
 * Extracted from code.ts to avoid circular dependencies.
 */

export function clearNodeStrokes(node: SceneNode) {
    try {
        if ('strokes' in node) {
            (node as any).strokes = [];
        }
        if ('strokeWeight' in node) {
            (node as any).strokeWeight = 0;
        }
        if ('strokeTopWeight' in node) {
            (node as any).strokeTopWeight = 0;
        }
        if ('strokeRightWeight' in node) {
            (node as any).strokeRightWeight = 0;
        }
        if ('strokeBottomWeight' in node) {
            (node as any).strokeBottomWeight = 0;
        }
        if ('strokeLeftWeight' in node) {
            (node as any).strokeLeftWeight = 0;
        }
    } catch {
        // ignore
    }
}

export function findInstanceComponentPropertyName(instance: InstanceNode, displayName: string): string | null {
    return (
        Object.keys(instance.componentProperties || {}).find(
            (key) => key === displayName || key.startsWith(`${displayName}#`)
        ) || null
    );
}

export function findIconVariantPropertyKey(instance: InstanceNode): string | null {
    const keys = Object.keys(instance.componentProperties || {});
    if (keys.length === 0) return null;

    const byExact = keys.find((key) => key === 'Icon' || key.startsWith('Icon#'));
    if (byExact) return byExact;

    const byLower = keys.find((key) => key.split('#')[0].trim().toLowerCase() === 'icon');
    if (byLower) return byLower;

    const byCn = keys.find((key) => key.includes('图标'));
    return byCn || null;
}

export function trySetIconVariant(instance: InstanceNode, value: string): boolean {
    const key = findIconVariantPropertyKey(instance);
    if (!key) return false;
    try {
        instance.setProperties({ [key]: value });
        return true;
    } catch {
        return false;
    }
}
