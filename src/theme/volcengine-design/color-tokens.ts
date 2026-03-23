export interface BaseColorTokenProfile {
  token: string;
  variableRef?: string;
  keyCandidates?: string[];
  idCandidates?: string[];
  nameCandidates?: string[];
}

export interface SemanticColorTokenProfile {
  token: string;
  baseToken: string;
}

const TABLE_VARIABLE_IDS = {
  'text-1': 'VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560',
  'text-2': 'VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562',
  'text-3': 'VariableID:98bdfd58bdd60974e1fe50bb12cd2c24661e8ded/174345:276',
  'bg-white': 'VariableID:3b36108b1612c5eeaf85b5f30ae6cb5bcf12e042/174382:780',
  'color-white': 'VariableID:6dfd5b2f49dd7c8c889305f4514144af3b9f4b1f/174345:272',
  'color-bg-4': 'VariableID:0ad927853701159721b6bb95d53b532de24282a7/174345:586',
  'primary-6': 'VariableID:75f358d76d414f045a47f128470fcbbde49888dc/174345:300',
  'danger-6': 'VariableID:f60b03f9d134cb4ac3f68fb23b1fda9ba1304745/174345:672'
} as const;

function extractVariableKey(variableRef: string): string | undefined {
  const normalized = String(variableRef || '').trim();
  if (!normalized.startsWith('VariableID:')) return undefined;
  const body = normalized.slice('VariableID:'.length);
  const slash = body.indexOf('/');
  if (slash <= 0) return undefined;
  return body.slice(0, slash);
}

function baseTokenWithVariableId(
  token: string,
  variableRef: string,
  extra?: Partial<BaseColorTokenProfile>
): BaseColorTokenProfile {
  const key = extractVariableKey(variableRef);
  return {
    token,
    variableRef,
    keyCandidates: key ? [key] : undefined,
    idCandidates: [variableRef],
    ...extra
  };
}

export const BASE_COLOR_TOKEN_PACK: Record<string, BaseColorTokenProfile> = {
  'color-bg-1': {
    token: 'color-bg-1'
  },
  'color-bg-2': {
    token: 'color-bg-2'
  },
  'color-bg-3': {
    token: 'color-bg-3'
  },
  'color-bg-4': baseTokenWithVariableId('color-bg-4', TABLE_VARIABLE_IDS['color-bg-4'], {
    nameCandidates: ['background/深 灰底 @color-bg-4', '@color-bg-4']
  }),
  'color-border-1': {
    token: 'color-border-1'
  },
  'color-border-2': {
    token: 'color-border-2'
  },
  'border-2': {
    token: 'border-2',
    nameCandidates: ['border-2', 'color-border-2', '@border-2', '@color-border-2']
  },
  'bg-base': baseTokenWithVariableId('bg-base', TABLE_VARIABLE_IDS['bg-white'], {
    nameCandidates: ['color-bg-1', 'fill/输入类组件填充 @color-bg-white', '@color-bg-white']
  }),
  'bg-secondary': {
    token: 'bg-secondary',
    nameCandidates: ['color-bg-2']
  },
  'border-base': {
    token: 'border-base',
    nameCandidates: ['color-border-1']
  },
  'text-1': baseTokenWithVariableId('text-1', TABLE_VARIABLE_IDS['text-1']),
  'text-2': baseTokenWithVariableId('text-2', TABLE_VARIABLE_IDS['text-2']),
  'text-3': baseTokenWithVariableId('text-3', TABLE_VARIABLE_IDS['text-3'], {
    nameCandidates: ['text/次要信息 @color-text-3', '@color-text-3']
  }),
  'text-4': {
    token: 'text-4',
    nameCandidates: ['text/置灰信息 @color-text-4', '@color-text-4']
  },
  'primary-6': baseTokenWithVariableId('primary-6', TABLE_VARIABLE_IDS['primary-6'], {
    nameCandidates: ['link-6']
  }),
  'link-6': baseTokenWithVariableId('link-6', TABLE_VARIABLE_IDS['primary-6'], {
    nameCandidates: ['primary-6']
  }),
  'danger-6': baseTokenWithVariableId('danger-6', TABLE_VARIABLE_IDS['danger-6']),
  'danger-2': {
    token: 'danger-2',
    nameCandidates: ['red/tag背景色 @danger-2', '@danger-2']
  },
  'success-bg': {
    token: 'success-bg',
    nameCandidates: ['green-1', 'success-1']
  },
  'success-text': {
    token: 'success-text',
    nameCandidates: ['green-6', 'success-6']
  },
  'text-on-brand': baseTokenWithVariableId('text-on-brand', TABLE_VARIABLE_IDS['color-white'], {
    nameCandidates: ['text-inverse', 'text-on-primary', 'text/纯白文字 @color-white', '@color-white']
  })
};

export const SEMANTIC_COLOR_TOKEN_PACK: Record<string, SemanticColorTokenProfile> = {
  'layout.bg': { token: 'layout.bg', baseToken: 'bg-base' },
  'layout.border': { token: 'layout.border', baseToken: 'border-base' },
  'table.cell.bg': { token: 'table.cell.bg', baseToken: 'bg-base' },
  'table.border': { token: 'table.border', baseToken: 'border-2' },
  'table.cell.text': { token: 'table.cell.text', baseToken: 'text-1' },
  'table.header.bg': { token: 'table.header.bg', baseToken: 'color-bg-4' },
  'table.header.text': { token: 'table.header.text', baseToken: 'text-2' },
  'table.placeholder.text': { token: 'table.placeholder.text', baseToken: 'text-2' },
  'text.primary': { token: 'text.primary', baseToken: 'text-1' },
  'text.secondary': { token: 'text.secondary', baseToken: 'text-2' },
  'button.primary.bg': { token: 'button.primary.bg', baseToken: 'link-6' },
  'button.secondary.bg': { token: 'button.secondary.bg', baseToken: 'bg-secondary' },
  'button.primary.text': { token: 'button.primary.text', baseToken: 'text-on-brand' },
  'button.danger.text': { token: 'button.danger.text', baseToken: 'danger-6' },
  'button.secondary.text': { token: 'button.secondary.text', baseToken: 'text-1' },
  'button.outline.text': { token: 'button.outline.text', baseToken: 'link-6' },
  'input.bg': { token: 'input.bg', baseToken: 'bg-base' },
  'input.text': { token: 'input.text', baseToken: 'text-1' },
  'input.placeholder': { token: 'input.placeholder', baseToken: 'text-3' },
  'input.border': { token: 'input.border', baseToken: 'border-base' },
  'input.disabled.bg': { token: 'input.disabled.bg', baseToken: 'color-bg-4' },
  'input.disabled.text': { token: 'input.disabled.text', baseToken: 'text-4' },
  'input.error.bg': { token: 'input.error.bg', baseToken: 'danger-2' },
  'select.bg': { token: 'select.bg', baseToken: 'bg-base' },
  'select.text': { token: 'select.text', baseToken: 'text-1' },
  'select.placeholder': { token: 'select.placeholder', baseToken: 'text-3' },
  'select.icon': { token: 'select.icon', baseToken: 'text-3' },
  'select.border': { token: 'select.border', baseToken: 'border-base' },
  'form.label': { token: 'form.label', baseToken: 'text-2' },
  'form.help': { token: 'form.help', baseToken: 'text-3' },
  'form.required': { token: 'form.required', baseToken: 'danger-6' },
  'checkbox.bg': { token: 'checkbox.bg', baseToken: 'bg-base' },
  'checkbox.border': { token: 'checkbox.border', baseToken: 'border-base' },
  'checkbox.checked.bg': { token: 'checkbox.checked.bg', baseToken: 'primary-6' },
  'checkbox.indicator': { token: 'checkbox.indicator', baseToken: 'text-on-brand' },
  'checkbox.text': { token: 'checkbox.text', baseToken: 'text-1' },
  'radio.bg': { token: 'radio.bg', baseToken: 'bg-base' },
  'radio.border': { token: 'radio.border', baseToken: 'border-base' },
  'radio.selected.border': { token: 'radio.selected.border', baseToken: 'primary-6' },
  'radio.dot': { token: 'radio.dot', baseToken: 'primary-6' },
  'radio.text': { token: 'radio.text', baseToken: 'text-1' },
  'card.bg': { token: 'card.bg', baseToken: 'bg-base' },
  'card.title': { token: 'card.title', baseToken: 'text-1' },
  'chart.bg': { token: 'chart.bg', baseToken: 'bg-base' },
  'chart.title': { token: 'chart.title', baseToken: 'text-1' },
  'chart.bar.primary': { token: 'chart.bar.primary', baseToken: 'link-6' },
  'tag.bg.success': { token: 'tag.bg.success', baseToken: 'success-bg' },
  'tag.text.success': { token: 'tag.text.success', baseToken: 'success-text' }
};

export interface ResolvedColorTokenProfile {
  token: string;
  baseToken: string;
  profile: BaseColorTokenProfile;
}

export function resolveColorTokenProfile(token: string): ResolvedColorTokenProfile | undefined {
  const normalized = String(token || '').trim();
  if (!normalized) return undefined;

  const semantic = SEMANTIC_COLOR_TOKEN_PACK[normalized];
  const baseToken = semantic?.baseToken || normalized;
  const baseProfile = BASE_COLOR_TOKEN_PACK[baseToken];
  if (!baseProfile) return undefined;

  return {
    token: normalized,
    baseToken,
    profile: baseProfile
  };
}
