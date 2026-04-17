/**
 * Form layout helpers (Category B).
 * These functions mutate Figma nodes but do NOT call renderComponent.
 * Extracted from code.ts.
 */

import {
    isFormLabelWrapNode,
    resolveFormControlWidthMode,
} from './form-queries';

// ── Local helpers ───────────────────────────────────────────────────

function toPositiveNumber(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
}

// ── alignFormLabelWidths ────────────────────────────────────────────

export async function alignFormLabelWidths(form: FrameNode, sourceNodes: SceneNode[] = []) {
    const labelWraps: FrameNode[] = [];

    const collectLabelWraps = (node: SceneNode) => {
        if (isFormLabelWrapNode(node)) {
            labelWraps.push(node as FrameNode);
        }
        if ('children' in node) {
            for (const child of node.children) {
                collectLabelWraps(child as SceneNode);
            }
        }
    };

    collectLabelWraps(form);
    if (labelWraps.length === 0) return;

    // 临时设置为 AUTO 以获取所有标签的真实宽度
    const minWidths: number[] = [];
    for (const wrap of labelWraps) {
        const minWidthStr = wrap.getPluginData('form-label-min-width');
        const minWidth = minWidthStr ? Number(minWidthStr) : 0;
        minWidths.push(Number.isFinite(minWidth) && minWidth > 0 ? minWidth : 0);
        wrap.primaryAxisSizingMode = 'AUTO';
    }

    // 强制等待 Figma 布局引擎计算完成
    await new Promise(r => setTimeout(r, 0));

    // 始终取所有标签容器中的最大真实宽度
    let maxWidth = 0;
    for (let i = 0; i < labelWraps.length; i++) {
        const wrap = labelWraps[i];
        const minWidth = minWidths[i];
        const autoWidth = wrap.width; // 此时应为真实 auto 宽度
        const finalWidth = Math.max(minWidth, autoWidth);
        if (finalWidth > maxWidth) maxWidth = finalWidth;
    }

    if (!Number.isFinite(maxWidth) || maxWidth <= 0) return;

    // 恢复为 FIXED 并设置为最大宽度
    for (const wrap of labelWraps) {
        try {
            wrap.primaryAxisSizingMode = 'FIXED';
            wrap.resize(maxWidth, wrap.height);
        } catch {}
    }
}

// ── applyFormControlWidthModeToNode ─────────────────────────────────

export interface FormLayoutContext {
    setFillWidthPreserveHeight: (node: SceneNode) => void;
    setFixedWidth: (node: SceneNode, width: number) => void;
}

export function applyFormControlWidthModeToNode(
    ctx: FormLayoutContext,
    node: SceneNode,
    params: Record<string, any>
): void {
    const mode = resolveFormControlWidthMode(params);
    if (mode === 'fill') {
        ctx.setFillWidthPreserveHeight(node);
        return;
    }
    const width = toPositiveNumber(params.controlWidth) ?? toPositiveNumber(params.width);
    if (width !== null) {
        ctx.setFixedWidth(node, width);
        return;
    }
    if ('layoutSizingHorizontal' in node) {
        try {
            (node as any).layoutSizingHorizontal = 'FIXED';
        } catch {}
    }
    if ('layoutGrow' in node) {
        try {
            (node as any).layoutGrow = 0;
        } catch {}
    }
    if ('layoutAlign' in node) {
        try {
            (node as any).layoutAlign = 'INHERIT';
        } catch {}
    }
}

// ── normalizeFormControlVerticalSizing ───────────────────────────────

export function normalizeFormControlVerticalSizing(node: SceneNode): void {
    if ('layoutSizingVertical' in node) {
        try {
            (node as any).layoutSizingVertical = 'FIXED';
        } catch {}
    }
    if ('layoutAlign' in node) {
        try {
            (node as any).layoutAlign = 'INHERIT';
        } catch {}
    }
}

// ── setNodeClipsContent ─────────────────────────────────────────────

export function setNodeClipsContent(node: SceneNode, enabled: boolean): void {
    if (!('clipsContent' in node)) return;
    try {
        (node as FrameNode | ComponentNode | InstanceNode).clipsContent = enabled;
    } catch {
        // ignore nodes that cannot be mutated in the current context
    }
}

// ── preserveNodeHeight ──────────────────────────────────────────────

export function preserveNodeHeight(node: SceneNode, height: number | null): void {
    if (!height || !Number.isFinite(height) || height <= 0) return;
    if ('resize' in node) {
        try {
            const width = 'width' in node ? node.width : (node as any).width;
            (node as any).resize(width, height);
        } catch {}
    }
}
