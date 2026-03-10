export interface BaseTypographyTokenProfile {
  token: string;
  textStyleRef?: string;
  keyCandidates?: string[];
  idCandidates?: string[];
  nameCandidates?: string[];
}

export interface SemanticTypographyTokenProfile {
  token: string;
  baseToken: string;
}

const TABLE_TEXT_STYLE_REFS = {
  body: 'S:ac8ef12de2cc499e51922d6b5239c26b3645a05a,131052:2',
  header: 'S:06c98e2c68a38e391190684c4b73e26efcd5d930,131052:3'
} as const;

function extractStyleKey(styleRef: string): string | undefined {
  let normalized = String(styleRef || '').trim();
  if (!normalized) return undefined;
  const commaIndex = normalized.indexOf(',');
  if (commaIndex >= 0) normalized = normalized.slice(0, commaIndex);
  if (normalized.startsWith('S:')) normalized = normalized.slice(2);
  return normalized || undefined;
}

function baseTypographyWithStyleRef(
  token: string,
  textStyleRef: string,
  extra?: Partial<BaseTypographyTokenProfile>
): BaseTypographyTokenProfile {
  const key = extractStyleKey(textStyleRef);
  return {
    token,
    textStyleRef,
    keyCandidates: key ? [key] : undefined,
    idCandidates: [textStyleRef],
    ...extra
  };
}

// Layer 1: Base typography tokens
// Only this layer should hold real TextStyle ref/key candidates.
export const BASE_TYPOGRAPHY_TOKEN_PACK: Record<string, BaseTypographyTokenProfile> = {
  'text-body': baseTypographyWithStyleRef('text-body', TABLE_TEXT_STYLE_REFS.body, {
    nameCandidates: ['Body', '正文', 'Text/Body']
  }),
  'text-body-medium': baseTypographyWithStyleRef('text-body-medium', TABLE_TEXT_STYLE_REFS.body, {
    nameCandidates: ['Body/Medium', '正文/中', 'Text/Body Medium']
  }),
  'text-header': baseTypographyWithStyleRef('text-header', TABLE_TEXT_STYLE_REFS.header, {
    nameCandidates: ['Header', '表头', 'Text/Header']
  }),
  'text-title': baseTypographyWithStyleRef('text-title', TABLE_TEXT_STYLE_REFS.header, {
    nameCandidates: ['Title', '标题', 'Text/Title']
  })
};

// Layer 2: Semantic typography tokens
// Semantic tokens map to base tokens and are used by component specs.
export const SEMANTIC_TYPOGRAPHY_TOKEN_PACK: Record<string, SemanticTypographyTokenProfile> = {
  'page.title': { token: 'page.title', baseToken: 'text-title' },
  'table.cell.text': { token: 'table.cell.text', baseToken: 'text-body' },
  'table.header.text': { token: 'table.header.text', baseToken: 'text-header' },
  'text.body': { token: 'text.body', baseToken: 'text-body' },
  'text.title': { token: 'text.title', baseToken: 'text-title' },
  'button.text': { token: 'button.text', baseToken: 'text-body-medium' },
  'input.text': { token: 'input.text', baseToken: 'text-body' },
  'select.text': { token: 'select.text', baseToken: 'text-body' },
  'tag.text': { token: 'tag.text', baseToken: 'text-body' },
  'card.title': { token: 'card.title', baseToken: 'text-title' },
  'chart.title': { token: 'chart.title', baseToken: 'text-title' }
};

export interface ResolvedTypographyTokenProfile {
  token: string;
  baseToken: string;
  profile: BaseTypographyTokenProfile;
}

export function resolveTypographyTokenProfile(token: string): ResolvedTypographyTokenProfile | undefined {
  const normalized = String(token || '').trim();
  if (!normalized) return undefined;

  const semantic = SEMANTIC_TYPOGRAPHY_TOKEN_PACK[normalized];
  const baseToken = semantic?.baseToken || normalized;
  const baseProfile = BASE_TYPOGRAPHY_TOKEN_PACK[baseToken];
  if (!baseProfile) return undefined;

  return {
    token: normalized,
    baseToken,
    profile: baseProfile
  };
}
