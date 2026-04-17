/**
 * Form operations (Category C).
 * These functions call renderComponent and other code.ts internals
 * through dependency injection (FormOperationContext).
 * Extracted from code.ts.
 */

import { ComponentInstance } from '../../types';
import { readNodeParams, writeNodeParams } from '../utils/nodeSnapshot';
import { applyTextStyleBinding } from '../utils/styleBinding';
import {
    collectFormFieldInstances,
    collectFormItemNodes,
    inheritFormFieldParams,
    isFormItemInstance,
    normalizeFormAlign,
    normalizeFormChildInstance,
    normalizeFormControlWidthMode,
    normalizeFormItemCount,
    patchFormInstanceSnapshot,
    resolveFormControlWidth,
    resolveFormControlWidthMode,
    resolveFormFieldLayout,
    resolveFormLabelControlSpacing,
    resolveFormLabelWidth,
    syncFormItemLabelsFromNode,
} from './form-queries';
import { alignFormLabelWidths } from './form-layout';

// ── Local helpers ───────────────────────────────────────────────────

function toPositiveNumber(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Context – dependency injection for code.ts internals ────────────

export interface FormOperationContext {
    renderComponent: (instance: ComponentInstance, opts?: { isRoot?: boolean }) => Promise<SceneNode>;
    replaceSceneNode: (oldNode: SceneNode, newNode: SceneNode) => boolean;
    applyNodeSize: (node: SceneNode, width: number | null, height: number | null) => void;
    applyColorVariable: (node: SceneNode, bindingKey: string, fallbackHex: string) => Promise<void>;
    buildComponentInstanceFromNode: (node: SceneNode) => ComponentInstance | null;
    readComponentInstanceSnapshot: (node: SceneNode) => ComponentInstance | null;
    writeComponentInstanceSnapshot: (node: SceneNode, instance: ComponentInstance) => void;
    resolveFormLayoutParamsUpdate: (prevParams: Record<string, any>, nextParams: Record<string, any>) => Record<string, any>;
}

// ── resolveAutoFormLabelWidth ───────────────────────────────────────

export async function resolveAutoFormLabelWidth(
    formParams: Record<string, any>,
    instance: ComponentInstance
): Promise<number> {
    if (!Array.isArray(instance.children)) return 0;
    const fields = instance.children.flatMap((child) => collectFormFieldInstances(child));
    if (fields.length === 0) return 0;

    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    const tempText = figma.createText();
    tempText.visible = false;
    tempText.fontName = { family: 'Inter', style: 'Regular' };
    tempText.fontSize = 13;
    figma.currentPage.appendChild(tempText);
    tempText.textAutoResize = 'WIDTH_AND_HEIGHT';

    let maxWidth = 0;
    for (const field of fields) {
        const inherited = inheritFormFieldParams(formParams, field);
        const fieldParams = inherited.params || {};
        const layout = resolveFormFieldLayout(fieldParams);
        if (layout === 'vertical') continue;
        const label = String(fieldParams.label || '').trim();
        if (!label) continue;
        const textValue = `${label}${fieldParams.showColon === false ? '' : '：'}`;
        tempText.characters = textValue;

        let fieldWidth = tempText.width;
        if (fieldParams.required) {
            fieldWidth += 14 + 4; // Add width for the required asterisk icon and spacing
        }
        if (fieldWidth > maxWidth) maxWidth = fieldWidth;
    }

    tempText.remove();
    // Add a 2px safety buffer to ensure alignment doesn't break due to sub-pixel rounding
    return Math.ceil(maxWidth) + 2;
}

// ── resolveFormContentWidth ─────────────────────────────────────────

export async function resolveFormContentWidth(
    instance: ComponentInstance,
    resolvedFormParams: Record<string, any>
): Promise<number | null> {
    if (!Array.isArray(instance.children)) return null;
    const fields = instance.children.flatMap((child) => collectFormFieldInstances(child));
    if (fields.length === 0) return null;

    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    const tempText = figma.createText();
    tempText.visible = false;
    tempText.fontName = { family: 'Inter', style: 'Regular' };
    tempText.fontSize = 13;
    figma.currentPage.appendChild(tempText);
    tempText.textAutoResize = 'WIDTH_AND_HEIGHT';

    let maxWidth = 0;
    for (const field of fields) {
        const inherited = inheritFormFieldParams(resolvedFormParams, field);
        const fieldParams = inherited.params || {};
        const layout = resolveFormFieldLayout(fieldParams);
        const label = String(fieldParams.label || '').trim();
        let labelTextWidth = 0;
        if (label) {
            tempText.characters = `${label}${fieldParams.showColon === false ? '' : '：'}`;
            labelTextWidth = tempText.width;
            if (fieldParams.required) {
                labelTextWidth += 14 + 4; // Add width for the required asterisk icon and spacing
            }
        }
        const controlWidth = resolveFormControlWidth(fieldParams);
        if (layout === 'vertical') {
            maxWidth = Math.max(maxWidth, Math.ceil(Math.max(labelTextWidth, controlWidth)));
        } else {
            if (!label) {
                maxWidth = Math.max(maxWidth, Math.ceil(controlWidth));
                continue;
            }
            const labelWidth = resolveFormLabelWidth(fieldParams);
            const spacing = resolveFormLabelControlSpacing(fieldParams, layout);
            maxWidth = Math.max(maxWidth, Math.ceil(labelWidth + spacing + controlWidth));
        }
    }

    tempText.remove();
    return maxWidth > 0 ? maxWidth : null;
}

// ── resolveFormParamsForRender ───────────────────────────────────────

export async function resolveFormParamsForRender(
    formParams: Record<string, any>,
    instance: ComponentInstance
): Promise<Record<string, any>> {
    const fields = Array.isArray(instance.children) ? instance.children.flatMap((child) => collectFormFieldInstances(child)) : [];
    const hasHorizontalLabel = fields.some((field) => {
        const inherited = inheritFormFieldParams(formParams, field);
        const fieldParams = inherited.params || {};
        const layout = resolveFormFieldLayout(fieldParams);
        const label = String(fieldParams.label || '').trim();
        return layout !== 'vertical' && label.length > 0;
    });
    const resolvedFormParams = hasHorizontalLabel ? { ...formParams } : formParams;
    if (hasHorizontalLabel) {
        const maxLabelWidth = await resolveAutoFormLabelWidth(formParams, instance);
        if (maxLabelWidth > 0) {
            const currentLabelWidth = Number(resolvedFormParams.labelWidth);
            const mergedLabelWidth =
                Number.isFinite(currentLabelWidth) && currentLabelWidth > 0
                    ? Math.max(currentLabelWidth, maxLabelWidth)
                    : maxLabelWidth;
            resolvedFormParams.labelWidth = mergedLabelWidth;
            resolvedFormParams.labelWidthPreset = 'custom';
        }
    }
    return resolvedFormParams;
}

// ── renderFormItemNode ──────────────────────────────────────────────

export async function renderFormItemNode(
    ctx: FormOperationContext,
    formFrame: FrameNode,
    formParams: Record<string, any>,
    instance: ComponentInstance,
    columnSpacing: number | null,
    resolvedFormParams: Record<string, any>
): Promise<SceneNode> {
    const processedChild = normalizeFormChildInstance(instance, columnSpacing);
    if (processedChild.componentId === 'form-field' && resolvedFormParams && resolvedFormParams.labelWidth > 0) {
        delete processedChild.params?.labelWidth;
    }
    const inheritedChild = inheritFormFieldParams(resolvedFormParams, processedChild);
    const node = await ctx.renderComponent(inheritedChild, { isRoot: false });
    if (node.type === 'FRAME' || node.type === 'INSTANCE') {
        // Use the INHERITED params (with controlWidthMode from form level),
        // not the original processedChild.params which may lack controlWidthMode.
        const childParams = inheritedChild.params || {};
        const childFillMode = inheritedChild.componentId === 'form-row'
            ? normalizeFormControlWidthMode(childParams.controlWidthMode)
            : resolveFormControlWidthMode(childParams);
        if (formFrame.counterAxisSizingMode === 'FIXED' || childFillMode === 'fill') {
            node.layoutAlign = 'STRETCH';
        }
    }
    return node;
}

// ── updateFormItemCount ─────────────────────────────────────────────

export async function updateFormItemCount(
    ctx: FormOperationContext,
    formFrame: FrameNode,
    prevParams: Record<string, any>,
    nextParams: Record<string, any>
): Promise<boolean> {
    const targetCount = normalizeFormItemCount(nextParams.itemCount);
    if (targetCount === null) return false;
    let snapshot = ctx.buildComponentInstanceFromNode(formFrame);
    if (!snapshot) {
        snapshot = ctx.readComponentInstanceSnapshot(formFrame);
    }
    if (!snapshot) return false;
    const normalizedParams: Record<string, any> = { ...nextParams, itemCount: targetCount };
    const patchedInstance = patchFormInstanceSnapshot(snapshot, prevParams, normalizedParams);
    const nextItemInstances = Array.isArray(patchedInstance.children)
        ? patchedInstance.children.filter((child) => isFormItemInstance(child))
        : [];
    const itemNodes = collectFormItemNodes(formFrame);
    const currentCount = itemNodes.length;
    if (targetCount < currentCount) {
        for (let i = currentCount - 1; i >= targetCount; i -= 1) {
            itemNodes[i].remove();
        }
    } else if (targetCount > currentCount) {
        const columnSpacing = toPositiveNumber(normalizedParams.columnSpacing);
        const resolvedFormParams = await resolveFormParamsForRender(normalizedParams, patchedInstance);
        const newInstances = nextItemInstances.slice(currentCount);
        let insertIndex = formFrame.children.length;
        if (currentCount > 0) {
            const lastNode = itemNodes[currentCount - 1];
            const lastIndex = formFrame.children.indexOf(lastNode);
            insertIndex = lastIndex >= 0 ? lastIndex + 1 : formFrame.children.length;
        }
        for (const instance of newInstances) {
            const childNode = await renderFormItemNode(ctx, formFrame, normalizedParams, instance, columnSpacing, resolvedFormParams);
            formFrame.insertChild(insertIndex, childNode);
            insertIndex += 1;
        }
    }
    // Re-align label-wrap widths after adding/removing form items.
    await alignFormLabelWidths(formFrame);
    writeNodeParams(formFrame, normalizedParams);
    ctx.writeComponentInstanceSnapshot(formFrame, patchedInstance);
    return true;
}

// ── updateFormLayoutParams ──────────────────────────────────────────

export async function updateFormLayoutParams(
    ctx: FormOperationContext,
    formFrame: FrameNode,
    prevParams: Record<string, any>,
    nextParams: Record<string, any>
): Promise<boolean> {
    if (prevParams.showActionArea !== nextParams.showActionArea) return false;
    let snapshot = ctx.buildComponentInstanceFromNode(formFrame);
    if (!snapshot) {
        snapshot = ctx.readComponentInstanceSnapshot(formFrame);
    }
    if (!snapshot) return false;
    const nextItemCount = normalizeFormItemCount(nextParams.itemCount);
    const normalizedParams: Record<string, any> = ctx.resolveFormLayoutParamsUpdate(
        prevParams,
        nextItemCount !== null ? { ...nextParams, itemCount: nextItemCount } : { ...nextParams }
    );

    const patchedInstance = patchFormInstanceSnapshot(snapshot, prevParams, normalizedParams);
    const itemNodes = collectFormItemNodes(formFrame);
    const nextItemInstances = Array.isArray(patchedInstance.children)
        ? patchedInstance.children.filter((child) => isFormItemInstance(child))
        : [];
    if (itemNodes.length !== nextItemInstances.length) {
        return false;
    }

    const rowSpacing = Number(normalizedParams.rowSpacing);
    const resolvedRowSpacing =
        Number.isFinite(rowSpacing) && rowSpacing > 0
            ? rowSpacing
            : (normalizeFormAlign(normalizedParams.align) === 'top' ? 24 : 12);
    formFrame.itemSpacing = resolvedRowSpacing;

    const title = String(normalizedParams.title || '').trim();
    const existingTitleNode = formFrame.children.find((child) => child.type === 'TEXT') as TextNode | undefined;
    if (title) {
        if (existingTitleNode) {
            existingTitleNode.characters = title;
        } else {
            const titleNode = figma.createText();
            await applyTextStyleBinding(titleNode, 'card-title-text-style-key', { family: 'Inter', style: 'Bold', size: 16 });
            titleNode.characters = title;
            await ctx.applyColorVariable(titleNode, 'card-title', '#0C0D0E');
            formFrame.insertChild(0, titleNode);
        }
    } else if (existingTitleNode) {
        existingTitleNode.remove();
    }

    const columnSpacing = toPositiveNumber(normalizedParams.columnSpacing);
    const resolvedFormParams = await resolveFormParamsForRender(normalizedParams, patchedInstance);
    const computedWidth = toPositiveNumber(normalizedParams.width);
    if (computedWidth !== null) {
        ctx.applyNodeSize(formFrame, computedWidth, null);
        formFrame.counterAxisSizingMode = 'FIXED';
    } else {
        formFrame.counterAxisSizingMode = 'AUTO';
    }
    for (let index = 0; index < itemNodes.length; index += 1) {
        const itemNode = itemNodes[index];
        const itemInstance = nextItemInstances[index];
        const syncedInstance = syncFormItemLabelsFromNode(itemInstance, itemNode);
        const childNode = await renderFormItemNode(
            ctx,
            formFrame,
            normalizedParams,
            syncedInstance,
            columnSpacing,
            resolvedFormParams
        );
        ctx.replaceSceneNode(itemNode, childNode);
        // replaceSceneNode inherits layoutGrow/layoutAlign/layoutSizingHorizontal
        // from the OLD node, which overwrites what renderFormItemNode just set.
        // Re-apply fill-mode properties after replacement.
        if (childNode.type === 'FRAME' || childNode.type === 'INSTANCE') {
            // Use inherited params to determine fill mode. syncedInstance.params
            // does NOT have controlWidthMode (it's inherited from form level).
            const inheritedParams = inheritFormFieldParams(resolvedFormParams, syncedInstance).params || {};
            const childIsRow = syncedInstance.componentId === 'form-row';
            const childFillMode = childIsRow
                ? normalizeFormControlWidthMode(inheritedParams.controlWidthMode)
                : resolveFormControlWidthMode(inheritedParams);
            // replaceSceneNode copies old layoutAlign/layoutGrow/layoutSizingHorizontal
            // which overwrites what renderFormItemNode set. Re-apply:
            // 1. STRETCH: when form has FIXED width, ALL children (not just fill) must STRETCH.
            //    Also set layoutSizingHorizontal='FILL' because replaceSceneNode may have
            //    set it to 'HUG' which conflicts with STRETCH.
            if (formFrame.counterAxisSizingMode === 'FIXED' || childFillMode === 'fill') {
                childNode.layoutAlign = 'STRETCH';
                try { (childNode as any).layoutSizingHorizontal = 'FILL'; } catch {}
            }
            // 2. Fill-specific: restore layoutSizingHorizontal, layoutGrow, axis sizing
            if (childFillMode === 'fill') {
                try { (childNode as any).layoutSizingHorizontal = 'FILL'; } catch {}
                childNode.layoutGrow = 1;
                if ('layoutMode' in childNode && childNode.layoutMode === 'HORIZONTAL') {
                    childNode.primaryAxisSizingMode = 'FIXED';
                } else if ('layoutMode' in childNode && childNode.layoutMode === 'VERTICAL') {
                    childNode.counterAxisSizingMode = 'FIXED';
                }
            }
            // 3. Height must always be HUG content. replaceSceneNode may have
            //    inherited a FIXED height from the old node (especially when
            //    switching between horizontal/vertical layouts where the axis
            //    semantics of primaryAxisSizingMode / counterAxisSizingMode swap).
            if ('layoutMode' in childNode && childNode.layoutMode !== 'NONE') {
                try { (childNode as any).layoutSizingVertical = 'HUG'; } catch {}
            }

        }
    }


    // After all replaceSceneNode calls, label-wrap widths may have been reset
    // to content width by Figma layout recalculation. Re-align them immediately
    // instead of waiting for documentchange debounce.
    await alignFormLabelWidths(formFrame);
    writeNodeParams(formFrame, normalizedParams);
    ctx.writeComponentInstanceSnapshot(formFrame, patchedInstance);
    return true;
}
