/**
 * Form query / detection / normalization helpers (Category A).
 * These functions only read node properties or manipulate pure data structures.
 * They do NOT call renderComponent or mutate Figma nodes.
 * Extracted from code.ts.
 */

import { ComponentInstance } from '../../types';
import { getDefaultParams, getRegistrySizeMetrics } from '../../registry.helpers';
import { readNodeParams } from '../utils/nodeSnapshot';
import { findInstanceComponentPropertyName } from '../utils/figmaNodeUtils';
import { normalizeFormLayout } from '../utils/variantNormalize';
import { COMPONENT_REGISTRY } from '../../registry';

const COMPONENT_DEFS = COMPONENT_REGISTRY.components;

// ── local helpers ────────────────────────────────────────────────────

function toPositiveNumber(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Navigation / ancestor queries ───────────────────────────────────

export function findFormFrameFromNode(node: BaseNode | null | undefined): FrameNode | null {
    let current = node;
    while (current && current.type !== 'PAGE') {
        if ('getPluginData' in current) {
            const componentId = current.getPluginData('component-id');
            if (componentId === 'form') {
                return current as FrameNode;
            }
        }
        current = current.parent;
    }
    return null;
}

export function isFormLabelWrapNode(node: SceneNode | null | undefined): boolean {
    if (!node || node.type !== 'FRAME') return false;
    if (!('getPluginData' in node)) return false;
    return node.getPluginData('form-label-wrap') === 'true';
}

export function findAncestorFormFrame(node: SceneNode | null): FrameNode | null {
    let current: BaseNode | null = node?.parent || null;
    while (current && current.type !== 'PAGE') {
        if (
            current.type === 'FRAME' &&
            'getPluginData' in current &&
            current.getPluginData('component-id') === 'form'
        ) {
            return current as FrameNode;
        }
        current = current.parent;
    }
    return null;
}

export function findAncestorFormFieldNode(node: SceneNode | null): SceneNode | null {
    let current: BaseNode | null = node?.parent || null;
    while (current && current.type !== 'PAGE') {
        if ('getPluginData' in current && current.getPluginData('component-id') === 'form-field') {
            return current as SceneNode;
        }
        current = current.parent;
    }
    return null;
}

// ── Form field layout detection ─────────────────────────────────────

export function isFormFieldLayoutAffecting(prev: Record<string, any>, next: Record<string, any>): boolean {
    const keys = [
        'label',
        'required',
        'showHelpIcon',
        'showColon',
        'controlType'
    ];
    return keys.some((k) => String(prev[k] || '') !== String(next[k] || ''));
}

export function getFormFieldLabelWrapWidth(node: SceneNode): number | null {
    if (node.type !== 'FRAME' && node.type !== 'INSTANCE') return null;
    const findWrap = (n: SceneNode): FrameNode | null => {
        if (isFormLabelWrapNode(n)) return n as FrameNode;
        if ('children' in n) {
            for (const child of n.children) {
                const res = findWrap(child as SceneNode);
                if (res) return res;
            }
        }
        return null;
    };
    const wrap = findWrap(node);
    return wrap ? wrap.width : null;
}

// ── Form field node type detection ──────────────────────────────────

export function normalizeFormFieldControlType(controlType: unknown): string {
    const normalized = String(controlType || '').trim().toLowerCase();
    if (!normalized) return 'input';
    if (normalized.includes('checkbox') || normalized.includes('多选')) return 'checkbox-group';
    if (normalized.includes('radio') || normalized.includes('单选')) return 'radio-group';
    if (normalized.includes('datepicker') || normalized.includes('日期')) return 'datepicker';
    if (normalized.includes('inputnumber') || normalized.includes('数字')) return 'inputnumber';
    if (normalized.includes('slider') || normalized.includes('滑动')) return 'slider';
    if (normalized.includes('switch') || normalized.includes('开关')) return 'switch';
    if (normalized.includes('textarea') || normalized.includes('多行')) return 'textarea';
    if (normalized.includes('timepicker') || normalized.includes('时间')) return 'timepicker';
    if (normalized.includes('segmented') || normalized.includes('分段')) return 'segmented-picker';
    if (normalized.includes('select') || normalized.includes('选择')) return 'select';
    if (normalized.includes('upload') || normalized.includes('上传')) return 'upload';
    if (normalized.includes('button') || normalized.includes('按钮')) return 'button';
    if (normalized.includes('figma-component') || normalized.includes('figma')) return 'figma-component';
    return 'input';
}

export function isFormFieldLabelInstance(node: SceneNode): node is InstanceNode {
    return node.type === 'INSTANCE' && String(node.name || '').includes('Lable 表单文字标签');
}

export function isFormFieldDescriptionInstance(node: SceneNode): boolean {
    return String(node.name || '').includes('Description 解释说明');
}

export function isFormFieldControlNode(node: SceneNode): boolean {
    if ('getPluginData' in node) {
        const role = node.getPluginData('form-field-role');
        if (role === 'control') return true;
        const componentId = node.getPluginData('component-id');
        if (
            componentId === 'input' ||
            componentId === 'select' ||
            componentId === 'checkbox-group' ||
            componentId === 'radio-group' ||
            componentId === 'checkbox' ||
            componentId === 'radio' ||
            componentId === 'switch' ||
            componentId === 'textarea' ||
            componentId === 'datepicker' ||
            componentId === 'timepicker' ||
            componentId === 'inputnumber' ||
            componentId === 'slider' ||
            componentId === 'segmented-picker' ||
            componentId === 'upload' ||
            componentId === 'button' ||
            componentId === 'figma-component'
        ) {
            return true;
        }
    }
    const name = String(node.name || '').trim();
    return (
        name.includes('Input 输入框') ||
        name.includes('Select 选择器') ||
        name.includes('DatePicker 日期') ||
        name.includes('TimePicker 时间') ||
        name.includes('InputNumber 数字') ||
        name.includes('Slider 滑动') ||
        name.includes('Segmented Picker') ||
        name.includes('Upload 上传') ||
        name.includes('Checkbox Group 复选框组') ||
        name.includes('Radio Group 单选框组') ||
        name.includes('Checkbox 复选框') ||
        name.includes('Radio 单选框') ||
        name.includes('Switch 开关') ||
        name.includes('TextArea 文本域') ||
        name.includes('Textarea 文本域') ||
        name.includes('Textarea') ||
        name.includes('多行文本') ||
        name.includes('多行')
    );
}

export function isLikelyFormFieldControlNode(node: SceneNode): boolean {
    const name = String(node.name || '').trim();
    const componentId = node.getPluginData('component-id');
    
    const knownIds = [
        'input', 'select', 'checkbox-group', 'radio-group', 'checkbox', 'radio', 
        'switch', 'textarea', 'datepicker', 'timepicker', 'inputnumber', 
        'slider', 'segmented-picker', 'upload', 'button', 'figma-component'
    ];
    if (componentId && knownIds.includes(componentId)) return true;

    const keywords = [
        'Input 输入框', 'Select 选择器', 'DatePicker 日期', 'TimePicker 时间', 
        'InputNumber 数字', 'Slider 滑动', 'Segmented Picker', 'Upload 上传', 
        'Checkbox Group 复选框组', 'Radio Group 单选框组', 'Checkbox 复选框', 
        'Radio 单选框', 'Switch 开关', 'TextArea 文本域', 'Textarea 文本域', 
        'Textarea', '多行文本', '多行', 'Control'
    ];
    
    return keywords.some(k => name.includes(k));
}

export function findFormFieldControlNode(container: SceneNode & ChildrenMixin): SceneNode | null {
    if ('findAll' in container) {
        const markedNode = container.findAll(n => n.getPluginData('form-field-role') === 'control')[0];
        if (markedNode) return markedNode;
    }

    if ('findAll' in container) {
        const knownComponentNode = container.findAll(n => {
            const componentId = n.getPluginData('component-id');
            return !!componentId && componentId !== 'form-field' && componentId !== 'form-row' && componentId !== 'form';
        })[0];
        if (knownComponentNode) return knownComponentNode;
    }

    if ('findAll' in container) {
        const matchedByName = container.findAll(n => isLikelyFormFieldControlNode(n))[0];
        if (matchedByName) return matchedByName;
    }

    const candidates = container.children.filter(child => {
        if (isFormFieldLabelInstance(child)) return false;
        if (isFormFieldDescriptionInstance(child)) return false;
        return true;
    });

    return candidates[0] || null;
}

// ── Form field content helpers ──────────────────────────────────────

export function getFormFieldMessageText(params: Record<string, any>): string {
    const errorText = String(params.errorText || '').trim();
    if (errorText) return errorText;
    return String(params.descriptionText || params.helpText || '').trim();
}

export function hasFormFieldDescription(params: Record<string, any>): boolean {
    return !String(params.errorText || '').trim() && Boolean(getFormFieldMessageText(params));
}

export function hasFormFieldError(params: Record<string, any>): boolean {
    return Boolean(String(params.errorText || '').trim());
}

export function findFormFieldContentContainer(root: SceneNode): (SceneNode & ChildrenMixin) | null {
    if (!('children' in root)) return null;
    const directChildren = root.children;
    if (directChildren.some(isFormFieldLabelInstance)) {
        return root as SceneNode & ChildrenMixin;
    }

    for (const child of directChildren) {
        if ('children' in child && child.children.some(isFormFieldLabelInstance)) {
            return child as SceneNode & ChildrenMixin;
        }
    }

    return root as SceneNode & ChildrenMixin;
}

export function normalizeFormFieldLabelText(value: string): string {
    return value.replace(/[：:]\s*$/, '').trim();
}

export function readFormFieldLabelTextFromNode(node: SceneNode): string | null {
    const contentContainer = findFormFieldContentContainer(node);
    if (!contentContainer) return null;
    const labelInstance = contentContainer.children.find(isFormFieldLabelInstance);
    if (labelInstance && 'findOne' in labelInstance) {
        const labelTextNode =
            labelInstance.findOne((child) => child.type === 'TEXT' && String(child.name || '').trim() === 'Lable') ||
            labelInstance.findOne((child) => child.type === 'TEXT');
        if (labelTextNode && labelTextNode.type === 'TEXT') {
            return normalizeFormFieldLabelText(labelTextNode.characters || '');
        }
    }
    if ('findAll' in node) {
        const textNodes = node.findAll((child) => child.type === 'TEXT') as TextNode[];
        const candidate =
            textNodes.find((text) => String(text.name || '').trim() === 'Lable') ||
            textNodes.find((text) => /[：:]\s*$/.test(text.characters || '')) ||
            textNodes.find((text) => typeof text.fontSize === 'number' && text.fontSize >= 13);
        if (candidate) {
            return normalizeFormFieldLabelText(candidate.characters || '');
        }
    }
    return null;
}

// ── Normalization functions ─────────────────────────────────────────

export function normalizeFormAlign(value: unknown): 'top' | 'left' | 'right' {
    const normalized = String(value || '').trim().toLowerCase();
    if (
        normalized.includes('top') ||
        normalized.includes('顶部') ||
        normalized.includes('vertical') ||
        normalized.includes('纵向')
    ) {
        return 'top';
    }
    if (normalized.includes('right') || normalized.includes('右')) return 'right';
    return 'left';
}

export function normalizeFormLabelWidthPreset(value: unknown): 'fill' | 'default-80' | 'medium-120' | 'large-160' | 'custom' {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized || normalized === 'custom') return 'custom';
    if (normalized.includes('fill') || normalized.includes('跟随')) return 'fill';
    if (normalized.includes('160') || normalized.includes('large')) return 'large-160';
    if (normalized.includes('120') || normalized.includes('medium')) return 'medium-120';
    if (normalized.includes('80') || normalized.includes('default')) return 'default-80';
    return 'custom';
}

export function normalizeFormControlWidthMode(value: unknown): 'fixed' | 'fill' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('fill') || normalized.includes('充满')) return 'fill';
    return 'fixed';
}

// ── Runtime config / resolve functions ──────────────────────────────

export function getFormLabelWidthRuntimeConfig(): {
    defaultWidth: number | null;
    presets: Record<string, number>;
    variantThresholds: { medium?: number; large?: number };
} {
    const formDef = COMPONENT_DEFS['form'] as any;
    const runtime = formDef?.runtime?.labelWidth;
    const presets = runtime?.presets && typeof runtime.presets === 'object' ? runtime.presets : {};
    const variantThresholds =
        runtime?.variantThresholds && typeof runtime.variantThresholds === 'object'
            ? runtime.variantThresholds
            : {};
    const defaultWidth =
        toPositiveNumber(runtime?.default) ?? toPositiveNumber(formDef?.params?.labelWidth?.default);
    return {
        defaultWidth: defaultWidth ?? null,
        presets,
        variantThresholds
    };
}

export function resolveFormAlignVariantLabel(value: unknown): 'Top 顶部对齐' | 'Left 左对齐' | 'Right 右对齐' {
    switch (normalizeFormAlign(value)) {
        case 'top':
            return 'Top 顶部对齐';
        case 'right':
            return 'Right 右对齐';
        default:
            return 'Left 左对齐';
    }
}

export function resolveFormLabelWidthVariantLabel(params: Record<string, any>): 'Fill 跟随输入域' | 'Default 80' | 'Medium 120' | 'Large 160' {
    const preset = normalizeFormLabelWidthPreset(params.labelWidthPreset);
    switch (preset) {
        case 'fill':
            return 'Fill 跟随输入域';
        case 'medium-120':
            return 'Medium 120';
        case 'large-160':
            return 'Large 160';
        case 'default-80':
            return 'Default 80';
        default: {
            const explicit = Number(params.labelWidth);
            const { variantThresholds } = getFormLabelWidthRuntimeConfig();
            const largeThreshold = toPositiveNumber(variantThresholds.large);
            const mediumThreshold = toPositiveNumber(variantThresholds.medium);
            if (Number.isFinite(explicit) && largeThreshold !== null && explicit >= largeThreshold) return 'Large 160';
            if (Number.isFinite(explicit) && mediumThreshold !== null && explicit >= mediumThreshold) return 'Medium 120';
            return 'Default 80';
        }
    }
}

export function getFormFieldControlWidthModeOverrides(): Record<string, string[]> {
    const runtime = (COMPONENT_DEFS['form-field'] as any)?.runtime;
    const overrides = runtime?.controlWidthModeOverrides;
    return overrides && typeof overrides === 'object' ? overrides : {};
}

export const INPUT_LIKE_CONTROL_TYPES = new Set([
    'input', 'select', 'datepicker', 'inputnumber', 'textarea', 'timepicker'
]);

export function resolveFormControlWidthMode(params: Record<string, any>): 'fixed' | 'fill' {
    const controlType = normalizeFormFieldControlType(params.controlType);
    if (!INPUT_LIKE_CONTROL_TYPES.has(controlType)) return 'fixed';
    return normalizeFormControlWidthMode(params.controlWidthMode);
}

export function resolveFormFieldLayout(params: Record<string, any>): 'horizontal' | 'vertical' {
    const explicitLayout = String(params.layout || '').trim();
    if (explicitLayout) {
        return normalizeFormLayout(explicitLayout);
    }
    return normalizeFormAlign(params.align) === 'top' ? 'vertical' : 'horizontal';
}

export function resolveFormLabelWidth(params: Record<string, any>): number {
    const explicit = Number(params.labelWidth);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;

    const { defaultWidth, presets } = getFormLabelWidthRuntimeConfig();
    const preset = normalizeFormLabelWidthPreset(params.labelWidthPreset);
    const presetWidth = toPositiveNumber(presets[preset]);
    if (presetWidth !== null) return presetWidth;
    if (defaultWidth !== null) return defaultWidth;
    return 0;
}

export function resolveFormLabelControlSpacing(params: Record<string, any>, layout: 'horizontal' | 'vertical'): number {
    const explicitSpacing = Number(params.labelControlSpacing);
    if (Number.isFinite(explicitSpacing) && explicitSpacing > 0) return explicitSpacing;
    return layout === 'vertical' ? 8 : 20;
}

export function resolveFormControlWidth(params: Record<string, any>): number {
    const controlWidthMode = normalizeFormControlWidthMode(params.controlWidthMode);
    const explicitWidth = toPositiveNumber(params.controlWidth) ?? toPositiveNumber(params.width);
    if (explicitWidth !== null) return explicitWidth;
    if (controlWidthMode === 'fill') return FORM_FIELD_DEFAULTS.controlWidth;
    return FORM_FIELD_DEFAULTS.controlWidth;
}

// ── ComponentInstance queries ───────────────────────────────────────

export function collectFormFieldInstances(instance: ComponentInstance): ComponentInstance[] {
    if (instance.componentId === 'form-field') return [instance];
    if (!Array.isArray(instance.children)) return [];
    const result: ComponentInstance[] = [];
    instance.children.forEach((child) => {
        result.push(...collectFormFieldInstances(child));
    });
    return result;
}

export function hasFormFieldInstance(instance: ComponentInstance): boolean {
    if (instance.componentId === 'form-field') return true;
    if (!Array.isArray(instance.children)) return false;
    return instance.children.some((child) => hasFormFieldInstance(child));
}

export function isFormItemInstance(instance: ComponentInstance): boolean {
    if (instance.componentId === 'form-field') return true;
    if (instance.componentId === 'form-row') {
        return Array.isArray(instance.children) && instance.children.some((child) => hasFormFieldInstance(child));
    }
    return false;
}

export function countFormItemInstances(instance: ComponentInstance): number {
    if (!Array.isArray(instance.children)) return 0;
    return instance.children.filter((child) => isFormItemInstance(child)).length;
}

export function normalizeFormItemCount(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const rounded = Math.round(parsed);
    return rounded <= 0 ? 1 : rounded;
}

export function isFormItemNode(node: SceneNode): boolean {
    if (!('getPluginData' in node)) return false;
    const componentId = node.getPluginData('component-id');
    if (componentId === 'form-field') return true;
    if (componentId !== 'form-row') return false;
    if (!('children' in node)) return false;
    return node.children.some((child) => 'getPluginData' in child && child.getPluginData('component-id') === 'form-field');
}

export function collectFormItemNodes(frame: FrameNode): SceneNode[] {
    return frame.children.filter((child) => isFormItemNode(child));
}

export function stripFormItemCount(params: Record<string, any>): Record<string, any> {
    const { itemCount: _itemCount, ...rest } = params || {};
    return rest;
}

export function areFormParamsEquivalent(prevParams: Record<string, any>, nextParams: Record<string, any>): boolean {
    const prev = stripFormItemCount(prevParams);
    const next = stripFormItemCount(nextParams);
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    if (prevKeys.length !== nextKeys.length) return false;
    for (const key of prevKeys) {
        if (prev[key] !== next[key]) return false;
    }
    return true;
}

export function mapFormRowAlignment(value: unknown): 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'center') return 'CENTER';
    if (normalized === 'end' || normalized === 'right') return 'MAX';
    if (normalized === 'between' || normalized === 'space-between') return 'SPACE_BETWEEN';
    return 'MIN';
}

// ── Form field sync functions ───────────────────────────────────────

export function syncFormFieldParamsFromNode(currentParams: Record<string, any>, node: SceneNode): Record<string, any> {
    const nextParams = { ...currentParams };
    const labelFromNode = readFormFieldLabelTextFromNode(node);
    if (labelFromNode) {
        nextParams.label = labelFromNode;
    }

    const contentContainer = findFormFieldContentContainer(node);
    if (!contentContainer) return nextParams;
    const controlNode = findFormFieldControlNode(contentContainer);
    if (!controlNode) return nextParams;

    const controlType = normalizeFormFieldControlType(currentParams.controlType);
    if (controlType === 'input') {
        return syncInputParamsFromNode(nextParams, controlNode);
    }

    if (controlType === 'select') {
        return syncSelectParamsFromNode(nextParams, controlNode);
    }
    if (controlType === 'checkbox-group') {
        return syncCheckboxGroupParamsFromNode(nextParams, controlNode);
    }
    if (controlType === 'radio-group') {
        return syncRadioGroupParamsFromNode(nextParams, controlNode);
    }
    return nextParams;
}

export function syncComponentParamsFromNode(
    componentId: string,
    currentParams: Record<string, any>,
    node: SceneNode
): Record<string, any> {
    if (componentId === 'form-field') {
        return syncFormFieldParamsFromNode(currentParams, node);
    }
    return syncStandaloneComponentParamsFromNode(componentId, currentParams, node);
}

// ── Input/Select/Checkbox/Radio sync helpers ────────────────────────
// These functions read control state from Figma nodes. They are used
// both by form-field sync and by standalone component sync.

export function readInputMainTextNode(root: SceneNode): TextNode | null {
    if (!('findAll' in root)) return null;
    const textNodes = root.findAll((child) => child.type === 'TEXT') as TextNode[];
    return (
        textNodes.find((child) => String(child.name || '').trim().toLowerCase() === 'text') ||
        textNodes[textNodes.length - 1] ||
        null
    );
}

export function findSelectDisplayTextNode(root: SceneNode): TextNode | null {
    if ('children' in root) {
        const directText = root.children.find((child) => child.type === 'TEXT') as TextNode | undefined;
        if (directText) return directText;

        const firstChild = root.children[0];
        if (firstChild && 'findOne' in firstChild) {
            const nested = firstChild.findOne((node) => node.type === 'TEXT');
            if (nested && nested.type === 'TEXT') {
                return nested;
            }
        }
    }
    return null;
}

function readFirstMeaningfulTextFromNode(node: SceneNode): string | null {
    if (!('findAll' in node)) return null;
    const textNodes = node.findAll((child) => child.type === 'TEXT') as TextNode[];
    const preferred = textNodes.find((text) => {
        const value = String(text.characters || '').trim();
        return Boolean(value) && value !== '✓' && value !== '−';
    });
    if (preferred) return String(preferred.characters || '').trim();
    const fallback = textNodes.find((text) => String(text.characters || '').trim().length > 0);
    return fallback ? String(fallback.characters || '').trim() : null;
}

function matchInputAffixName(value: string, kind: 'prefix' | 'suffix'): boolean {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return false;
    if (kind === 'prefix') return normalized.includes('prefix') || normalized.includes('前缀');
    return normalized.includes('suffix') || normalized.includes('后缀');
}

function findInputAffixTextNodes(
    textNodes: TextNode[],
    mainTextNode?: TextNode | null
): { prefixNode: TextNode | null; suffixNode: TextNode | null } {
    const candidates = textNodes.filter((node) => node !== mainTextNode);
    if (candidates.length === 0) return { prefixNode: null, suffixNode: null };

    let prefixNode: TextNode | null = null;
    let suffixNode: TextNode | null = null;
    for (const node of candidates) {
        const combined = `${String(node.name || '')} ${String(node.parent?.name || '')}`.toLowerCase();
        if (!prefixNode && matchInputAffixName(combined, 'prefix')) {
            prefixNode = node;
        }
        if (!suffixNode && matchInputAffixName(combined, 'suffix')) {
            suffixNode = node;
        }
        if (prefixNode && suffixNode) break;
    }

    const sortedByX = [...candidates].sort((a, b) => {
        const ax = a.absoluteBoundingBox?.x ?? 0;
        const bx = b.absoluteBoundingBox?.x ?? 0;
        return ax - bx;
    });
    const fallbackPrefix = sortedByX[0] ?? null;
    const fallbackSuffix = sortedByX.length > 1 ? sortedByX[sortedByX.length - 1] : null;

    const finalPrefix = prefixNode ?? fallbackPrefix;
    let finalSuffix = suffixNode ?? fallbackSuffix;
    if (finalPrefix && finalSuffix && finalPrefix.id === finalSuffix.id) {
        finalSuffix = null;
    }
    return { prefixNode: finalPrefix, suffixNode: finalSuffix };
}

function readInstanceBooleanProperty(instance: InstanceNode, displayNames: string[]): boolean | null {
    for (const displayName of displayNames) {
        const key = findInstanceComponentPropertyName(instance, displayName);
        if (!key) continue;
        const prop = instance.componentProperties?.[key];
        if (!prop) continue;
        if (prop.type === 'BOOLEAN' && typeof prop.value === 'boolean') {
            return prop.value;
        }
        const raw = String(prop.value ?? '').trim().toLowerCase();
        if (!raw) continue;
        if (raw === 'true' || raw === 'yes' || raw === 'on' || raw === 'checked' || raw === 'selected') {
            return true;
        }
        if (raw === 'false' || raw === 'no' || raw === 'off' || raw === 'unchecked' || raw === 'unselected') {
            return false;
        }
    }
    return null;
}

function isSelectDropdownItemNode(node: SceneNode): boolean {
    const name = String(node.name || '').trim();
    return name.includes('_components/dropdown_item') || name.includes('dropdown_item');
}

function readSelectDropdownOptionTexts(root: SceneNode): string[] {
    if (!('findOne' in root)) return [];
    const dropdownRoot = root.findOne((node) => String(node.name || '').includes('Dropdown 下拉菜单'));
    if (!dropdownRoot || !('children' in dropdownRoot)) return [];

    const optionTexts: string[] = [];
    const optionNodes = dropdownRoot.children.filter(isSelectDropdownItemNode);
    for (const optionNode of optionNodes) {
        if (!('findOne' in optionNode)) continue;
        const labelNode =
            optionNode.findOne(
                (child) =>
                    child.type === 'TEXT' &&
                    String(child.name || '').trim() === 'Row Label'
            ) ||
            optionNode.findOne((child) => child.type === 'TEXT');
        if (!labelNode || labelNode.type !== 'TEXT') continue;
        const text = String(labelNode.characters || '').trim();
        if (text) optionTexts.push(text);
    }
    return optionTexts;
}

function isCheckboxGroupItemNode(node: SceneNode): boolean {
    return String(node.name || '').includes('Checkbox 复选框');
}

function isRadioGroupItemNode(node: SceneNode): boolean {
    return String(node.name || '').includes('Radio 单选框');
}

function collectCheckboxGroupItemNodes(root: SceneNode): SceneNode[] {
    if ('children' in root) {
        const directChildren = root.children.filter(isCheckboxGroupItemNode);
        if (directChildren.length > 0) return directChildren;
    }
    if (!('findAll' in root)) return [];
    return root.findAll(isCheckboxGroupItemNode) as SceneNode[];
}

function collectRadioGroupItemNodes(root: SceneNode): SceneNode[] {
    if ('children' in root) {
        const directChildren = root.children.filter(isRadioGroupItemNode);
        if (directChildren.length > 0) return directChildren;
    }
    if (!('findAll' in root)) return [];
    return root.findAll(isRadioGroupItemNode) as SceneNode[];
}

function readCheckboxLikeItemLabel(node: SceneNode): string | null {
    if (node.type === 'TEXT') {
        const direct = String(node.characters || '').trim();
        return direct && direct !== '✓' && direct !== '−' ? direct : null;
    }
    return readFirstMeaningfulTextFromNode(node);
}

function readCheckboxLikeItemChecked(node: SceneNode): boolean | null {
    if (node.type === 'INSTANCE') {
        const fromProp = readInstanceBooleanProperty(node, ['Checked 已选', 'Checked']);
        if (fromProp !== null) return fromProp;
    }
    if ('children' in node) {
        const firstChild = node.children[0];
        if (firstChild && 'children' in firstChild) {
            return firstChild.children.length > 0;
        }
    }
    if (!('findOne' in node)) return null;
    return Boolean(
        node.findOne(
            (child) =>
                child.type === 'TEXT' &&
                (String(child.characters || '').trim() === '✓' || String(child.characters || '').trim() === '−')
        )
    );
}

function readRadioLikeItemSelected(node: SceneNode): boolean | null {
    if (node.type === 'INSTANCE') {
        const fromProp = readInstanceBooleanProperty(node, ['Checked 已选', 'Checked']);
        if (fromProp !== null) return fromProp;
    }
    if ('children' in node) {
        const firstChild = node.children[0];
        if (firstChild && 'children' in firstChild) {
            return firstChild.children.some((child) => child.type === 'ELLIPSE');
        }
    }
    return null;
}

export function syncInputParamsFromNode(currentParams: Record<string, any>, node: SceneNode): Record<string, any> {
    const mainTextNode = readInputMainTextNode(node);
    if (!mainTextNode) return currentParams;

    const nextParams = { ...currentParams };
    const displayText = String(mainTextNode.characters || '');
    const placeholder = String(currentParams.placeholder || '请输入');
    
    let isFilledVariant = currentParams.filled === true;
    if (node.type === 'INSTANCE') {
        const fromProp = readInstanceBooleanProperty(node, ['Fill 已填', 'Filled 已填', 'Filled']);
        if (fromProp !== null) isFilledVariant = fromProp;
    }

    if (displayText === placeholder && !isFilledVariant) {
        nextParams.value = '';
        nextParams.filled = false;
    } else {
        nextParams.value = displayText;
        if (displayText) nextParams.cachedValue = displayText;
        nextParams.filled = isFilledVariant;
    }

    if ('findAll' in node) {
        const textNodes = node.findAll((child) => child.type === 'TEXT') as TextNode[];
        const { prefixNode, suffixNode } = findInputAffixTextNodes(textNodes, mainTextNode);
        if (prefixNode && prefixNode.id !== mainTextNode.id) {
            nextParams.prefixText = String(prefixNode.characters || '').trim();
        }
        if (suffixNode && suffixNode.id !== mainTextNode.id) {
            nextParams.suffixText = String(suffixNode.characters || '').trim();
        }
    }

    if (node.type === 'INSTANCE') {
        const errorProp = readInstanceBooleanProperty(node, ['Error 错误', 'Error']);
        if (errorProp !== null) {
            nextParams.error = errorProp;
        }
        const disabledProp = readInstanceBooleanProperty(node, ['Disable 禁用', 'Disabled 禁用', 'Disable', 'Disabled']);
        if (disabledProp !== null) {
            nextParams.disabled = disabledProp;
        }
    }

    return nextParams;
}

export function syncSelectParamsFromNode(currentParams: Record<string, any>, node: SceneNode): Record<string, any> {
    const nextParams = { ...currentParams };
    const displayTextNode = findSelectDisplayTextNode(node);
    const placeholder = String(currentParams.placeholder || '请选择');
    if (displayTextNode) {
        const displayText = String(displayTextNode.characters || '').trim();
        
        let isFilledVariant = currentParams.filled === true;
        if (node.type === 'INSTANCE') {
            const fromProp = readInstanceBooleanProperty(node, ['Fill 已填', 'Filled 已填', 'Filled']);
            if (fromProp !== null) isFilledVariant = fromProp;
        }

        if (displayText === placeholder && !isFilledVariant) {
            nextParams.value = '';
            nextParams.filled = false;
        } else {
            nextParams.value = displayText;
            nextParams.filled = isFilledVariant;
        }
    }

    const options = readSelectDropdownOptionTexts(node);
    if (options.length > 0) {
        nextParams.optionsText = options.join(',');
    }
    return nextParams;
}

function syncCheckboxGroupParamsFromNode(currentParams: Record<string, any>, node: SceneNode): Record<string, any> {
    const nextParams = { ...currentParams };
    const itemNodes = collectCheckboxGroupItemNodes(node);
    if (itemNodes.length === 0) return nextParams;

    const options: string[] = [];
    const checkedValues: string[] = [];
    for (const itemNode of itemNodes) {
        const label = readCheckboxLikeItemLabel(itemNode);
        if (!label) continue;
        options.push(label);
        if (readCheckboxLikeItemChecked(itemNode)) {
            checkedValues.push(label);
        }
    }

    if (options.length > 0) nextParams.optionsText = options.join(',');
    nextParams.checkedValues = checkedValues.join(',');
    return nextParams;
}

function syncRadioGroupParamsFromNode(currentParams: Record<string, any>, node: SceneNode): Record<string, any> {
    const nextParams = { ...currentParams };
    const itemNodes = collectRadioGroupItemNodes(node);
    if (itemNodes.length === 0) return nextParams;

    const options: string[] = [];
    let selectedValue = '';
    for (const itemNode of itemNodes) {
        const label = readCheckboxLikeItemLabel(itemNode);
        if (!label) continue;
        options.push(label);
        if (!selectedValue && readRadioLikeItemSelected(itemNode)) {
            selectedValue = label;
        }
    }

    if (options.length > 0) nextParams.optionsText = options.join(',');
    if (selectedValue) nextParams.value = selectedValue;
    return nextParams;
}

export function syncStandaloneComponentParamsFromNode(
    componentId: string,
    currentParams: Record<string, any>,
    node: SceneNode
): Record<string, any> {
    if (componentId === 'input') {
        return syncInputParamsFromNode(currentParams, node);
    }
    if (componentId === 'select') {
        return syncSelectParamsFromNode(currentParams, node);
    }
    if (componentId === 'checkbox-group') {
        return syncCheckboxGroupParamsFromNode(currentParams, node);
    }
    if (componentId === 'radio-group') {
        return syncRadioGroupParamsFromNode(currentParams, node);
    }
    return currentParams;
}

// ── shouldUseChildControlInstance ───────────────────────────────────

export function shouldUseChildControlInstance(
    instance: ComponentInstance,
    params: Record<string, any>
): boolean {
    if (!Array.isArray(instance.children) || instance.children.length === 0) return false;
    const child = instance.children[0];
    if (!child) return false;
    const controlType = normalizeFormFieldControlType(params.controlType);
    if (controlType === 'input') return child.componentId === 'input' || child.componentId === 'figma-component';
    if (controlType === 'select') return child.componentId === 'select' || child.componentId === 'figma-component';
    if (controlType === 'textarea') return child.componentId === 'textarea' || child.componentId === 'figma-component';
    if (controlType === 'checkbox-group') return child.componentId === 'checkbox-group' || child.componentId === 'figma-component';
    if (controlType === 'radio-group') return child.componentId === 'radio-group' || child.componentId === 'figma-component';
    if (controlType === 'button') return child.componentId === 'button' || child.componentId === 'figma-component';
    if (controlType === 'figma-component') {
        const token = String(params.componentToken || '').trim();
        const key = String(params.componentKey || '').trim();
        const criteria = String(params.variantCriteria || '').trim();
        if (token || key || criteria) return false;
        return child.componentId === 'figma-component';
    }
    return false;
}

// ── Control instance builders ───────────────────────────────────────

function resolveComponentTokenForControl(componentId: string): string {
    const def = COMPONENT_DEFS[componentId] as any;
    const token = typeof def?.figmaPropertySnapshot?.token === 'string' ? def.figmaPropertySnapshot.token.trim() : '';
    return token;
}

export function buildFigmaControlInstance(componentId: string, params: Record<string, any>): ComponentInstance {
    const explicitToken = typeof params.componentToken === 'string' ? params.componentToken.trim() : '';
    const componentToken = explicitToken || resolveComponentTokenForControl(componentId);
    if (!componentToken) {
        return {
            id: 'form-field-control',
            componentId,
            params
        };
    }
    return {
        id: 'form-field-control',
        componentId: 'figma-component',
        params: {
            ...params,
            componentToken
        }
    };
}

export function createControlInstanceFromFormFieldParams(params: Record<string, any>): ComponentInstance {
    const controlType = normalizeFormFieldControlType(params.controlType);
    const controlWidthMode = resolveFormControlWidthMode(params);
    const explicitControlWidth = toPositiveNumber(params.controlWidth) ?? toPositiveNumber(params.width);
    const width = controlWidthMode === 'fill' ? undefined : (explicitControlWidth !== null ? explicitControlWidth : undefined);

    if (controlType === 'input') {
        const error = Boolean(params.error);
        const disabled = Boolean(params.disabled);
        return buildFigmaControlInstance('input', {
            placeholder: params.placeholder || '请输入',
            value: params.value || '',
            width,
            size: params.size || 'Default 32',
            filled: Boolean(params.filled),
            error,
            disabled,
            showPrefix: Boolean(params.showPrefix ?? params.prefix),
            prefixText: params.prefixText || '',
            showSuffix: Boolean(params.showSuffix ?? params.suffix),
            suffixText: params.suffixText || '',
            forceFigmaKey: true
        });
    }

    if (controlType === 'textarea') {
        return buildFigmaControlInstance('textarea', {
            placeholder: params.placeholder || '请输入内容',
            value: params.value || '',
            wordLimit: params.wordLimit,
            resizable: params.resizable,
            filled: Boolean(params.filled),
            error: Boolean(params.error),
            state: params.state || 'Default 默认',
            disabled: Boolean(params.disabled),
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'select') {
        return buildFigmaControlInstance('select', {
            size: params.size || 'Default 32',
            optionsText: params.optionsText || '选项一,选项二',
            forceFigmaKey: true
        });
    }

    if (controlType === 'checkbox-group') {
        return buildFigmaControlInstance('checkbox-group', {
            optionsText: params.optionsText || '选项一,选项二',
            checkedValues: params.checkedValues || params.value || '选项一',
            direction: params.direction || 'horizontal',
            gap: params.gap,
            disabled: Boolean(params.disabled),
            forceFigmaKey: true
        });
    }

    if (controlType === 'radio-group') {
        return buildFigmaControlInstance('radio-group', {
            optionsText: params.optionsText || '选项一,选项二',
            value: params.value || '选项一',
            direction: params.direction || 'horizontal',
            language: params.language || 'CN',
            gap: params.gap,
            disabled: Boolean(params.disabled),
            forceFigmaKey: true
        });
    }

    if (controlType === 'button') {
        return buildFigmaControlInstance('button', {
            label: params.buttonLabel || params.value || '按钮',
            variant: params.buttonVariant || 'secondary',
            theme: params.theme || 'default',
            size: params.size || 'Default 32',
            state: params.state || 'Default 默认',
            disabled: Boolean(params.disabled),
            iconOnly: Boolean(params.iconOnly),
            showPrefixIcon: Boolean(params.showPrefixIcon ?? params.prefixIcon),
            showSuffixIcon: Boolean(params.showSuffixIcon ?? params.suffixIcon),
            language: params.language || 'CN',
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'datepicker') {
        return buildFigmaControlInstance('datepicker', {
            placeholder: params.placeholder || '请选择日期',
            value: params.value || '',
            size: params.size || 'Default 32',
            state: params.state || 'Default 默认',
            disabled: Boolean(params.disabled),
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'inputnumber') {
        return buildFigmaControlInstance('inputnumber', {
            placeholder: params.placeholder || '请输入数字',
            value: params.value || '',
            size: params.size || 'Default 32',
            state: params.state || 'Default 默认',
            disabled: Boolean(params.disabled),
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'slider') {
        return buildFigmaControlInstance('slider', {
            value: Number(params.value) || 50,
            disabled: Boolean(params.disabled),
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'switch') {
        return buildFigmaControlInstance('switch', {
            checked: Boolean(params.checked),
            disabled: Boolean(params.disabled),
            forceFigmaKey: true
        });
    }

    if (controlType === 'timepicker') {
        return buildFigmaControlInstance('timepicker', {
            placeholder: params.placeholder || '请选择时间',
            value: params.value || '',
            size: params.size || 'Default 32',
            state: params.state || 'Default 默认',
            disabled: Boolean(params.disabled),
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'segmented-picker') {
        return buildFigmaControlInstance('segmented-picker', {
            optionsText: params.optionsText || '选项一,选项二',
            value: params.value || '选项一',
            size: params.size || 'Default 32',
            disabled: Boolean(params.disabled),
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'upload') {
        return buildFigmaControlInstance('upload', {
            uploadType: params.uploadType,
            disabled: Boolean(params.disabled),
            forceFigmaKey: true
        });
    }

    if (controlType === 'figma-component') {
        return {
            id: 'form-field-control',
            componentId: 'figma-component',
            params: {
                componentToken: params.componentToken || '',
                componentKey: params.componentKey || '',
                variantCriteria: params.variantCriteria || '',
                disabled: Boolean(params.disabled),
                width,
                forceFigmaKey: true
            }
        };
    }

    const rawValue = String(params.value ?? '');
    const hasValue = rawValue.length > 0;
    const filled = Boolean(params.filled) || hasValue;

    return {
        id: 'form-field-control',
        componentId: 'input',
        params: {
            placeholder: params.placeholder ?? '请输入',
            value: rawValue,
            width,
            size: params.size || 'Default 32',
            state: params.state || 'Default 默认',
            filled,
            error: Boolean(params.error),
            disabled: Boolean(params.disabled),
            showPrefix: Boolean(params.showPrefix ?? params.prefix),
            prefixText: params.prefixText || '',
            showSuffix: Boolean(params.showSuffix ?? params.suffix),
            suffixText: params.suffixText || '',
            forceFigmaKey: true
        }
    };
}

// ── Instance snapshot helpers ───────────────────────────────────────

function cloneComponentInstance(instance: ComponentInstance, suffix: string): ComponentInstance {
    const baseId = instance.id || instance.componentId || 'instance';
    const cloned: ComponentInstance = {
        id: `${baseId}-${suffix}`,
        componentId: instance.componentId,
        params: { ...(instance.params || {}) }
    };
    if (Array.isArray(instance.children)) {
        cloned.children = instance.children.map((child, index) =>
            cloneComponentInstance(child, `${suffix}-${index}`)
        );
    }
    return cloned;
}

export function applyFormItemLabel(instance: ComponentInstance, label: string): ComponentInstance {
    if (instance.componentId === 'form-field') {
        return {
            ...instance,
            params: {
                ...(instance.params || {}),
                label
            }
        };
    }
    if (!Array.isArray(instance.children)) return instance;
    let updated = false;
    const nextChildren = instance.children.map((child) => {
        if (!updated && hasFormFieldInstance(child)) {
            const nextChild = applyFormItemLabel(child, label);
            if (nextChild !== child) updated = true;
            return nextChild;
        }
        return child;
    });
    if (!updated) return instance;
    return { ...instance, children: nextChildren };
}

export function createDefaultFormItem(index: number): ComponentInstance {
    return {
        id: `form-item-${Date.now()}-${index}`,
        componentId: 'form-field',
        params: {
            label: `字段${index}`,
            controlType: 'input',
            placeholder: '请输入'
        }
    };
}

export function adjustFormItemChildren(
    children: ComponentInstance[] | undefined,
    targetCount: number
): ComponentInstance[] | undefined {
    if (!Array.isArray(children)) {
        if (targetCount <= 0) return children;
        return Array.from({ length: targetCount }, (_, index) => createDefaultFormItem(index + 1));
    }
    const nextChildren = [...children];
    const itemIndices = nextChildren.reduce((acc, child, index) => {
        if (isFormItemInstance(child)) acc.push(index);
        return acc;
    }, [] as number[]);
    const currentCount = itemIndices.length;
    if (currentCount === targetCount) return nextChildren;

    if (targetCount < currentCount) {
        let remaining = targetCount;
        return nextChildren.filter((child) => {
            if (!isFormItemInstance(child)) return true;
            if (remaining > 0) {
                remaining -= 1;
                return true;
            }
            return false;
        });
    }

    const template = currentCount > 0 ? nextChildren[itemIndices[itemIndices.length - 1]] : createDefaultFormItem(1);
    const insertAt = currentCount > 0 ? itemIndices[itemIndices.length - 1] + 1 : nextChildren.length;
    const additions: ComponentInstance[] = [];
    for (let i = 0; i < targetCount - currentCount; i += 1) {
        const index = currentCount + i + 1;
        const cloned = cloneComponentInstance(template, `auto-${Date.now()}-${i}`);
        additions.push(applyFormItemLabel(cloned, `字段${index}`));
    }
    nextChildren.splice(insertAt, 0, ...additions);
    return nextChildren;
}

export function normalizeFormChildInstance(
    child: ComponentInstance,
    columnSpacing: number | null
): ComponentInstance {
    if (child.componentId === 'form-row' && Array.isArray(child.children) && child.children.length === 1 && child.children[0].componentId === 'form-field') {
        const field = child.children[0];
        return {
            ...field,
            params: {
                ...(child.params || {}),
                ...(field.params || {})
            }
        };
    }
    if (child.componentId === 'form-row' && columnSpacing !== null) {
        const childParams = child.params || {};
        const spacing = toPositiveNumber(childParams.spacing);
        return {
            ...child,
            params: {
                ...childParams,
                spacing: spacing === null ? columnSpacing : childParams.spacing
            }
        };
    }
    return child;
}

export function syncFormItemLabelsFromNode(
    instance: ComponentInstance,
    node: SceneNode | null
): ComponentInstance {
    if (!node) return instance;
    if (instance.componentId === 'form-field') {
        const currentParams = instance.params || {};
        const syncedParams = syncFormFieldParamsFromNode(currentParams, node);
        const hasChanges = Object.keys(syncedParams).some(
            (key) => syncedParams[key] !== currentParams[key]
        );
        if (!hasChanges) return instance;
        return {
            ...instance,
            params: syncedParams
        };
    }
    if (instance.componentId === 'form-row' && Array.isArray(instance.children) && 'children' in node) {
        const fieldNodes = node.children.filter(
            (child) => 'getPluginData' in child && child.getPluginData('component-id') === 'form-field'
        );
        return {
            ...instance,
            children: instance.children.map((child, index) =>
                syncFormItemLabelsFromNode(child, (fieldNodes[index] as SceneNode) || null)
            )
        };
    }
    if (Array.isArray(instance.children)) {
        return {
            ...instance,
            children: instance.children.map((child) => syncFormItemLabelsFromNode(child, null))
        };
    }
    return instance;
}

// ── Inherited param constants & helpers ─────────────────────────────

export const FORM_INHERITED_PARAM_KEYS = [
    'align',
    'layout',
    'labelAlign',
    'labelWidthPreset',
    'labelWidth',
    'controlWidth',
    'controlWidthMode',
    'showColon'
];

const FORM_FIELD_LABEL_WIDTH_DEFAULT =
    toPositiveNumber((COMPONENT_DEFS['form-field'] as any)?.params?.labelWidth?.default) ?? 0;

export const FORM_FIELD_DEFAULTS: Record<string, any> = {
    layout: 'horizontal',
    labelAlign: 'left',
    labelWidthPreset: 'custom',
    labelWidth: FORM_FIELD_LABEL_WIDTH_DEFAULT,
    controlWidth: 240,
    controlWidthMode: 'fixed',
    showColon: false
};

export function inheritFormFieldParams(
    formParams: Record<string, any>,
    instance: ComponentInstance
): ComponentInstance {
    if (instance.componentId === 'form-field') {
        const currentParams = instance.params || {};
        const inheritedAlign = normalizeFormAlign(formParams.align || currentParams.align);
        const formLayoutRaw = String(formParams.layout || '').trim();
        const inferredLayout =
            String(currentParams.layout || '').trim()
                ? currentParams.layout
                : formLayoutRaw
                    ? normalizeFormLayout(formParams.layout)
                    : inheritedAlign === 'top'
                        ? 'vertical'
                        : 'horizontal';
        const resolvedControlWidthMode =
            currentParams.controlWidthMode === undefined ||
            currentParams.controlWidthMode === FORM_FIELD_DEFAULTS.controlWidthMode
                ? (formParams.controlWidthMode ?? currentParams.controlWidthMode)
                : currentParams.controlWidthMode;
        const nextParams = {
            ...currentParams,
            align: inheritedAlign,
            layout: inferredLayout,
            labelAlign: currentParams.labelAlign || (inheritedAlign === 'right' ? 'right' : 'left'),
            labelWidthPreset: currentParams.labelWidthPreset || formParams.labelWidthPreset || 'custom',
            labelWidth: formParams.labelWidth ?? currentParams.labelWidth,
            controlWidth: currentParams.controlWidth ?? formParams.controlWidth,
            controlWidthMode: resolvedControlWidthMode,
            showColon: currentParams.showColon ?? formParams.showColon,
            ...(formParams.requiredMark === false ? { required: false } : {})
        };
        return { ...instance, params: nextParams };
    }

    if (instance.componentId === 'form-row' && Array.isArray(instance.children)) {
        const rowParams = instance.params || {};
        const resolvedRowControlWidthMode =
            rowParams.controlWidthMode === undefined || rowParams.controlWidthMode === 'fixed'
                ? (formParams.controlWidthMode ?? rowParams.controlWidthMode)
                : rowParams.controlWidthMode;
        return {
            ...instance,
            params: {
                ...rowParams,
                controlWidthMode: resolvedRowControlWidthMode
            },
            children: instance.children.map((child) => inheritFormFieldParams(formParams, child))
        };
    }

    return instance;
}

export function inheritRowFormFieldParams(
    rowParams: Record<string, any>,
    instance: ComponentInstance
): ComponentInstance {
    if (instance.componentId !== 'form-field') return instance;
    const currentParams = instance.params || {};
    const nextParams = { ...rowParams, ...currentParams };
    delete nextParams.spacing;
    delete nextParams.paddingBottom;
    delete nextParams.align;
    delete nextParams.width;
    return { ...instance, params: nextParams };
}

export function patchFormInstanceSnapshot(
    snapshot: ComponentInstance,
    prevParams: Record<string, any>,
    nextParams: Record<string, any>
): ComponentInstance {
    const oldColumnSpacing = toPositiveNumber(prevParams.columnSpacing);
    const newColumnSpacing = toPositiveNumber(nextParams.columnSpacing);
    const nextItemCount = normalizeFormItemCount(nextParams.itemCount);

    const shouldInheritValue = (current: unknown, previous: unknown): boolean =>
        current === undefined || current === previous;

    const patchChild = (child: ComponentInstance): ComponentInstance => {
        let nextChild = child;
        if (child.componentId === 'form-row') {
            const rowParams = { ...(child.params || {}) };
            const currentSpacing = toPositiveNumber(rowParams.spacing);
            const inheritedSpacing =
                currentSpacing === null ||
                currentSpacing === oldColumnSpacing ||
                (oldColumnSpacing === null && currentSpacing === 16);
            if (newColumnSpacing !== null && inheritedSpacing) {
                rowParams.spacing = newColumnSpacing;
            }
            nextChild = { ...child, params: rowParams };
        }

        if (child.componentId === 'form-field') {
            const fieldParams = { ...(child.params || {}) };
            FORM_INHERITED_PARAM_KEYS.forEach((key) => {
                const inheritsByDefault =
                    prevParams[key] === undefined &&
                    FORM_FIELD_DEFAULTS[key] !== undefined &&
                    fieldParams[key] === FORM_FIELD_DEFAULTS[key];
                if (shouldInheritValue(fieldParams[key], prevParams[key]) || inheritsByDefault) {
                    delete fieldParams[key];
                }
            });
            if (fieldParams.labelAlign !== undefined && prevParams.labelAlign === undefined) {
                const prevDerivedLabelAlign = normalizeFormAlign(prevParams.align) === 'right' ? 'right' : 'left';
                if (fieldParams.labelAlign === prevDerivedLabelAlign) {
                    delete fieldParams.labelAlign;
                }
            }
            nextChild = { ...child, params: fieldParams };
        }

        if (Array.isArray(nextChild.children)) {
            nextChild = { ...nextChild, children: nextChild.children.map(patchChild) };
        }
        return nextChild;
    };

    const normalizedParams = nextItemCount !== null
        ? { ...nextParams, itemCount: nextItemCount }
        : nextParams;
    const next: ComponentInstance = {
        ...snapshot,
        componentId: 'form',
        params: normalizedParams
    };
    let patchedChildren = Array.isArray(snapshot.children)
        ? snapshot.children.map(patchChild)
        : snapshot.children;
    if (nextItemCount !== null) {
        patchedChildren = adjustFormItemChildren(patchedChildren, nextItemCount) || patchedChildren;
    }
    if (patchedChildren) {
        next.children = patchedChildren;
    }
    return next;
}

export function shouldResetFormFieldChildren(
    prevParams: Record<string, any>,
    nextParams: Record<string, any>
): boolean {
    const prevType = normalizeFormFieldControlType(prevParams.controlType);
    const nextType = normalizeFormFieldControlType(nextParams.controlType);
    if (prevType !== nextType) return true;

    if (nextType === 'figma-component') {
        const prevToken = String(prevParams.componentToken || '').trim();
        const nextToken = String(nextParams.componentToken || '').trim();
        const prevKey = String(prevParams.componentKey || '').trim();
        const nextKey = String(nextParams.componentKey || '').trim();
        const prevCriteria = String(prevParams.variantCriteria || '').trim();
        const nextCriteria = String(nextParams.variantCriteria || '').trim();
        if (prevToken !== nextToken || prevKey !== nextKey || prevCriteria !== nextCriteria) {
            return true;
        }
    }

    return false;
}

export function patchFormFieldInstanceSnapshot(
    snapshot: ComponentInstance,
    prevParams: Record<string, any>,
    nextParams: Record<string, any>
): ComponentInstance {
    const nextInstance: ComponentInstance = {
        ...snapshot,
        componentId: 'form-field',
        params: nextParams
    };
    if (shouldResetFormFieldChildren(prevParams, nextParams)) {
        const { children: _unused, ...rest } = nextInstance;
        return rest;
    }
    return nextInstance;
}

// ── detectFormActualState ───────────────────────────────────────────
// Uses buildComponentInstanceFromNode from code.ts via dependency injection.

export function detectFormActualState(
    formRoot: FrameNode,
    buildComponentInstanceFromNode: (node: SceneNode) => ComponentInstance | null
): {
    showActionArea: boolean;
} {
    const instance = buildComponentInstanceFromNode(formRoot);
    if (!instance || !Array.isArray(instance.children)) {
        return { showActionArea: false };
    }
    const isButtonRow = (child: any) => child.componentId === 'form-row'
        && Array.isArray(child.children)
        && child.children.length > 0
        && child.children.every((item: any) => item.componentId === 'button');
    const isActionAreaChild = (child: any) => child.componentId === 'button'
        || isButtonRow(child)
        || (
            child.componentId === 'layout'
            && Array.isArray(child.children)
            && child.children.length > 0
            && child.children.every((item: any) => item.componentId === 'button' || isButtonRow(item))
        );
    return {
        showActionArea: instance.children.some(isActionAreaChild)
    };
}
