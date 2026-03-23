/**
 * Maps Figma library component tokens (lib-xxx format) to the componentIds
 * that should be suggested when a user selects that component in Figma.
 *
 * Used by the Docs tab "reverse lookup" feature to find relevant registry specs
 * for an inspected component instance.
 */
export const SPEC_COMPONENT_TOKEN_MAP: Record<string, string[]> = {
  // Basic
  'lib-basic-button': ['button', 'figma-component'],

  // Form inputs
  'lib-data-input-input': ['input', 'figma-component'],
  'lib-data-input-inputnumber': ['inputnumber', 'figma-component'],
  'lib-data-input-select': ['select', 'figma-component'],
  'lib-data-input-checkbox': ['checkbox', 'figma-component'],
  'lib-data-input-textarea': ['textarea', 'figma-component'],
  'lib-data-input-checkbox-group': ['checkbox-group', 'figma-component'],
  'lib-data-input-switch': ['switch', 'figma-component'],
  'lib-data-input-slider': ['slider', 'figma-component'],
  'lib-data-input-datepicker': ['datepicker', 'figma-component'],
  'lib-data-input-timepicker': ['timepicker', 'figma-component'],
  'lib-data-input-segmented-picker': ['segmented-picker', 'figma-component'],
  'lib-data-input-radio-group': ['radio-group', 'figma-component'],
  'lib-data-input-button': ['upload', 'button', 'figma-component'],
  'lib-data-input-form': ['form', 'form-field', 'figma-component', 'radio-group'],
  'lib-data-input-horizontal-form': ['form', 'form-field', 'figma-component', 'radio-group'],
  'lib-data-input-vertical-form': ['form', 'form-field', 'figma-component', 'radio-group'],

  // Data display
  'lib-data-display-card': ['card', 'figma-component'],
  'lib-data-display-table': ['table', 'figma-component'],
  'lib-data-display-tag': ['tag', 'figma-component'],
  'lib-data-display-status-tag': ['table-cell-tag', 'tag', 'figma-component'],
  'lib-data-display-avataricon': ['table-cell-avatar', 'figma-component'],

  // Table cell tokens
  'table-cell-avatar': ['table-cell-avatar'],
  'table-cell-select': ['table-cell-select'],
  'table-cell-input': ['table-cell-input'],
  'table-cell-action-icon': ['table-cell-action-icon'],
  'table-cell-icon-more': ['table-cell-action-icon'],
  'table-cell-icon-edit': ['table-cell-action-icon'],
  'table-cell-icon-delete': ['table-cell-action-icon'],
  'table-cell-icon-action-more': ['table-cell-action-icon'],
  'table-row-action-text': ['table'],
  'table-row-action-checkbox': ['table'],
  'table-row-action-radio': ['table'],
  'table-row-action-drag': ['table'],
  'table-row-action-expand': ['table'],
  'table-row-action-switch': ['table'],
  'table-row-action-header': ['table'],
  'table.rowAction.text': ['table'],
  'table.rowAction.checkbox': ['table'],
  'table.rowAction.radio': ['table'],
  'table.rowAction.drag': ['table'],
  'table.rowAction.expand': ['table'],
  'table.rowAction.switch': ['table'],
  'table.rowAction.header': ['table'],

  // Charts
  'lib-data-display-component-piechart': ['figma-component'],
  'lib-data-display-component-linechart': ['figma-component'],
  'lib-data-display-component-barchart': ['figma-component'],
  'lib-data-display-component-areachart': ['figma-component'],
  'lib-data-display-toplist': ['figma-component'],
};
