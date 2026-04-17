import { resolveComponentTokenProfile } from '../../theme/volcengine-design/component-tokens';
import {
  normalizeStatusTagThemeInput,
  resolveStatusTagThemeFromSemantic
} from '../../statusTagSemantic';

export function mergeUnique(base: string[] | undefined, incoming: string[] | undefined): string[] | undefined {
    const merged = new Set<string>();
    (base || []).forEach((value) => {
        const normalized = String(value || '').trim();
        if (normalized) merged.add(normalized);
    });
    (incoming || []).forEach((value) => {
        const normalized = String(value || '').trim();
        if (normalized) merged.add(normalized);
    });
    return merged.size > 0 ? Array.from(merged) : undefined;
}

export function toLowerTrim(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeFormLayout(value: unknown): 'horizontal' | 'vertical' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'vertical') return normalized;
    return 'horizontal';
}

export function normalizeInputState(value: unknown): 'default' | 'hover' | 'active' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('hover') || normalized.includes('悬浮') || normalized.includes('悬停')) return 'hover';
    if (normalized.includes('active') || normalized.includes('激活')) return 'active';
    return 'default';
}

export function hasInputAffix(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export function toVariantBoolean(value: boolean): 'True' | 'False' {
    return value ? 'True' : 'False';
}

export function resolveButtonTypeVariantLabel(value: unknown): 'Primary 主要' | 'Secondary 次要' | 'Outline 线框' | 'Text 文字' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('secondary') || normalized.includes('次要')) return 'Secondary 次要';
    if (normalized.includes('outline') || normalized.includes('线框')) return 'Outline 线框';
    if (normalized.includes('text') || normalized.includes('文字')) return 'Text 文字';
    return 'Primary 主要';
}

export function resolveButtonThemeVariantLabel(value: unknown): 'Default 默认' | 'Danger 危险' | 'Success 成功' | 'Warning 警示' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('danger') || normalized.includes('危险')) return 'Danger 危险';
    if (normalized.includes('success') || normalized.includes('成功')) return 'Success 成功';
    if (normalized.includes('warning') || normalized.includes('警示')) return 'Warning 警示';
    return 'Default 默认';
}

export function resolveButtonStateVariantLabel(
    value: unknown,
    disabled: boolean
): 'Default 默认' | 'Hover 悬停' | 'Active 激活' | 'Disabled 禁用' {
    if (disabled) return 'Disabled 禁用';
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('hover') || normalized.includes('悬停') || normalized.includes('悬浮')) {
        return 'Hover 悬停';
    }
    if (normalized.includes('active') || normalized.includes('激活')) return 'Active 激活';
    if (normalized.includes('disabled') || normalized.includes('禁用')) return 'Disabled 禁用';
    return 'Default 默认';
}

export function resolveButtonLanguageVariantLabel(value: unknown): 'CN' | 'EN' {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized.includes('en') ? 'EN' : 'CN';
}

export function normalizeTagSize(value: unknown): 'mini' | 'small' | 'default' | 'large' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('16') || normalized.includes('mini')) return 'mini';
    if (normalized.includes('18') || normalized.includes('small')) return 'small';
    if (normalized.includes('24') || normalized.includes('large')) return 'large';
    return 'default';
}

export function normalizeTagType(value: unknown): 'default' | 'solid' | 'outline' | 'text' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('solid') || normalized.includes('面型')) return 'solid';
    if (normalized.includes('outline') || normalized.includes('线型')) return 'outline';
    if (normalized.includes('text') || normalized.includes('文字')) return 'text';
    return 'default';
}

export type TagComponentFamily = 'default' | 'other' | 'status';
export type OtherTagType = 'marketing' | 'group';

export const TAG_COMPONENT_TOKEN = 'lib-data-display-tag';
export const OTHER_TAG_COMPONENT_TOKEN = 'lib-data-display-other-tag';
export const STATUS_TAG_COMPONENT_TOKEN = 'lib-data-display-status-tag';

export function resolveTagComponentFamily(componentToken: unknown): TagComponentFamily {
    const normalized = String(componentToken || '').trim();
    const baseToken = normalized
        ? resolveComponentTokenProfile(normalized)?.baseToken || normalized
        : '';
    if (baseToken === STATUS_TAG_COMPONENT_TOKEN || baseToken === 'lib-data-display-status-tag') {
        return 'status';
    }
    if (baseToken === OTHER_TAG_COMPONENT_TOKEN || baseToken === 'lib-data-display-other-tag') {
        return 'other';
    }
    return 'default';
}

export function isDefaultTagTypeValue(value: unknown): boolean {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return false;
    return (
        normalized.includes('default') ||
        normalized.includes('默认') ||
        normalized.includes('solid') ||
        normalized.includes('面型') ||
        normalized.includes('outline') ||
        normalized.includes('线型') ||
        normalized.includes('text') ||
        normalized.includes('文字')
    );
}

export function isOtherTagTypeValue(value: unknown): boolean {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return false;
    return (
        normalized.includes('marketing') ||
        normalized.includes('营销') ||
        normalized.includes('taggroup') ||
        normalized.includes('标签组') ||
        normalized === 'group' ||
        normalized.includes('group')
    );
}

export function isStatusTagTypeValue(value: unknown): boolean {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return false;
    return normalized.includes('status') || normalized.includes('状态标签') || normalized.includes('状态');
}

export function normalizeUnifiedTagParams(params: Record<string, any>): Record<string, any> {
    const next = { ...params };
    const rawTagType = next.tagType ?? next.type;
    const rawOtherTagType = next.otherTagType;
    const componentToken = typeof next.componentToken === 'string' ? next.componentToken.trim() : '';
    const resolvedToken = componentToken ? resolveComponentTokenProfile(componentToken) : undefined;
    const baseToken = resolvedToken?.baseToken;
    const isTokenStatus = baseToken === STATUS_TAG_COMPONENT_TOKEN;
    const isTokenOther = baseToken === OTHER_TAG_COMPONENT_TOKEN;
    const isTokenDefault = baseToken === TAG_COMPONENT_TOKEN;
    const isKnownToken = isTokenStatus || isTokenOther || isTokenDefault;

    const hasExplicitDefaultTagType = rawTagType !== undefined && isDefaultTagTypeValue(rawTagType);
    const hasExplicitOtherTagType = rawTagType !== undefined && isOtherTagTypeValue(rawTagType);
    const hasExplicitStatusTagType = rawTagType !== undefined && isStatusTagTypeValue(rawTagType);
    let unifiedType: unknown = rawTagType;
    if (!unifiedType && rawOtherTagType) {
        unifiedType = rawOtherTagType;
    }
    if (
        rawOtherTagType &&
        (!unifiedType || (!isDefaultTagTypeValue(unifiedType) && !isOtherTagTypeValue(unifiedType)))
    ) {
        unifiedType = rawOtherTagType;
    }
    if (isTokenOther && rawOtherTagType && !hasExplicitDefaultTagType && !hasExplicitStatusTagType) {
        unifiedType = rawOtherTagType;
    }
    if (!unifiedType && isTokenStatus && !hasExplicitDefaultTagType && !hasExplicitOtherTagType) {
        unifiedType = 'StatusTag 状态标签';
    }

    if (unifiedType !== undefined) {
        next.tagType = unifiedType;
    }

    const shouldUseStatus =
        isStatusTagTypeValue(unifiedType) ||
        (isTokenStatus && !hasExplicitDefaultTagType && !hasExplicitOtherTagType && !isOtherTagTypeValue(unifiedType));
    const shouldUseOther =
        !shouldUseStatus &&
        (isOtherTagTypeValue(unifiedType) ||
            (isTokenOther && !isDefaultTagTypeValue(unifiedType) && !isStatusTagTypeValue(unifiedType)));

    if (shouldUseStatus) {
        next.tagType = 'StatusTag 状态标签';
        delete next.otherTagType;
    } else if (shouldUseOther && unifiedType) {
        const normalizedOtherLabel = resolveOtherTagTypeVariantLabel(unifiedType);
        next.tagType = normalizedOtherLabel;
        next.otherTagType = normalizedOtherLabel;
    } else if (unifiedType) {
        next.tagType = resolveTagTypeVariantLabel(unifiedType);
        delete next.otherTagType;
    } else if (!shouldUseOther) {
        delete next.otherTagType;
    }

    if (!componentToken || isKnownToken) {
        next.componentToken = shouldUseStatus
            ? STATUS_TAG_COMPONENT_TOKEN
            : shouldUseOther
                ? OTHER_TAG_COMPONENT_TOKEN
                : TAG_COMPONENT_TOKEN;
    }

    return next;
}

export function buildTableCellTagParams(params: Record<string, any>): Record<string, any> {
    const label = String(params.tagText || params.text || 'Tag');
    const kind = String(params.tagKind ?? params.kind ?? '').trim().toLowerCase();
    const isTypeTag = kind.includes('type');

    const explicitToken =
        typeof params.componentToken === 'string' && String(params.componentToken).trim().length > 0;
    const requestedToken = explicitToken
        ? String(params.componentToken).trim()
        : isTypeTag
            ? TAG_COMPONENT_TOKEN
            : STATUS_TAG_COMPONENT_TOKEN;

    const legacyTagColor = String(params.tagColor ?? '').trim().toLowerCase();
    const legacyStatusTheme =
        legacyTagColor === 'green'
            ? 'Success 成功'
            : legacyTagColor === 'orange' || legacyTagColor === 'yellow'
                ? 'Warning 告警'
                : legacyTagColor === 'red'
                    ? 'Error 错误'
                    : legacyTagColor === 'gray' || legacyTagColor === 'grey'
                        ? 'Stop 停止'
                        : legacyTagColor === 'blue'
                            ? 'Processing 等待中'
                            : undefined;

    const semanticKeyRaw = params.statusSemantic ?? params.statusIntent ?? params.semantic ?? params.intent;
    const semanticThemeOverride =
        resolveStatusTagThemeFromSemantic(semanticKeyRaw) ||
        undefined;
    const normalizedStatusThemeInput = normalizeStatusTagThemeInput(params.statusTheme ?? params.theme ?? legacyStatusTheme);
    const textBasedTheme = resolveStatusTagThemeFromSemantic(label) || undefined;

    const tagParams: Record<string, any> = {
        text: label,
        componentToken: requestedToken,
        ...(isTypeTag ? { tagType: params.tagType } : {}),
        size: params.size,
        state: params.state,
        disabled: params.disabled,
        showIcon: params.showIcon,
        showDot: params.showDot,
        showDropdown: params.showDropdown,
        closable: params.closable,
        statusTheme: semanticThemeOverride || normalizedStatusThemeInput || textBasedTheme,
        statusType: params.statusType ?? params.statusLevel ?? params.level,
        statusState: params.statusState
    };

    if (isTypeTag && !tagParams.tagType) {
        tagParams.tagType = 'Outline 线型标签';
    }

    const normalizedTagParams = normalizeUnifiedTagParams(tagParams);
    const family = resolveTagComponentFamily(normalizedTagParams.componentToken);
    if (family === 'status' && !normalizedTagParams.statusType) {
        normalizedTagParams.statusType = 'L2 二级标签';
    }
    if (family === 'status' && !normalizedTagParams.statusTheme) {
        normalizedTagParams.statusTheme = 'Success 成功';
    }
    if (family === 'status' && normalizedTagParams.showIcon === undefined) {
        normalizedTagParams.showIcon = false;
    }
    if (family === 'status' && normalizedTagParams.showDropdown === undefined) {
        normalizedTagParams.showDropdown = false;
    }

    return normalizedTagParams;
}

export function normalizeOtherTagType(value: unknown): OtherTagType {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('taggroup') || normalized.includes('标签组') || normalized.includes('group')) {
        return 'group';
    }
    return 'marketing';
}

export function resolveOtherTagTypeVariantLabel(value: unknown): 'TagGroup 标签组' | 'MarketingTag 营销标签' {
    return normalizeOtherTagType(value) === 'group' ? 'TagGroup 标签组' : 'MarketingTag 营销标签';
}

export function resolveStatusTagTypeVariantLabel(value: unknown): 'L1 一级标签' | 'L2 二级标签' | 'L3 三级标签' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('l3') || normalized.includes('三级') || normalized.endsWith('3')) return 'L3 三级标签';
    if (normalized.includes('l2') || normalized.includes('二级') || normalized.endsWith('2')) return 'L2 二级标签';
    return 'L2 二级标签';
}

export function resolveStatusTagThemeVariantLabel(
    value: unknown
):
    | 'Success 成功'
    | 'Warning 告警'
    | 'Error 错误'
    | 'Stop 停止'
    | 'Processing 等待中'
    | 'Loading 加载中'
    | 'Waiting 待启用' {
    return resolveStatusTagThemeFromSemantic(value) || 'Waiting 待启用';
}

export function resolveStatusTagStateVariantLabel(value: unknown): 'Default 默认' | 'Hover 悬浮' | 'Active 点击' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('hover') || normalized.includes('悬浮') || normalized.includes('悬停')) return 'Hover 悬浮';
    if (normalized.includes('active') || normalized.includes('点击') || normalized.includes('激活')) return 'Active 点击';
    return 'Default 默认';
}

export function resolveOtherTagColorVariantLabel(value: unknown): 'Default 默认' | 'Red 红' | 'Yellow 黄' | 'Grey 灰' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('red') || normalized.includes('红')) return 'Red 红';
    if (normalized.includes('yellow') || normalized.includes('黄')) return 'Yellow 黄';
    if (normalized.includes('grey') || normalized.includes('gray') || normalized.includes('灰')) return 'Grey 灰';
    return 'Default 默认';
}

export function resolveTagSizeVariantLabel(value: unknown): 'Mini 16' | 'Small 18' | 'Default 20' | 'Large 24' {
    switch (normalizeTagSize(value)) {
        case 'mini':
            return 'Mini 16';
        case 'small':
            return 'Small 18';
        case 'large':
            return 'Large 24';
        default:
            return 'Default 20';
    }
}

export function resolveTagStateVariantLabel(value: unknown): 'Default 默认' | 'Hover 悬停' | 'Active 激活' {
    switch (normalizeInputState(value)) {
        case 'hover':
            return 'Hover 悬停';
        case 'active':
            return 'Active 激活';
        default:
            return 'Default 默认';
    }
}

export function resolveTagTypeVariantLabel(value: unknown): 'Default 默认标签' | 'Solid 面型标签' | 'Outline 线型标签' | 'Text 文字标签' {
    switch (normalizeTagType(value)) {
        case 'solid':
            return 'Solid 面型标签';
        case 'outline':
            return 'Outline 线型标签';
        case 'text':
            return 'Text 文字标签';
        default:
            return 'Default 默认标签';
    }
}

export function resolveTagDisabledVariantLabel(value: unknown): 'On' | 'Off' {
    return hasInputAffix(value) ? 'On' : 'Off';
}

export function resolveTagMetrics(value: unknown): {
    height: number;
    paddingX: number;
    fontSize: number;
    iconSize: number;
    dotSize: number;
    glyphSize: number;
    cornerRadius: number;
} {
    switch (normalizeTagSize(value)) {
        case 'mini':
            return { height: 16, paddingX: 6, fontSize: 10, iconSize: 10, dotSize: 4, glyphSize: 9, cornerRadius: 4 };
        case 'small':
            return { height: 18, paddingX: 6, fontSize: 10, iconSize: 10, dotSize: 4, glyphSize: 10, cornerRadius: 4 };
        case 'large':
            return { height: 24, paddingX: 6, fontSize: 12, iconSize: 12, dotSize: 6, glyphSize: 12, cornerRadius: 4 };
        default:
            return { height: 20, paddingX: 6, fontSize: 12, iconSize: 12, dotSize: 6, glyphSize: 10, cornerRadius: 4 };
    }
}

export function findVariantPropertyName(
    variantProps: Record<string, string> | undefined,
    criteriaKey: string
): string | undefined {
    if (!variantProps) return undefined;
    const normalizedKey = String(criteriaKey || '').trim().toLowerCase();
    return Object.keys(variantProps).find((key) => {
        const normalizedProp = String(key || '').trim().toLowerCase();
        return normalizedProp === normalizedKey || normalizedProp.includes(normalizedKey);
    });
}

export function matchesVariantProps(
    variantProps: Record<string, string> | undefined,
    criteria: Record<string, string>
): boolean {
    if (!variantProps) return false;
    return Object.entries(criteria).every(([key, value]) => {
        const propName = findVariantPropertyName(variantProps, key);
        if (!propName) return false;
        return String(variantProps[propName] || '').trim().toLowerCase() === String(value || '').trim().toLowerCase();
    });
}

export function dedupeVariantCriteriaCandidates(candidates: Array<Record<string, string>>): Array<Record<string, string>> {
    return candidates.filter((candidate, index) => {
        const serialized = JSON.stringify(candidate);
        return candidates.findIndex((item) => JSON.stringify(item) === serialized) === index;
    });
}

export function buildTagVariantCriteriaCandidates(
    params: Record<string, any>,
    family: TagComponentFamily
): Array<Record<string, string>> {
    if (family === 'status') {
        const exact: Record<string, string> = {
            'Type 类型': resolveStatusTagTypeVariantLabel(params.statusType ?? params.statusLevel ?? params.type),
            'Theme 主题': resolveStatusTagThemeVariantLabel(params.statusTheme ?? params.theme),
            'Size 尺寸': resolveTagSizeVariantLabel(params.size),
            'Icon 图标': toVariantBoolean(hasInputAffix(params.showIcon ?? params.icon)),
            'Dropdown 下拉选择': toVariantBoolean(hasInputAffix(params.showDropdown ?? params.dropdown)),
            'State 状态': resolveStatusTagStateVariantLabel(params.statusState ?? params.state),
            'Disabled 禁用': toVariantBoolean(hasInputAffix(params.disabled))
        };

        return dedupeVariantCriteriaCandidates([
            exact,
            {
                ...exact,
                'State 状态': 'Default 默认'
            },
            {
                'Type 类型': exact['Type 类型'],
                'Theme 主题': exact['Theme 主题'],
                'Size 尺寸': exact['Size 尺寸'],
                'Icon 图标': exact['Icon 图标'],
                'Dropdown 下拉选择': exact['Dropdown 下拉选择'],
                'Disabled 禁用': exact['Disabled 禁用'],
            },
            {
                'Type 类型': exact['Type 类型'],
                'Theme 主题': exact['Theme 主题'],
                'Size 尺寸': exact['Size 尺寸'],
                'Icon 图标': exact['Icon 图标'],
                'Dropdown 下拉选择': exact['Dropdown 下拉选择'],
                'Disabled 禁用': exact['Disabled 禁用']
            },
            {
                'Type 类型': exact['Type 类型'],
                'Theme 主题': exact['Theme 主题'],
                'Size 尺寸': exact['Size 尺寸'],
                'Icon 图标': exact['Icon 图标'],
                'Dropdown 下拉选择': exact['Dropdown 下拉选择']
            }
        ]);
    }
    if (family === 'other') {
        const exact: Record<string, string> = {
            'Type 类型': resolveOtherTagTypeVariantLabel(params.otherTagType ?? params.tagType ?? params.type),
            'Size 尺寸': resolveTagSizeVariantLabel(params.size),
            'Color 颜色': resolveOtherTagColorVariantLabel(params.colorScheme ?? params.color ?? params.tagColor)
        };

        return dedupeVariantCriteriaCandidates([
            exact,
            {
                'Type 类型': exact['Type 类型'],
                'Size 尺寸': exact['Size 尺寸']
            },
            {
                'Type 类型': exact['Type 类型'],
                'Color 颜色': exact['Color 颜色']
            },
            {
                'Type 类型': exact['Type 类型']
            },
            {
                'Size 尺寸': exact['Size 尺寸']
            }
        ]);
    }

    const exact: Record<string, string> = {
        'Type 类型': resolveTagTypeVariantLabel(params.tagType ?? params.type),
        'Size 尺寸': resolveTagSizeVariantLabel(params.size),
        'State 状态': resolveTagStateVariantLabel(params.state),
        'Icon 图标': toVariantBoolean(hasInputAffix(params.showIcon ?? params.icon)),
        'Dot 点': toVariantBoolean(hasInputAffix(params.showDot ?? params.dot)),
        'Dropdown 下拉': toVariantBoolean(hasInputAffix(params.showDropdown ?? params.dropdown)),
        'Close 关闭': toVariantBoolean(hasInputAffix(params.closable ?? params.close)),
        'Disabled 禁用': resolveTagDisabledVariantLabel(params.disabled)
    };

    const requestedToggles = Object.fromEntries(
        Object.entries(exact).filter(([key, value]) => {
            if (key === 'Type 类型' || key === 'Size 尺寸' || key === 'State 状态' || key === 'Disabled 禁用') {
                return false;
            }
            return value === 'True';
        })
    );

    return dedupeVariantCriteriaCandidates([
        exact,
        {
            ...exact,
            'State 状态': 'Default 默认'
        },
        {
            'Type 类型': exact['Type 类型'],
            'Size 尺寸': exact['Size 尺寸'],
            'State 状态': exact['State 状态'],
            'Disabled 禁用': exact['Disabled 禁用'],
            ...requestedToggles
        },
        {
            'Type 类型': exact['Type 类型'],
            'Size 尺寸': exact['Size 尺寸'],
            'Disabled 禁用': exact['Disabled 禁用'],
            ...requestedToggles
        },
        {
            'Type 类型': exact['Type 类型'],
            'Size 尺寸': exact['Size 尺寸'],
            'Disabled 禁用': exact['Disabled 禁用']
        }
    ]);
}
