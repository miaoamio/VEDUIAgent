export const FULL_RERENDER_COMPONENT_IDS = new Set([
  'page',
  'card',
  'form',
  'figma-component',
  'button',
  'input',
  'select',
  'filter-group',
  'checkbox',
  'checkbox-group',
  'radio-group',
  'form-field',
  'tag'
]);

export const GENERIC_EDITABLE_PARAM_KEYS = new Set([
  'spacing',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'backgroundColor',
  'borderColor',
  'borderWidth',
  'borderBottomOnly',
  'cornerRadius',
  'width',
  'height',
  'text',
  'lineHeight',
  'fontSize',
  'fontWeight',
  'color'
]);

export const COMPONENT_EDITABLE_PARAM_KEYS: Record<string, string[]> = {
  layout: ['direction', 'clipsContent'],
  'form-row': ['align']
};

export const GENERATION_ONLY_PARAM_KEYS = new Set([
  'width',
  'cornerRadius',
  'headerHeight',
  'bodyHeight'
]);
