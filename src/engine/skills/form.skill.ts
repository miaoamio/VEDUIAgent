/**
 * form.skill.ts — Layer 2: Skill
 *
 * 封装 draw_form 的完整业务逻辑。
 * 被 App.tsx 的 draw_form case handler（Tool）调用，不直接暴露给 AI。
 *
 * 依赖：
 *   - block.helpers.ts（共用 Utils）
 *   - theme/active（activeTheme.components，用于 token 合法性校验）
 */

import { activeTheme } from '../../theme/active';
import { isObject, toButtonFromItem } from './block.helpers';

// ─── 常量 ────────────────────────────────────────────────────────────────────

export const SECTION_TITLE_COMPONENT_KEY = 'f02c3053469b8fadc3b6113a508e1b7b98330d95';
export const SEGMENTED_PICKER_COMPONENT_KEY = '94125fa758354931512313d1bb6ce37aae02b8c7';
export const DELETE_ICON_COMPONENT_TOKEN = 'table-cell-icon-delete';

// ─── 类型 ────────────────────────────────────────────────────────────────────

type NormalizedFormFieldControlType =
  | 'input'
  | 'select'
  | 'checkbox-group'
  | 'radio-group'
  | 'switch'
  | 'datepicker'
  | 'inputnumber'
  | 'slider'
  | 'textarea'
  | 'timepicker'
  | 'upload'
  | 'segmented-picker'
  | 'figma-component'
  | 'button';

// ─── Utils：控件类型规则表 ────────────────────────────────────────────────────

const FORM_LIBRARY_CONTROL_RULES: Array<{
  keywords: string[];
  token: string;
  fieldControlType: NormalizedFormFieldControlType;
  inlineComponentId: 'input' | 'select' | 'checkbox-group' | 'radio-group' | 'figma-component';
}> = [
  {
    keywords: ['timepicker-menu'],
    token: 'lib-data-input-timepicker-menu',
    fieldControlType: 'figma-component',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['checkbox-group'],
    token: 'lib-data-input-checkbox-group',
    fieldControlType: 'checkbox-group',
    inlineComponentId: 'checkbox-group'
  },
  {
    keywords: ['radio-group'],
    token: 'lib-data-input-radio-group',
    fieldControlType: 'radio-group',
    inlineComponentId: 'radio-group'
  },
  {
    keywords: ['tree-select', 'treeselect'],
    token: 'lib-data-input-treeselect',
    fieldControlType: 'figma-component',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['input-number', 'inputnumber'],
    token: 'lib-data-input-inputnumber',
    fieldControlType: 'inputnumber',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['datetime'],
    token: 'library.data-input.datetimepicker-segemented',
    fieldControlType: 'figma-component',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['datepicker', 'datepick', '日期'],
    token: 'lib-data-input-datepicker',
    fieldControlType: 'datepicker',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['autocomplete'],
    token: 'lib-data-input-autocomplete',
    fieldControlType: 'figma-component',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['cascader'],
    token: 'lib-data-input-cascader',
    fieldControlType: 'figma-component',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['checkbox', '多选'],
    token: 'lib-data-input-checkbox',
    fieldControlType: 'checkbox-group',
    inlineComponentId: 'checkbox-group'
  },
  {
    keywords: ['drag'],
    token: 'lib-data-input-drag',
    fieldControlType: 'figma-component',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['radio', '单选'],
    token: 'lib-data-input-radio',
    fieldControlType: 'radio-group',
    inlineComponentId: 'radio-group'
  },
  {
    keywords: ['search'],
    token: 'lib-data-input-search',
    fieldControlType: 'input',
    inlineComponentId: 'input'
  },
  {
    keywords: ['segmented'],
    token: 'lib-data-input-segmented-picker',
    fieldControlType: 'segmented-picker',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['slider', '滑动'],
    token: 'lib-data-input-slider',
    fieldControlType: 'slider',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['switch', '开关'],
    token: 'lib-data-input-switch',
    fieldControlType: 'switch',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['textarea', '多行'],
    token: 'lib-data-input-textarea',
    fieldControlType: 'textarea',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['timepicker', '时间'],
    token: 'lib-data-input-timepicker',
    fieldControlType: 'timepicker',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['transfer'],
    token: 'lib-data-input-transfer',
    fieldControlType: 'figma-component',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['upload', '上传'],
    token: 'lib-data-input-button',
    fieldControlType: 'upload',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['image'],
    token: 'lib-data-input-image',
    fieldControlType: 'figma-component',
    inlineComponentId: 'figma-component'
  },
  {
    keywords: ['select', 'dropdown', '选择'],
    token: 'lib-data-input-select',
    fieldControlType: 'select',
    inlineComponentId: 'select'
  },
  {
    keywords: ['input', '搜索'],
    token: 'lib-data-input-input',
    fieldControlType: 'input',
    inlineComponentId: 'input'
  }
];

const COLLAPSIBLE_TOKEN_DRIVEN_FORM_FIELD_TYPES = new Set<NormalizedFormFieldControlType>([
  'input',
  'select',
  'switch',
  'datepicker',
  'inputnumber',
  'slider',
  'textarea',
  'timepicker',
  'upload',
  'segmented-picker'
]);

// ─── Utils：form 专属工具函数 ─────────────────────────────────────────────────

const normalizeFormControlLookupValue = (value: unknown): string =>
  String(value || '').trim().toLowerCase().replace(/_/g, '-');

const resolveFormLibraryControlRule = (value: unknown) => {
  const normalized = normalizeFormControlLookupValue(value);
  if (!normalized) return null;
  return FORM_LIBRARY_CONTROL_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword))
  ) || null;
};

const resolveFormControlTokenByType = (value: unknown): string => {
  const normalized = normalizeFormControlLookupValue(value);
  if (!normalized) return '';
  const match = FORM_LIBRARY_CONTROL_RULES.find((rule) => rule.fieldControlType === normalized);
  return match?.token || '';
};

const canonicalizeLooseFormComponentToken = (value: unknown): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = normalizeFormControlLookupValue(raw);
  if (activeTheme.components[normalized]) return normalized;
  return resolveFormLibraryControlRule(normalized)?.token || raw;
};

const normalizeFormFieldControlTypeHint = (
  value: unknown
): NormalizedFormFieldControlType | '' => {
  const normalized = normalizeFormControlLookupValue(value);
  if (!normalized) return '';
  const matchedRule = resolveFormLibraryControlRule(normalized);
  if (matchedRule) return matchedRule.fieldControlType;
  if (normalized.includes('button') || normalized.includes('btn') || normalized.includes('按钮')) return 'button';
  if (normalized.includes('figma')) return 'figma-component';
  return '';
};

const normalizeFormAlignValue = (value: unknown): 'top' | 'left' | 'right' => {
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
};

const normalizeFormLabelWidthPresetValue = (
  value: unknown
): 'fill' | 'default-80' | 'medium-120' | 'large-160' | 'custom' => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || normalized === 'custom') return 'custom';
  if (normalized.includes('fill') || normalized.includes('跟随')) return 'fill';
  if (normalized.includes('160') || normalized.includes('large')) return 'large-160';
  if (normalized.includes('120') || normalized.includes('medium')) return 'medium-120';
  if (normalized.includes('80') || normalized.includes('default')) return 'default-80';
  return 'custom';
};

const resolveFormLabelWidthValue = (preset: unknown, labelWidth: unknown, fallback: number): number => {
  const explicit = Number(labelWidth);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  switch (normalizeFormLabelWidthPresetValue(preset)) {
    case 'default-80': return 80;
    case 'medium-120': return 120;
    case 'large-160':  return 160;
    default:           return fallback;
  }
};

const resolveGroupLabelMode = (value: unknown): 'all' | 'first' => {
  if (value === false) return 'first';
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'all';
  if (normalized === 'first' || normalized === 'first-only' || normalized === 'firstonly') return 'first';
  if (normalized.includes('仅首') || normalized.includes('首行') || normalized.includes('只展示首')) return 'first';
  return 'all';
};

const buildOptionsTextFromValue = (value: unknown, fallback = '选项一,选项二'): string => {
  if (Array.isArray(value)) {
    const items = value.map((item) => {
      if (item && typeof item === 'object') {
        return String((item as any).label || (item as any).name || (item as any).text || (item as any).value || '').trim();
      }
      return String(item || '').trim();
    }).filter(Boolean);
    return items.length > 0 ? items.join(',') : fallback;
  }
  if (value && typeof value === 'object') {
    return fallback;
  }
  const text = String(value || '').trim();
  return text || fallback;
};

const buildInputParamsFromSource = (props: Record<string, any>, itemObj: Record<string, any>) => ({
  placeholder: String(props.placeholder || itemObj.placeholder || '请输入'),
  value: String(props.value || itemObj.value || ''),
  size: String(props.size || itemObj.size || 'Default 32'),
  state: String(props.state || itemObj.state || 'Default 默认'),
  filled: Boolean(props.filled ?? itemObj.filled),
  error: Boolean(props.error ?? itemObj.error),
  disabled: Boolean(props.disabled ?? itemObj.disabled),
  showPrefix: Boolean(props.showPrefix ?? props.prefix ?? itemObj.showPrefix ?? itemObj.prefix),
  prefixText: String(props.prefixText || itemObj.prefixText || ''),
  showSuffix: Boolean(props.showSuffix ?? props.suffix ?? itemObj.showSuffix ?? itemObj.suffix),
  suffixText: String(props.suffixText || itemObj.suffixText || '')
});

const extractExplicitItemTopLevelParams = (itemObj: Record<string, any>): Record<string, any> => {
  const topLevelParams = { ...itemObj };
  delete topLevelParams.componentId;
  delete topLevelParams.props;
  delete topLevelParams.params;
  delete topLevelParams.children;
  return topLevelParams;
};

const buildExplicitComponentParams = (itemObj: Record<string, any>): Record<string, any> => {
  const props = isObject(itemObj.props) ? itemObj.props as Record<string, any> : {};
  const nestedParams = isObject(itemObj.params) ? itemObj.params as Record<string, any> : {};
  const topLevelParams = extractExplicitItemTopLevelParams(itemObj);
  const mergedParams = { ...props, ...nestedParams, ...topLevelParams };
  const canonicalToken = canonicalizeLooseFormComponentToken(mergedParams.componentToken ?? mergedParams.token);
  if (canonicalToken) {
    mergedParams.componentToken = canonicalToken;
  }
  return mergedParams;
};

const buildExplicitFormFieldParams = (
  itemObj: Record<string, any>,
  index: number,
  sharedFieldParams: Record<string, any>
): Record<string, any> => {
  const props = isObject(itemObj.props) ? itemObj.props as Record<string, any> : {};
  const nestedParams = isObject(itemObj.params) ? itemObj.params as Record<string, any> : {};
  const topLevelParams = extractExplicitItemTopLevelParams(itemObj);
  delete topLevelParams.label;
  delete topLevelParams.title;
  delete topLevelParams.name;

  const mergedParams: Record<string, any> = { ...props, ...nestedParams, ...topLevelParams };

  let fieldLabel = String(
    nestedParams.label ??
    itemObj.label ??
    itemObj.title ??
    itemObj.name ??
    `字段${index + 1}`
  );

  // 防御：去掉 label 中的必填星号，若包含星号则默认置为 required: true
  if (fieldLabel.includes('*')) {
    fieldLabel = fieldLabel.replace(/\*/g, '').trim();
    mergedParams.required = true;
  }

  const canonicalToken = canonicalizeLooseFormComponentToken(mergedParams.componentToken ?? mergedParams.token);
  if (canonicalToken) {
    mergedParams.componentToken = canonicalToken;
  }

  const explicitControlType = normalizeFormFieldControlTypeHint(mergedParams.controlType);
  const tokenControlType = canonicalToken ? normalizeFormFieldControlTypeHint(canonicalToken) : '';
  const canCollapseTokenDrivenControl =
    tokenControlType !== '' &&
    tokenControlType !== 'figma-component' &&
    COLLAPSIBLE_TOKEN_DRIVEN_FORM_FIELD_TYPES.has(tokenControlType as NormalizedFormFieldControlType);

  if (explicitControlType && explicitControlType !== 'figma-component') {
    mergedParams.controlType = explicitControlType;
    if (!mergedParams.componentToken) {
      mergedParams.componentToken = resolveFormControlTokenByType(explicitControlType);
    }
  } else if ((explicitControlType === 'figma-component' || !explicitControlType) && canCollapseTokenDrivenControl) {
    mergedParams.controlType = tokenControlType;
    if (!mergedParams.componentToken) {
      mergedParams.componentToken = canonicalToken || resolveFormControlTokenByType(tokenControlType);
    }
  } else if (explicitControlType) {
    mergedParams.controlType = explicitControlType;
  }

  const controlType = String(mergedParams.controlType || '').trim().toLowerCase();
  if (controlType === 'button') {
    if (!mergedParams.buttonLabel) {
      mergedParams.buttonLabel = String(
        props.label ??
        nestedParams.buttonLabel ??
        topLevelParams.buttonLabel ??
        itemObj.value ??
        '按钮'
      );
    }
    if (!mergedParams.buttonVariant) {
      mergedParams.buttonVariant = String(
        props.variant ??
        nestedParams.buttonVariant ??
        topLevelParams.buttonVariant ??
        topLevelParams.variant ??
        'secondary'
      );
    }
  }

  return { ...sharedFieldParams, ...mergedParams, label: fieldLabel };
};

// ─── Skill 主体 ───────────────────────────────────────────────────────────────

export const buildNormalizedFormComponentFromSource = (
  formSource: any,
  options?: { defaultWidth?: number; forcedTitle?: string }
): any | null => {
  const source = isObject(formSource) ? formSource : {};
  const body = isObject(source?.body) ? source.body : source;

  const align = normalizeFormAlignValue(body.align ?? source.align ?? body.layout ?? source.layout ?? 'top');
  const labelWidthPreset = normalizeFormLabelWidthPresetValue(body.labelWidthPreset ?? source.labelWidthPreset);
  const layout = String(body.layout || source.layout || (align === 'top' ? 'vertical' : 'horizontal'));
  const rowSpacingRaw = Number(body.rowSpacing ?? source.rowSpacing);
  const columnSpacingRaw = Number(body.columnSpacing ?? body.spacing ?? source.columnSpacing ?? source.spacing);
  const labelWidthRaw = resolveFormLabelWidthValue(labelWidthPreset, body.labelWidth ?? source.labelWidth, 96);
  const controlWidthRaw = Number(body.controlWidth ?? source.controlWidth);
  const widthRaw = Number(body.width ?? source.width);
  const labelWidthAutoRaw = body.labelWidthAuto ?? source.labelWidthAuto;
  const labelWidthAuto = labelWidthAutoRaw === false ? false : true;

  const sharedFieldParams = {
    align,
    layout,
    labelAlign: align === 'right' ? 'right' : 'left',
    labelWidthPreset,
    labelWidth: align === 'top' ? 0 : labelWidthRaw,
    controlWidth: Number.isFinite(controlWidthRaw) && controlWidthRaw > 0 ? controlWidthRaw : 240,
    showColon: Boolean(body.showColon ?? source.showColon ?? false)
  };

  const baseRowSpacing = Number.isFinite(rowSpacingRaw) && rowSpacingRaw > 0 ? rowSpacingRaw : (align === 'top' ? 24 : 12);
  const baseColumnSpacing = Number.isFinite(columnSpacingRaw) && columnSpacingRaw > 0 ? columnSpacingRaw : 16;
  const groupLabelMode = resolveGroupLabelMode(body.groupLabelMode ?? body.showGroupLabel ?? source.groupLabelMode ?? source.showGroupLabel);

  const rows = Array.isArray(body.rows)
    ? body.rows
    : Array.isArray(body.fields)
      ? body.fields.map((item: any) => [item])
      : isObject(body.filters) && Array.isArray((body.filters as any).items)
        ? (body.filters as any).items.map((item: any) => [item])
        : Array.isArray(source.rows)
          ? source.rows
          : Array.isArray(source.fields)
            ? source.fields.map((item: any) => [item])
            : isObject(source.filters) && Array.isArray((source.filters as any).items)
              ? (source.filters as any).items.map((item: any) => [item])
              : [];

  const buildControlComponentFromItem = (item: any, index: number): any | null => {
    const itemObj = isObject(item) ? item : { componentId: 'input', props: { value: String(item ?? '') } };
    const explicitParams = buildExplicitComponentParams(itemObj);
    const explicitComponentId = String(itemObj.componentId || '').trim();
    const rawType = String(explicitComponentId || itemObj.type || '').trim();
    const canonicalToken = canonicalizeLooseFormComponentToken(
      explicitParams.componentToken ?? itemObj.componentToken ?? itemObj.token
    );
    const buildFigmaComponentParams = (token: string, componentKey?: string) => ({
      ...explicitParams,
      ...(token ? { componentToken: token } : {}),
      ...(componentKey ? { componentKey } : {}),
      forceFigmaKey: true
    });

    if (explicitComponentId === 'figma-component') {
      return {
        componentId: 'figma-component',
        params: canonicalToken ? buildFigmaComponentParams(canonicalToken) : { ...explicitParams, forceFigmaKey: true }
      };
    }

    if (
      explicitComponentId === 'input' ||
      explicitComponentId === 'select' ||
      explicitComponentId === 'checkbox-group' ||
      explicitComponentId === 'radio-group' ||
      explicitComponentId === 'segmented-picker' ||
      explicitComponentId === 'switch' ||
      explicitComponentId === 'datepicker' ||
      explicitComponentId === 'inputnumber' ||
      explicitComponentId === 'slider' ||
      explicitComponentId === 'textarea' ||
      explicitComponentId === 'timepicker' ||
      explicitComponentId === 'upload'
    ) {
      const token = canonicalToken || resolveFormControlTokenByType(explicitComponentId);
      const nextComponentKey = String(explicitParams.componentKey || itemObj.componentKey || '').trim();
      const segmentedKey = token.includes('segmented') && !nextComponentKey ? SEGMENTED_PICKER_COMPONENT_KEY : nextComponentKey;
      if (token) {
        return {
          componentId: 'figma-component',
          params: buildFigmaComponentParams(token, segmentedKey)
        };
      }
      return { componentId: explicitComponentId, params: explicitParams };
    }

    const normalizedControlType = normalizeFormFieldControlTypeHint(rawType || canonicalToken);
    if (normalizedControlType === 'button') {
      return toButtonFromItem(itemObj, `操作${index + 1}`, 'secondary');
    }

    if (normalizedControlType === 'segmented-picker') {
      const optionsText = buildOptionsTextFromValue(
        explicitParams.optionsText ?? itemObj.optionsText ?? itemObj.options
      );
      const hasOptionsText = explicitParams.optionsText !== undefined;
      const token = canonicalToken || resolveFormControlTokenByType(normalizedControlType);
      const nextComponentKey = String(explicitParams.componentKey || itemObj.componentKey || '').trim();
      const segmentedKey = token.includes('segmented') && !nextComponentKey ? SEGMENTED_PICKER_COMPONENT_KEY : nextComponentKey;
      if (token) {
        return {
          componentId: 'figma-component',
          params: buildFigmaComponentParams(token, segmentedKey)
        };
      }
      return {
        componentId: 'segmented-picker',
        params: hasOptionsText ? explicitParams : { ...explicitParams, optionsText }
      };
    }

    if (normalizedControlType === 'figma-component') {
      const fallbackToken = canonicalToken || resolveFormLibraryControlRule(rawType)?.token || '';
      if (fallbackToken) {
        const nextComponentKey = String(explicitParams.componentKey || itemObj.componentKey || '').trim();
        const segmentedKey = fallbackToken.includes('segmented') && !nextComponentKey
          ? SEGMENTED_PICKER_COMPONENT_KEY
          : nextComponentKey;
        return {
          componentId: 'figma-component',
          params: {
            ...explicitParams,
            componentToken: fallbackToken,
            ...(segmentedKey ? { componentKey: segmentedKey } : {}),
            forceFigmaKey: true
          }
        };
      }
    }

    if (normalizedControlType) {
      const token = canonicalToken || resolveFormControlTokenByType(normalizedControlType);
      const nextComponentKey = String(explicitParams.componentKey || itemObj.componentKey || '').trim();
      const segmentedKey = token.includes('segmented') && !nextComponentKey ? SEGMENTED_PICKER_COMPONENT_KEY : nextComponentKey;
      if (token) {
        return {
          componentId: 'figma-component',
          params: buildFigmaComponentParams(token, segmentedKey)
        };
      }
    }

    return { componentId: 'input', params: explicitParams };
  };

  const buildRowChildFromItem = (item: any, index: number): any | null => {
    const itemObj = isObject(item) ? item : { label: String(item || '') };
    const props = isObject(itemObj.props) ? itemObj.props : {};
    const explicitComponentId = String(itemObj.componentId || '').trim();
    if (explicitComponentId === 'form-field') {
      return {
        componentId: 'form-field',
        params: buildExplicitFormFieldParams(itemObj, index, sharedFieldParams)
      };
    }

    if (explicitComponentId === 'button') {
      return {
        componentId: explicitComponentId,
        params: buildExplicitComponentParams(itemObj)
      };
    }

    const rawType = String(explicitComponentId || itemObj.type || '').trim();
    const canonicalToken = canonicalizeLooseFormComponentToken(
      props.componentToken ?? itemObj.componentToken ?? itemObj.token
    );
    const normalizedControlType = explicitComponentId === 'figma-component'
      ? 'figma-component'
      : normalizeFormFieldControlTypeHint(rawType || canonicalToken);

    if (normalizedControlType === 'button') {
      return toButtonFromItem(itemObj, `操作${index + 1}`, 'secondary');
    }

    let label = String(
      props.label ||
      itemObj.label ||
      itemObj.title ||
      itemObj.name ||
      `字段${index + 1}`
    );
    let required = Boolean(props.required ?? itemObj.required);

    // 防御：去掉 label 中的必填星号，若包含星号则默认置为 required: true
    if (label.includes('*')) {
      label = label.replace(/\*/g, '').trim();
      required = true;
    }

    const fieldBaseParams = {
      ...sharedFieldParams,
      label,
      required,
      helpText: String(props.helpText || itemObj.helpText || ''),
      descriptionText: typeof (props.descriptionText ?? props.description ?? itemObj.descriptionText ?? itemObj.description) === 'string'
        ? String(props.descriptionText ?? props.description ?? itemObj.descriptionText ?? itemObj.description)
        : '',
      errorText: typeof (props.errorText ?? itemObj.errorText) === 'string'
        ? String(props.errorText ?? itemObj.errorText)
        : ''
    };

    const optionsText = buildOptionsTextFromValue(
      props.optionsText ?? props.options ?? itemObj.optionsText ?? itemObj.options
    );
    const controlToken = canonicalToken || resolveFormControlTokenByType(normalizedControlType);
    const controlComponentKey = controlToken.includes('segmented')
      ? SEGMENTED_PICKER_COMPONENT_KEY
      : String(props.componentKey || itemObj.componentKey || '').trim();

    const inputs = Array.isArray(props.inputs ?? itemObj.inputs)
      ? (props.inputs ?? itemObj.inputs)
      : [];
    const inputChildren = inputs
      .map((inputItem: any, inputIndex: number) => buildControlComponentFromItem(inputItem, inputIndex))
      .filter(Boolean);
    const inputLayout = inputChildren.length > 0
      ? {
        componentId: 'layout',
        params: { direction: 'horizontal', spacing: 12 },
        children: inputChildren
      }
      : null;

    if (normalizedControlType === 'checkbox-group') {
      return {
        componentId: 'form-field',
        params: {
          ...fieldBaseParams,
          controlType: 'checkbox-group',
          ...(controlToken ? { componentToken: controlToken } : {}),
          optionsText,
          checkedValues: String(props.checkedValues || itemObj.checkedValues || props.value || itemObj.value || '选项一'),
          direction: String(props.direction || itemObj.direction || 'horizontal')
        },
        children: inputLayout ? [inputLayout] : undefined
      };
    }

    if (normalizedControlType === 'radio-group') {
      return {
        componentId: 'form-field',
        params: {
          ...fieldBaseParams,
          controlType: 'radio-group',
          ...(controlToken ? { componentToken: controlToken } : {}),
          optionsText,
          value: String(props.value || itemObj.value || '选项一'),
          direction: String(props.direction || itemObj.direction || 'horizontal')
        },
        children: inputLayout ? [inputLayout] : undefined
      };
    }

    if (normalizedControlType === 'select') {
      return {
        componentId: 'form-field',
        params: {
          ...fieldBaseParams,
          controlType: 'select',
          ...(controlToken ? { componentToken: controlToken } : {}),
          value: String(props.value || itemObj.value || '请选择')
        },
        children: inputLayout ? [inputLayout] : undefined
      };
    }

    if (normalizedControlType === 'segmented-picker') {
      const widthRaw = Number(props.width ?? itemObj.width);
      return {
        componentId: 'form-field',
        params: {
          ...fieldBaseParams,
          controlType: 'segmented-picker',
          ...(controlToken ? { componentToken: controlToken } : {}),
          ...(controlComponentKey ? { componentKey: controlComponentKey } : {}),
          optionsText,
          value: String(props.value || itemObj.value || '选项一'),
          size: String(props.size || itemObj.size || 'Default 32'),
          disabled: Boolean(props.disabled ?? itemObj.disabled),
          ...(Number.isFinite(widthRaw) && widthRaw > 0 ? { width: widthRaw } : {})
        },
        children: inputLayout ? [inputLayout] : undefined
      };
    }

    if (normalizedControlType === 'input') {
      return {
        componentId: 'form-field',
        params: {
          ...fieldBaseParams,
          controlType: 'input',
          ...(controlToken ? { componentToken: controlToken } : {}),
          ...buildInputParamsFromSource(props, itemObj)
        },
        children: inputLayout ? [inputLayout] : undefined
      };
    }

    if (
      normalizedControlType === 'switch' ||
      normalizedControlType === 'datepicker' ||
      normalizedControlType === 'inputnumber' ||
      normalizedControlType === 'slider' ||
      normalizedControlType === 'textarea' ||
      normalizedControlType === 'timepicker' ||
      normalizedControlType === 'upload'
    ) {
      return {
        componentId: 'form-field',
        params: {
          ...fieldBaseParams,
          controlType: normalizedControlType,
          ...(controlToken ? { componentToken: controlToken } : {}),
          ...buildInputParamsFromSource(props, itemObj)
        },
        children: inputLayout ? [inputLayout] : undefined
      };
    }

    if (normalizedControlType === 'figma-component') {
      const componentToken = canonicalToken || resolveFormLibraryControlRule(rawType)?.token || '';
      if (componentToken) {
        const nextComponentKey = String(props.componentKey || itemObj.componentKey || '').trim();
        const segmentedKey = componentToken.includes('segmented') && !nextComponentKey
          ? SEGMENTED_PICKER_COMPONENT_KEY
          : nextComponentKey;
        return {
          componentId: 'form-field',
          params: {
            ...fieldBaseParams,
            controlType: 'figma-component',
            componentToken,
            ...(segmentedKey ? { componentKey: segmentedKey } : {}),
            variantCriteria: String(props.variantCriteria || itemObj.variantCriteria || ''),
            disabled: Boolean(props.disabled ?? itemObj.disabled)
          },
          children: inputLayout ? [inputLayout] : undefined
        };
      }
    }

    return {
      componentId: 'form-field',
      params: {
        ...fieldBaseParams,
        controlType: 'input',
        placeholder: String(props.placeholder || itemObj.placeholder || '请输入'),
        value: String(props.value || itemObj.value || '')
      },
      children: inputLayout ? [inputLayout] : undefined
    };
  };

  const isSegmentedPickerItem = (item: any): boolean => {
    const itemObj = isObject(item) ? item : {};
    const props = isObject(itemObj.props) ? itemObj.props : {};
    const rawType = String(itemObj.componentId || itemObj.type || '').trim().toLowerCase();
    if (rawType.includes('segmented')) return true;
    const componentKey = String(props.componentKey || itemObj.componentKey || '').trim();
    const componentToken = canonicalizeLooseFormComponentToken(
      props.componentToken || itemObj.componentToken || itemObj.token || ''
    );
    return componentKey === SEGMENTED_PICKER_COMPONENT_KEY || componentToken.includes('segmented');
  };

  const footer = isObject(source.footer) ? source.footer : {};
  const footerActions = Array.isArray(footer.actions)
    ? footer.actions
    : Array.isArray(source.actions)
      ? source.actions
      : [];
  const footerRow = footerActions.length > 0
    ? (footerActions.length === 1
      ? toButtonFromItem(footerActions[0], '操作1', 'secondary')
      : {
        componentId: 'form-row',
        params: {
          spacing: 8,
          align: String(footer.align || source.actionAlign || 'end')
        },
        children: footerActions.map((item: any, index: number) =>
          toButtonFromItem(item, `操作${index + 1}`, 'secondary')
        )
      })
    : null;

  const buildFormRowFromItems = (
    row: any[],
    rowOptions?: { spacing?: number; forceVertical?: boolean; hideLabels?: boolean; showDelete?: boolean }
  ): any | null => {
    if (!Array.isArray(row)) return null;
    const rowChildren = row.map((item: any, index: number) => buildRowChildFromItem(item, index)).filter(Boolean);
    if (rowChildren.length === 0) return null;
    rowChildren.forEach((child: any) => {
      if (child?.componentId !== 'form-field' || !child.params) return;
      if (rowOptions?.forceVertical) {
        child.params.layout = 'vertical';
        child.params.align = 'top';
        child.params.labelWidth = 0;
      }
      if (rowOptions?.hideLabels) {
        child.params.label = '';
      }
    });
    if (rowOptions?.showDelete) {
      rowChildren.push({
        componentId: 'figma-component',
        params: { componentToken: DELETE_ICON_COMPONENT_TOKEN }
      });
    }
    if (rowChildren.length === 1 && rowChildren[0]?.componentId === 'button') {
      return rowChildren[0];
    }
    const segmentedCount = row.filter((item: any) => isSegmentedPickerItem(item)).length;
    const isSegmentedRow = segmentedCount > 1 && segmentedCount === row.length;
    const spacing = Number.isFinite(rowOptions?.spacing)
      ? Number(rowOptions?.spacing)
      : (isSegmentedRow ? 8 : baseColumnSpacing);
    return {
      componentId: 'form-row',
      params: { spacing, align: 'start' },
      children: rowChildren
    };
  };

  const buildRowsFromArray = (
    rowsArray: any[],
    rowOptions?: { spacing?: number; forceVertical?: boolean; hideLabels?: boolean; showDelete?: boolean }
  ): any[] => {
    const result: any[] = [];
    rowsArray.forEach((row: any) => {
      const rowNode = buildFormRowFromItems(row, rowOptions);
      if (rowNode) result.push(rowNode);
    });
    return result;
  };

  const buildGroupLayoutFromGroups = (groups: any[]): any | null => {
    const groupRows = groups.map((group: any, groupIndex: number) => {
      const groupObj = isObject(group) ? group : {};
      const groupFields = Array.isArray(group)
        ? group
        : Array.isArray(groupObj.fields)
          ? groupObj.fields
          : Array.isArray(groupObj.items)
            ? groupObj.items
            : [];
      if (!Array.isArray(groupFields) || groupFields.length === 0) return null;
      const showDelete = Boolean(groupObj.deletable ?? groupObj.allowDelete ?? groupObj.canDelete ?? groupObj.showDelete);
      const hideLabels = groupLabelMode === 'first' && groupIndex > 0;
      return buildFormRowFromItems(groupFields, {
        spacing: 12,
        forceVertical: true,
        hideLabels,
        showDelete
      });
    }).filter(Boolean);
    if (groupRows.length === 0) return null;
    return {
      componentId: 'layout',
      params: { direction: 'vertical', spacing: 12 },
      children: groupRows
    };
  };

  const sections = Array.isArray(body.sections)
    ? body.sections
    : Array.isArray(source.sections)
      ? source.sections
      : [];
  const groupSource = Array.isArray(body.groups)
    ? body.groups
    : Array.isArray(body.fieldGroups)
      ? body.fieldGroups
      : Array.isArray(source.groups)
        ? source.groups
        : Array.isArray(source.fieldGroups)
          ? source.fieldGroups
          : [];

  const children: any[] = [];
  if (sections.length > 0) {
    sections.forEach((section: any) => {
      const sectionObj = isObject(section) ? section : { title: String(section ?? '') };
      const sectionTitle = String(sectionObj.title || '').trim();
      const sectionRows = Array.isArray(sectionObj.rows)
        ? sectionObj.rows
        : Array.isArray(sectionObj.fields)
          ? [sectionObj.fields]
          : [];
      const sectionGroups = Array.isArray(sectionObj.groups)
        ? sectionObj.groups
        : Array.isArray(sectionObj.fieldGroups)
          ? sectionObj.fieldGroups
          : [];
      const groupLayout = sectionGroups.length > 0 ? buildGroupLayoutFromGroups(sectionGroups) : null;
      const sectionContent = groupLayout ? [groupLayout] : buildRowsFromArray(sectionRows);
      if (sectionContent.length === 0) return;
      const sectionBody = sectionContent.length === 1
        ? sectionContent[0]
        : {
          componentId: 'layout',
          params: { direction: 'vertical', spacing: baseRowSpacing },
          children: sectionContent
        };
      const sectionChildren: any[] = [];
      if (sectionTitle) {
        sectionChildren.push({
          componentId: 'figma-component',
          params: {
            componentKey: SECTION_TITLE_COMPONENT_KEY,
            text: sectionTitle,
            fallbackName: 'Section Title'
          }
        });
      }
      sectionChildren.push(sectionBody);
      children.push({
        componentId: 'layout',
        params: {
          direction: 'vertical',
          spacing: sectionTitle ? (layout === 'vertical' ? 12 : 24) : baseRowSpacing
        },
        children: sectionChildren
      });
    });
  } else if (groupSource.length > 0) {
    const groupLayout = buildGroupLayoutFromGroups(groupSource);
    if (groupLayout) {
      if (footerRow) {
        children.push({
          componentId: 'layout',
          params: { direction: 'vertical', spacing: 4 },
          children: [groupLayout, footerRow]
        });
      } else {
        children.push(groupLayout);
      }
    }
  } else {
    children.push(...buildRowsFromArray(rows));
    if (footerRow) children.push(footerRow);
  }

  if (children.length === 0) {
    // No fallback — return null so the caller can report an error to the LLM
    // and let it fix the JSON payload.
    return null;
  }

  return {
    componentId: 'form',
    params: {
      title: typeof options?.forcedTitle === 'string' ? options.forcedTitle : String(body.title || source.title || ''),
      align,
      layout,
      labelWidthPreset,
      width: Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : 0,
      rowSpacing: sections.length > 0 ? 40 : baseRowSpacing,
      columnSpacing: baseColumnSpacing,
      labelWidth: sharedFieldParams.labelWidth,
      controlWidth: sharedFieldParams.controlWidth,
      showColon: sharedFieldParams.showColon,
      labelWidthAuto,
      requiredMark: true
    },
    children
  };
};

// ─── Skill 入口（被 draw_form Tool handler 调用）──────────────────────────────

export const buildFormComponentFromPayload = (payload: any): any | null => {
  const source = isObject(payload?.block) ? payload.block : payload;
  if (!isObject(source)) return null;
  return buildNormalizedFormComponentFromSource(source);
};

/**
 * 处理表单布局参数更新的业务逻辑。
 * 当对齐方式从顶部（纵向）切换到左/右（横向）时，自动开启自适应标签宽度。
 */
export const resolveFormLayoutParamsUpdate = (
  prevParams: Record<string, any>,
  nextParams: Record<string, any>
): Record<string, any> => {
  const prevAlign = String(prevParams?.align || 'top').trim().toLowerCase();
  const nextAlign = String(nextParams?.align || 'top').trim().toLowerCase();

  const isVertical = prevAlign === 'top';
  const isHorizontal = nextAlign === 'left' || nextAlign === 'right';

  if (isVertical && isHorizontal) {
    return { ...nextParams, labelWidthAuto: true };
  }
  return nextParams;
};
