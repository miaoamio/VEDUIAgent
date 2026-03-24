import {
  BASE_LIBRARY_COMPONENT_TOKEN_PACK
} from './component-library-tokens';

export interface BaseComponentTokenProfile {
  token: string;
  componentKey: string;
  source: string;
  aliases?: string[];
  displayName?: string;
  category?: string;
}

function baseComponentToken(
  token: string,
  componentKey: string,
  source: string,
  aliases?: string[]
): BaseComponentTokenProfile {
  return {
    token,
    componentKey,
    source,
    aliases
  };
}

const BASE_TABLE_COMPONENT_TOKEN_PACK: Record<string, BaseComponentTokenProfile> = {
  'table-header-main': baseComponentToken(
    'table-header-main',
    '3361bff9b5e21071cb4fb3b86caa40a6709674ac',
    'legacy/table/packages/mcp-gateway/src/component-config.ts',
    ['HEADER_COMPONENT_KEY']
  ),
  'table-cell-main': baseComponentToken(
    'table-cell-main',
    '53fd7ebf6cd6ad47b84edc13d408902720712659',
    'legacy/table/packages/mcp-gateway/src/component-config.ts',
    ['CELL_COMPONENT_KEY']
  ),
  'table-top-tabs': baseComponentToken(
    'table-top-tabs',
    '4c762a63f502f3c4596e4cdb0647514cf00a2ec7',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['TABS_COMPONENT_KEY']
  ),
  'table-top-filter': baseComponentToken(
    'table-top-filter',
    'cadcfc99d9dc7ac32eac6eda4664ad68a712d19d',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['FILTER_COMPONENT_KEY']
  ),
  'table-top-filter-item': baseComponentToken(
    'table-top-filter-item',
    '7eaa61f7dda9a4e8271e2dbfcafcb5c2730ac2ab',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['FILTER_ITEM_COMPONENT_KEY']
  ),
  'table-top-button-group': baseComponentToken(
    'table-top-button-group',
    '180fb77e98e458d377212d51f6698085a4bf2f9f',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['BUTTON_GROUP_COMPONENT_KEY']
  ),
  'table-footer-pagination': baseComponentToken(
    'table-footer-pagination',
    '4a052d113919473bb3079dd723e05ccd343042c5',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['PAGINATION_COMPONENT_KEY']
  ),
  'table-row-action-text': baseComponentToken(
    'table-row-action-text',
    'de6d6250b7566cb97aaff74d5e3383e9a5316db9',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['ROW_ACTION_COMPONENT_KEY']
  ),
  'table-row-action-checkbox': baseComponentToken(
    'table-row-action-checkbox',
    '5d0f58a93a5ed9d198526fa58e73baf1174cf4f5',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['ACTION_CHECKBOX_KEY']
  ),
  'table-row-action-radio': baseComponentToken(
    'table-row-action-radio',
    '527424ae4a193ab57ae943d377b9bc7f23891824',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['ACTION_RADIO_KEY']
  ),
  'table-row-action-drag': baseComponentToken(
    'table-row-action-drag',
    '75003cfee167850ea18191b92cb73918245ac38e',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['ACTION_DRAG_KEY']
  ),
  'table-row-action-expand': baseComponentToken(
    'table-row-action-expand',
    '5205f643a92b766838e43cdb9fc98f596053c9f5',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['ACTION_EXPAND_KEY']
  ),
  'table-row-action-switch': baseComponentToken(
    'table-row-action-switch',
    '8632dbefd9f75a954a6e4f7584ad9f0d43a644a4',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['ACTION_SWITCH_KEY']
  ),
  'table-row-action-header': baseComponentToken(
    'table-row-action-header',
    'dcbc04f8242aaf11879a08cc6f8b9bffa5662614',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['ACTION_HEADER_KEY']
  ),
  'table-cell-tag': baseComponentToken(
    'table-cell-tag',
    '63afa78c2d544c859634166c877d00da5346ed18',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['TAG_COMPONENT_KEY']
  ),
  'table-cell-tag-counter': baseComponentToken(
    'table-cell-tag-counter',
    '76f72d9a460e6f65e823c601d64ac7512fc1f9b2',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['TAG_COUNTER_COMPONENT_KEY']
  ),
  'table-cell-avatar': baseComponentToken(
    'table-cell-avatar',
    '8365ec79313a17f0687ed671a0fde43bc64e8f14',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['AVATAR_COMPONENT_KEY']
  ),
  'table-cell-icon-more': baseComponentToken(
    'table-cell-icon-more',
    '27e130c675fe44532f717656d04b2597eb05a67d',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['MORE_ICON_COMPONENT_KEY']
  ),
  'table-cell-icon-edit': baseComponentToken(
    'table-cell-icon-edit',
    '53c9064cdbb04581b764c7bfe92ef2862ca6af8d',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['EDIT_ICON_COMPONENT_KEY']
  ),
  'table-cell-icon-delete': baseComponentToken(
    'table-cell-icon-delete',
    '3cf68ee183ff9840dffb8e4ba760dfea519e4a8d',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['DELETE_ICON_COMPONENT_KEY']
  ),
  'table-cell-icon-action-more': baseComponentToken(
    'table-cell-icon-action-more',
    '27e130c675fe44532f717656d04b2597eb05a67d',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['ACTION_MORE_ICON_COMPONENT_KEY']
  ),
  'table-cell-input': baseComponentToken(
    'table-cell-input',
    'e1c520fea681ece9994290c63d0b77ad19dbf7fa',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['INPUT_COMPONENT_KEY']
  ),
  'table-cell-select': baseComponentToken(
    'table-cell-select',
    '27245acbfd46e812fb383443f0aac88df751fa15',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['SELECT_COMPONENT_KEY']
  ),
  'table-cell-state': baseComponentToken(
    'table-cell-state',
    'e8ec559c3604ae1e23b354c120d63b481f333527',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['STATE_COMPONENT_KEY']
  ),
  'table-header-icon': baseComponentToken(
    'table-header-icon',
    'e53fcaef4cf94334b30b019356eaeedde137887b',
    'legacy/table/packages/figma-plugin/src/code.ts',
    ['HEADER_ICON_COMPONENT_KEY']
  )
};

export const BASE_COMPONENT_TOKEN_PACK: Record<string, BaseComponentTokenProfile> = {
  ...BASE_TABLE_COMPONENT_TOKEN_PACK,
  ...BASE_LIBRARY_COMPONENT_TOKEN_PACK
};

export interface ResolvedComponentTokenProfile {
  token: string;
  baseToken: string;
  profile: BaseComponentTokenProfile;
}

export function resolveComponentTokenProfile(token: string): ResolvedComponentTokenProfile | undefined {
  const normalized = String(token || '').trim();
  if (!normalized) return undefined;
  const baseProfile = BASE_COMPONENT_TOKEN_PACK[normalized];
  if (baseProfile) {
    return {
      token: normalized,
      baseToken: normalized,
      profile: baseProfile
    };
  }

  for (const [candidateBaseToken, profile] of Object.entries(BASE_COMPONENT_TOKEN_PACK)) {
    if (profile.aliases?.some((alias) => alias === normalized) || profile.componentKey === normalized) {
      return {
        token: normalized,
        baseToken: candidateBaseToken,
        profile
      };
    }
  }

  return undefined;
}
