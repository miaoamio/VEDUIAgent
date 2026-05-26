/**
 * table.skill.ts — Layer 2: Skill
 *
 * 封装 draw_tabl / draw_table 的完整业务逻辑。
 * 被 App.tsx 的 draw_tabl case handler（Tool）调用，不直接暴露给 AI。
 *
 * 依赖：
 *   - block.helpers.ts（共用 Utils：isObject）
 */

import { isObject } from './block.helpers';
import { normalizeStatusTagThemeInput, resolveStatusTagThemeFromSemantic } from '../../statusTagSemantic';
import {
  buildNormalizedTableGrid,
  inferImplicitBodyMerges,
  inferLeafHeadersFromHeaderRows,
  normalizeAutoMergeRulesInput,
  normalizeHeaderRowsInput,
  normalizeMergesInput,
} from '../../code/table/table-merge-model';
import { normalizeNumberUnitLabel } from '../../code/table/table-number-unit';
import { validateNormalizedTableGrid } from '../../code/table/table-merge-validate';
import { buildTableRenderPlan } from '../../code/table/table-render-grid';

// ─── Utils：table 专属工具函数 ────────────────────────────────────────────────

export type TagColumnKind = 'status' | 'type';

export const extractCellText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (isObject(value)) {
    const candidates = ['text', 'tagText', 'statusText', 'label', 'name', 'value', 'title', 'status', 'content'];
    for (const key of candidates) {
      const v = (value as any)[key];
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        return String(v);
      }
    }
    return '';
  }
  return String(value);
};

const normalizeHeaderToken = (header: unknown): string =>
  String(header || '').trim().toLowerCase().replace(/[\s_]+/g, '');

const headerIncludes = (header: unknown, tokens: string[]): boolean => {
  const normalized = normalizeHeaderToken(header);
  return tokens.some((token) => normalized.includes(token));
};

const columnHasActionText = (values: unknown[]): boolean => {
  return values.some((value) => {
    const text = extractCellText(value);
    if (!text) return false;
    const normalized = String(text).trim().toLowerCase();
    return (
      normalized.includes('编辑') || normalized.includes('删除') || normalized.includes('查看') ||
      normalized.includes('详情') || normalized.includes('更多') || normalized.includes('配置') ||
      normalized.includes('设置') || normalized.includes('启用') || normalized.includes('禁用') ||
      normalized.includes('重置') || normalized.includes('下载') || normalized.includes('导出') ||
      normalized.includes('复制') || normalized.includes('更新') || normalized.includes('保存') ||
      normalized.includes('发布') || normalized.includes('撤回') || normalized.includes('审核') ||
      normalized.includes('通过') || normalized.includes('驳回') || normalized.includes('拒绝') ||
      normalized.includes('分配') || normalized.includes('授权') || normalized.includes('解绑') ||
      normalized.includes('绑定') || normalized.includes('打开') || normalized.includes('关闭') ||
      normalized.includes('暂停') || normalized.includes('恢复') || normalized.includes('edit') ||
      normalized.includes('delete') || normalized.includes('view') || normalized.includes('detail') ||
      normalized.includes('more') || normalized.includes('config') || normalized.includes('setting') ||
      normalized.includes('enable') || normalized.includes('disable') || normalized.includes('reset') ||
      normalized.includes('download') || normalized.includes('export') || normalized.includes('copy') ||
      normalized.includes('update') || normalized.includes('save') || normalized.includes('publish') ||
      normalized.includes('revoke') || normalized.includes('approve') || normalized.includes('reject') ||
      normalized.includes('assign') || normalized.includes('authorize') || normalized.includes('unbind') ||
      normalized.includes('bind') || normalized.includes('open') || normalized.includes('close') ||
      normalized.includes('pause') || normalized.includes('resume') || normalized.includes('action') ||
      normalized.includes('operate')
    );
  });
};

const columnHasTagObject = (values: unknown[]): boolean => {
  return values.some((value) => {
    if (!isObject(value)) return false;
    return Object.keys(value as any).some((key) => /tag|status|badge|state|level/i.test(key));
  });
};

const columnHasStatusText = (values: unknown[]): boolean => {
  return values.some((value) => {
    const text = extractCellText(value);
    if (!text) return false;
    const normalized = String(text).trim().toLowerCase();
    return (
      normalized.includes('成功') || normalized.includes('失败') || normalized.includes('告警') ||
      normalized.includes('启用') || normalized.includes('禁用') || normalized.includes('停止') ||
      normalized.includes('处理中') || normalized.includes('等待') || normalized.includes('success') ||
      normalized.includes('error') || normalized.includes('warning') || normalized.includes('pending') ||
      normalized.includes('processing') || normalized.includes('disabled') || normalized.includes('enabled')
    );
  });
};

const NUMERIC_HEADER_HINTS = [
  '数量', '数值', '金额', '价格', '单价', '总价', '费用', '成本', '收入', '支出', '利润', '毛利', '净利',
  '额度', '余额', '占比', '比例', '百分比', '比率', '同比', '环比', '排名', '得分', '评分', '分数',
  '年龄', '时长', '耗时', '次数', '浏览量', '访问量', '点击量', '下载量', '订单量', '销量',
  'count', 'amount', 'price', 'total', 'sum', 'avg', 'average', 'rate', 'ratio', 'percent',
  'percentage', 'qty', 'quantity', 'score', 'rank', 'ranking', 'age', 'duration', 'cost',
  'revenue', 'profit', 'balance'
];

const NUMBER_UNIT_HEADER_HINTS = [
  '率', '占比', '比例', '百分比', '比率', '同比', '环比',
  '金额', '价格', '单价', '总价', '费用', '成本', '收入', '支出', '利润', '毛利', '净利', '额度', '余额',
  '时长', '耗时', '延迟', '大小', '容量', '内存', '磁盘', '流量', '带宽', '速度', '吞吐', 'QPS', 'TPS',
  'amount', 'price', 'cost', 'revenue', 'profit', 'balance',
  'rate', 'ratio', 'percent', 'percentage', 'duration', 'latency',
  'size', 'memory', 'disk', 'storage', 'bandwidth', 'throughput'
];

const RATE_HEADER_HINTS = [
  '率', '占比', '比例', '百分比', '比率', '同比', '环比',
  'rate', 'ratio', 'percent', 'percentage'
];

const AMOUNT_HEADER_HINTS = [
  '金额', '价格', '单价', '总价', '费用', '成本', '收入', '支出', '利润', '毛利', '净利', '额度', '余额',
  'amount', 'price', 'cost', 'revenue', 'profit', 'balance'
];

const NON_NUMERIC_HEADER_HINTS = [
  '编号', '编码', 'id', 'code', '订单号', '单号', '序号', '学号', '工号', '手机号', '电话', '邮编'
];

const isDateLikeText = (text: string): boolean => {
  const normalized = text.trim();
  return (
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/.test(normalized) ||
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(normalized) ||
    /^\d{1,2}:\d{2}(?::\d{2})?$/.test(normalized)
  );
};

const isNumericLikeText = (value: unknown): boolean => {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean' || value === null || value === undefined) return false;

  const raw = extractCellText(value).trim();
  if (!raw || isDateLikeText(raw)) return false;

  let normalized = raw
    .replace(/\s+/g, '')
    .replace(/^[¥￥$€£]/, '')
    .replace(/^[+-]?\(/, '-')
    .replace(/\)$/, '')
    .replace(/,/g, '');

  normalized = normalized.replace(
    /(万元|亿元|万|亿|元|%|‰|bp|bps|个|人|次|件|台|天|小时|分钟|分|秒|年|月|周|kwh|kw|w|ms|s|kb|mb|gb|tb|cny|rmb|usd)$/i,
    ''
  );

  return /^[+-]?\d+(?:\.\d+)?$/.test(normalized);
};

const isNumericTextColumn = (header: string, values: unknown[]): boolean => {
  const nonEmptyValues = values.filter((value) => String(extractCellText(value) || '').trim() !== '');
  if (nonEmptyValues.length === 0) return false;

  const numericCount = nonEmptyValues.filter((value) => isNumericLikeText(value)).length;
  const numericRatio = numericCount / nonEmptyValues.length;
  const hasNumericHeaderHint = headerIncludes(header, NUMERIC_HEADER_HINTS);
  const hasNonNumericHeaderHint = headerIncludes(header, NON_NUMERIC_HEADER_HINTS);

  if (hasNonNumericHeaderHint && !hasNumericHeaderHint) return false;
  if (hasNumericHeaderHint && numericCount > 0) return true;
  return numericCount >= 2 && numericRatio >= 0.7;
};

export const resolveTagColumnKind = (columnType: unknown, headerText: string): TagColumnKind => {
  const normalized = String(columnType || '')
    .trim()
    .toLowerCase()
    .replace(/[_\\s]+/g, '-');
  if (normalized.includes('type-tag') || normalized.includes('typetag')) return 'type';
  if (normalized.includes('status-tag') || normalized.includes('statustag')) return 'status';
  if (normalized.includes('status') || normalized.includes('state') || normalized.includes('badge')) return 'status';
  const header = String(headerText || '').trim();
  if (header.includes('类型') || header.includes('分类') || header.includes('品类')) return 'type';
  return 'status';
};

export const extractTagCellPayload = (
  value: unknown,
  fallbackKind: TagColumnKind
): {
  text: string;
  kind: TagColumnKind;
  componentToken?: string;
  statusTheme?: string;
  statusType?: string;
  statusState?: string;
  tagType?: string;
  tagColor?: string;
} => {
  if (!isObject(value)) {
    const text = extractCellText(value);
    const statusTheme = fallbackKind === 'status' ? resolveStatusTagThemeFromSemantic(text) || undefined : undefined;
    return {
      text,
      kind: fallbackKind,
      ...(statusTheme ? { statusTheme } : {})
    };
  }

  const obj = value as any;
  const text =
    extractCellText(obj) ||
    extractCellText(obj.tagText ?? obj.statusText ?? obj.label ?? obj.value ?? obj.name);

  const rawKind =
    obj.tagKind ??
    obj.kind ??
    obj.tagFamily ??
    (typeof obj.tagType === 'string' && obj.tagType.includes('StatusTag') ? 'status' : undefined);
  const kindNormalized = String(rawKind || '').trim().toLowerCase();
  const kind: TagColumnKind =
    kindNormalized.includes('type')
      ? 'type'
      : kindNormalized.includes('status')
        ? 'status'
        : obj.statusTheme !== undefined || obj.statusColor !== undefined || obj.statusText !== undefined
          ? 'status'
          : fallbackKind;

  const componentToken = typeof obj.componentToken === 'string' && obj.componentToken.trim()
    ? obj.componentToken.trim()
    : undefined;

  const tagColorRaw = obj.tagColor ?? obj.color ?? obj.statusColor;
  const tagColor = typeof tagColorRaw === 'string' && tagColorRaw.trim() ? tagColorRaw.trim() : undefined;

  const statusThemeRaw = obj.statusTheme ?? obj.theme ?? obj.tagTheme;
  const semanticKeyRaw = obj.statusSemantic ?? obj.statusIntent ?? obj.semantic ?? obj.intent;
  const semanticTheme = resolveStatusTagThemeFromSemantic(semanticKeyRaw) || undefined;
  const textTheme = resolveStatusTagThemeFromSemantic(text) || undefined;
  const statusTheme =
    semanticTheme ||
    textTheme ||
    normalizeStatusTagThemeInput(statusThemeRaw) ||
    resolveStatusTagThemeFromSemantic(tagColorRaw) ||
    undefined;

  const statusTypeRaw = obj.statusType ?? obj.statusLevel ?? obj.level;
  const statusType =
    typeof statusTypeRaw === 'string' && statusTypeRaw.trim()
      ? statusTypeRaw.trim()
      : undefined;

  const statusStateRaw = obj.statusState ?? obj.state;
  const statusState =
    typeof statusStateRaw === 'string' && statusStateRaw.trim()
      ? statusStateRaw.trim()
      : undefined;

  const tagTypeRaw = obj.tagType ?? obj.typeStyle ?? obj.style ?? obj.variant;
  const tagType =
    typeof tagTypeRaw === 'string' && tagTypeRaw.trim()
      ? tagTypeRaw.trim()
      : undefined;

  return { text, kind, componentToken, statusTheme, statusType, statusState, tagType, tagColor };
};

export const tableTypeToComponentId = (type?: string): string => {
  const normalized = (type || 'Text').toLowerCase();
  if (
    normalized.includes('number(unit)') ||
    normalized.includes('number-unit') ||
    normalized.includes('number_unit') ||
    normalized.includes('num(unit)') ||
    normalized.includes('数值单位')
  ) {
    return 'table-cell-number-unit';
  }
  if (normalized.includes('actionicon') || normalized.includes('action-icon') || normalized.includes('action_icon') || normalized.includes('操作图标')) {
    return 'table-cell-action-icon';
  }
  if (normalized.includes('actiontext') || normalized.includes('action-text') || normalized.includes('action_text') || normalized.includes('操作文字') || normalized.includes('operation') || normalized.includes('action') || normalized.includes('操作')) {
    return 'table-cell-action-text';
  }
  if (normalized.includes('avatar') || normalized.includes('user') || normalized.includes('owner')) {
    return 'table-cell-avatar';
  }
  if (normalized.includes('input') || normalized.includes('edit')) {
    return 'table-cell-input';
  }
  if (normalized.includes('tag') || normalized.includes('state') || normalized.includes('badge') || normalized.includes('status')) {
    return 'table-cell-tag';
  }
  return 'table-cell';
};

const inferColumnType = (header: string, values: unknown[]): string => {
  const isActionHeader = headerIncludes(header, ['操作', 'action', 'actions', 'operation']);
  if (isActionHeader || columnHasActionText(values)) return 'ActionText';

  const isUserHeader = headerIncludes(header, ['负责人', '创建人', '成员', '用户', '姓名', 'owner', 'user', 'member', 'assignee']);
  if (isUserHeader) return 'Avatar';

  const isTagHeader = headerIncludes(header, ['状态', '标签', '类型', '分类', '品类', '级别', 'status', 'state', 'tag', 'type', 'badge']);
  const hasTagSignal = isTagHeader || columnHasTagObject(values) || columnHasStatusText(values);
  if (hasTagSignal) {
    const kind = resolveTagColumnKind('Tag', header);
    return kind === 'type' ? 'TypeTag' : 'StatusTag';
  }

  const numberUnitMeta = inferNumberUnitColumnMeta(header, values);
  if (numberUnitMeta.shouldUse) return 'Number(unit)';

  return 'Text';
};

const isNumberUnitValueLike = (parsed: { value: string; unit: string }): boolean => {
  const value = String(parsed.value || '').trim();
  if (!value) return false;
  return isNumericLikeText(value);
};

const parseNumberUnitCell = (rawValue: unknown): { value: string; unit: string } => {
  if (isObject(rawValue)) {
    const obj = rawValue as any;
    const explicitValue = extractCellText(obj.value ?? obj.number ?? obj.num ?? obj.amount);
    const explicitUnit = extractCellText(obj.unit ?? obj.suffix);
    if (explicitValue || explicitUnit) {
      return { value: explicitValue || '0', unit: explicitUnit };
    }
    const fallbackText = extractCellText(obj.text ?? obj.label ?? obj.content);
    rawValue = fallbackText;
  }

  const text = extractCellText(rawValue).trim();
  if (!text) return { value: '0', unit: '' };

  const prefixCurrencyMatch = text.match(/^(HK\$|US\$|[¥￥$€£])\s*([+-]?\d[\d,]*(?:\.\d+)?)(?:\s*)(.*)$/);
  if (prefixCurrencyMatch) {
    const value = (prefixCurrencyMatch[2] || '').trim() || text;
    const trailingUnit = normalizeNumberUnitLabel(prefixCurrencyMatch[3] || '');
    const currencyUnit = normalizeNumberUnitLabel(prefixCurrencyMatch[1] || '');
    return { value, unit: trailingUnit || currencyUnit };
  }

  const match = text.match(/^([+-]?\d[\d,]*(?:\.\d+)?)(?:\s*)(.*)$/);
  if (!match) return { value: text, unit: '' };
  const value = (match[1] || '').trim() || text;
  const unit = normalizeNumberUnitLabel(match[2] || '');
  return { value, unit };
};

const inferNumberUnitColumnMeta = (
  header: string,
  values: unknown[]
): { shouldUse: boolean; textAlign: 'left' | 'right'; defaultUnit: string } => {
  const nonEmptyValues = values.filter((value) => String(extractCellText(value) || '').trim() !== '');
  if (nonEmptyValues.length === 0) return { shouldUse: false, textAlign: 'right', defaultUnit: '' };

  const parsedValues = nonEmptyValues.map((value) => parseNumberUnitCell(value));
  const numericParsed = parsedValues.filter(isNumberUnitValueLike);
  const numericRatio = numericParsed.length / nonEmptyValues.length;
  const units = numericParsed
    .map((item) => normalizeNumberUnitLabel(item.unit))
    .filter((unit) => unit);
  const distinctUnits = Array.from(new Set(units));
  const hasExplicitUnit = distinctUnits.length > 0;
  const hasMixedUnits = distinctUnits.length > 1;
  const hasHeaderHint = headerIncludes(header, NUMBER_UNIT_HEADER_HINTS);
  const inferredDefaultUnit =
    distinctUnits.length === 1
      ? distinctUnits[0]
      : headerIncludes(header, RATE_HEADER_HINTS)
        ? '%'
        : headerIncludes(header, AMOUNT_HEADER_HINTS)
          ? '元'
          : '';

  if (hasMixedUnits && numericParsed.length >= 2 && numericRatio >= 0.6) {
    return { shouldUse: true, textAlign: 'left', defaultUnit: '' };
  }
  if (hasExplicitUnit && numericParsed.length >= 1 && numericRatio >= 0.5) {
    return { shouldUse: true, textAlign: 'right', defaultUnit: inferredDefaultUnit };
  }
  if (hasHeaderHint && numericParsed.length >= 1 && numericRatio >= 0.6) {
    return { shouldUse: true, textAlign: 'right', defaultUnit: inferredDefaultUnit };
  }
  return { shouldUse: false, textAlign: 'right', defaultUnit: '' };
};

export const inferColumnTypesFromRows = (
  headers: string[],
  rows: unknown[][],
  currentTypes?: string[]
): string[] => {
  const normalizedTypes = Array.isArray(currentTypes)
    ? currentTypes.map((t) => String(t || '').trim())
    : [];

  return headers.map((header, index) => {
    const explicit = normalizedTypes[index];
    if (explicit && explicit.toLowerCase() !== 'text') return explicit;
    const columnValues = rows.map((row) => row?.[index]);
    const inferred = inferColumnType(header, columnValues);
    return inferred || explicit || 'Text';
  });
};

export const normalizeRowsByHeaders = (
  rawRows: unknown,
  headers: string[],
  columnKeys?: string[]
): unknown[][] => {
  if (!Array.isArray(rawRows)) return [];

  const colCount = headers.length;
  let rows = rawRows as any[];

  // 混合行重组逻辑：LLM 输出 JSON 时括号可能提前闭合，
  // 导致本属于同一行的元素（scalar/object）溢出到 rows 顶层。
  // 例如: [["A",{status}],"B","C", ["D",{status}],"E","F"]
  // 应重组为: [["A",{status},"B","C"], ["D",{status},"E","F"]]
  if (colCount > 1 && rows.length > colCount) {
    const hasArrayElements = rows.some((r) => Array.isArray(r));
    const hasNonArrayElements = rows.some((r) => !Array.isArray(r));
    const allArraysFull = hasArrayElements && rows.filter(Array.isArray).every((r: any[]) => r.length >= colCount);
    if (hasArrayElements && hasNonArrayElements && !allArraysFull) {
      const reassembled: any[][] = [];
      let cursor = 0;
      while (cursor < rows.length) {
        const head = rows[cursor];
        if (Array.isArray(head)) {
          if (head.length >= colCount) {
            reassembled.push(head);
            cursor += 1;
          } else {
            const merged: any[] = [...head];
            cursor += 1;
            while (merged.length < colCount && cursor < rows.length && !Array.isArray(rows[cursor])) {
              merged.push(rows[cursor]);
              cursor += 1;
            }
            reassembled.push(merged);
          }
        } else {
          const merged: any[] = [];
          while (merged.length < colCount && cursor < rows.length && !Array.isArray(rows[cursor])) {
            merged.push(rows[cursor]);
            cursor += 1;
          }
          reassembled.push(merged);
        }
      }
      if (reassembled.length > 0 && reassembled.every((r) => r.length >= colCount - 1)) {
        rows = reassembled;
      }
    }
  }

  const headerNorm = headers.map((h) => String(h || '').trim().toLowerCase().replace(/[\s_]+/g, ''));

  return rows.map((row) => {
    if (Array.isArray(row)) {
      return headers.map((_, i) => row[i]);
    }
    if (isObject(row)) {
      const result = headers.map((headerTitle, i) => {
        if (columnKeys && columnKeys[i]) {
          const val = (row as any)[columnKeys[i]];
          if (val !== undefined) return val;
        }
        if ((row as any)[headerTitle] !== undefined) return (row as any)[headerTitle];
        const norm = headerNorm[i];
        for (const k of Object.keys(row as any)) {
          if (k.trim().toLowerCase().replace(/[\s_]+/g, '') === norm) return (row as any)[k];
        }
        return undefined;
      });
      const matched = result.filter((v) => v !== undefined).length;
      if (matched === 0) {
        const vals = Object.values(row as any);
        return headers.map((_, i) => vals[i]);
      }
      return result;
    }
    return headers.map(() => row);
  });
};

export const getPositiveNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// ─── Skill 主体 ───────────────────────────────────────────────────────────────

export const buildTableComponentFromPayload = (
  payload: any,
  options?: { minRowCount?: number }
): any | null => {
  const source = isObject(payload?.schema) ? payload.schema : payload;
  if (!isObject(source)) return null;

  const rawColumns = Array.isArray(source.columns) ? source.columns : null;
  const rawHeaders =
    Array.isArray(source.headers) ? source.headers :
    (rawColumns ? rawColumns.map((c: any, i: number) => typeof c === 'string' ? c : (c?.title || c?.header || c?.name || `列${i + 1}`)) : null);
  const fallbackHeaders = (rawHeaders || []).map((h: any, i: number) => String(h || `列${i + 1}`));
  let headerRows = normalizeHeaderRowsInput(source, fallbackHeaders);
  let headers = inferLeafHeadersFromHeaderRows(headerRows);
  if (headers.length === 0) {
    headers = fallbackHeaders;
  }

  // Extract column keys (key/dataIndex) for object-row lookup
  const columnKeys: string[] = rawColumns
    ? rawColumns.map((c: any) => String(c?.dataIndex || c?.key || ''))
    : [];

  const rawRowSource = source.rows ?? source.dataSource ?? source.data ?? [];
  let rows = normalizeRowsByHeaders(rawRowSource, headers, columnKeys);

  if ((!headers || headers.length === 0) && rows.length > 0) {
    const first = rows[0];
    if (Array.isArray(first)) {
      headers = first.map((_, i) => `列${i + 1}`);
    }
  }

  if (!headers || headers.length === 0) return null;
  if (headerRows.length === 0) {
    headerRows = [headers];
  }
  const explicitMergesInput = normalizeMergesInput(source);
  const inferredBodyMerges = inferImplicitBodyMerges({
    headerRows,
    rows,
    merges: explicitMergesInput,
  });
  // 兜底推断：最后一行首列出现 合计/小计/总计/Total 且后续单元格为空时，
  // 视为"合计行"，自动生成 body colspan merge（横跨"空"段直到非空单元格停下）
  const inferTotalRowMerges = (): Array<{ section: 'body'; row: number; col: number; rowspan: number; colspan: number }> => {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const lastRowIndex = rows.length - 1;
    const lastRow = rows[lastRowIndex];
    if (!Array.isArray(lastRow) || lastRow.length === 0) return [];
    const firstCellRaw = (lastRow[0] as any);
    const firstCellText = typeof firstCellRaw === 'string'
      ? firstCellRaw
      : typeof firstCellRaw === 'object' && firstCellRaw !== null
        ? String((firstCellRaw as any).text ?? (firstCellRaw as any).value ?? '')
        : String(firstCellRaw ?? '');
    const normalized = firstCellText.trim().toLowerCase();
    if (!/^(合计|小计|总计|总和|合\s*计|小\s*计|总\s*计|total|subtotal|sum)$/i.test(normalized)) return [];
    // 已被显式 merge 覆盖则跳过
    const alreadyExplicit = [...explicitMergesInput, ...inferredBodyMerges].some(
      (m: any) => m.section === 'body' && Number(m.row) === lastRowIndex && Number(m.col) === 0
    );
    if (alreadyExplicit) return [];
    let span = 1;
    while (span < lastRow.length) {
      const nextCell = lastRow[span];
      const nextText = typeof nextCell === 'string'
        ? nextCell
        : typeof nextCell === 'object' && nextCell !== null
          ? String((nextCell as any).text ?? (nextCell as any).value ?? '')
          : String(nextCell ?? '');
      if (nextText.trim() === '') {
        span += 1;
      } else {
        break;
      }
    }
    if (span <= 1) return [];
    return [{ section: 'body', row: lastRowIndex, col: 0, rowspan: 1, colspan: span }];
  };
  const totalRowMerges = inferTotalRowMerges();
  let mergesInput = [...explicitMergesInput, ...inferredBodyMerges, ...totalRowMerges];
  const autoMergeRulesInput = normalizeAutoMergeRulesInput(source);
  const isMergeTable = mergesInput.length > 0 || headerRows.length > 1;

  // Support explicit rowCount from payload (LLM can output fewer rows + rowCount to save tokens).
  const explicitRowCount = getPositiveNumber(source.rowCount);
  const minRowCount = typeof options?.minRowCount === 'number' ? options.minRowCount : 10;
  const effectiveMinRowCount = isMergeTable ? 0 : minRowCount;
  const targetRowCount = Math.max(
    explicitRowCount ?? rows.length,
    rows.length,
    effectiveMinRowCount > 0 ? effectiveMinRowCount : 0
  );
  if (rows.length < targetRowCount) {
    if (rows.length === 0) {
      rows = Array.from({ length: targetRowCount }).map(() => headers.map(() => ''));
    } else {
      // Keep original rows intact, fill remaining slots by randomly picking from originals.
      const originalRows = rows.slice();
      const filled: any[][] = [...originalRows];
      for (let i = originalRows.length; i < targetRowCount; i += 1) {
        const src = originalRows[Math.floor(Math.random() * originalRows.length)];
        filled.push(Array.isArray(src) ? [...src] : headers.map(() => ''));
      }
      rows = filled;
    }
  }

  const rowHeightSource = isObject(source.rowHeight) ? source.rowHeight : null;
  const headerHeight =
    getPositiveNumber(source.headerHeight) ??
    getPositiveNumber(source.rowHeightHeader) ??
    getPositiveNumber((rowHeightSource as any)?.header) ??
    40;
  const bodyHeight =
    getPositiveNumber(source.bodyHeight) ??
    getPositiveNumber(source.rowHeightBody) ??
    (!rowHeightSource ? getPositiveNumber(source.rowHeight) : null) ??
    getPositiveNumber((rowHeightSource as any)?.body) ??
    40;

  const columnTypesBase: string[] =
    Array.isArray(source.columnTypes) ? source.columnTypes.map((t: any) => String(t)) :
    (rawColumns ? rawColumns.map((c: any) => String(c?.type || 'Text')) : headers.map(() => 'Text'));
  const inferredColumnTypes = inferColumnTypesFromRows(headers, rows, columnTypesBase);
  const inferredColumnWidths: number[] =
    Array.isArray(source.columnWidths) ? source.columnWidths.map((w: any) => Number(w)) :
    (rawColumns ? rawColumns.map((c: any) => Number(c?.width || 0)) : headers.map(() => 0));
  const hasPagination = source.pagination === undefined ? !isMergeTable : Boolean(source.pagination);
  const hasFilter = Boolean(source.filters);
  const hasTabs = Boolean(source.hasTabs || source.tabs);
  const hasButtonGroup = Boolean(source.hasButtonGroup || source.buttonGroup);
  const buttonGroup = isObject(source.buttonGroup) ? source.buttonGroup : null;
  const primaryButtonText =
    source.primaryButtonText ?? buttonGroup?.primaryText ?? buttonGroup?.primary ?? buttonGroup?.primaryLabel;
  const secondaryButtonText =
    source.secondaryButtonText ?? buttonGroup?.secondaryText ?? buttonGroup?.secondary ?? buttonGroup?.secondaryLabel;
  const filterTexts = Array.isArray(source.filters)
    ? source.filters.join(',')
    : (typeof source.filters === 'string' ? source.filters : '');
  const rowActionRaw =
    source.rowAction ?? source.rowSelection ?? source.selection ?? source.selectionMode;
  const rowActionText =
    rowActionRaw === undefined || rowActionRaw === null ? '' : String(rowActionRaw).trim();
  const rowAction = rowActionText ? rowActionText : undefined;
  const normalizedGrid = buildNormalizedTableGrid({
    headerRows,
    rows,
    columnTypes: inferredColumnTypes,
    columnWidths: inferredColumnWidths,
    ...(rowAction ? { rowAction } : {}),
    merges: mergesInput,
    autoMergeRules: autoMergeRulesInput,
  });
  const mergeValidationErrors = validateNormalizedTableGrid(normalizedGrid);
  if (mergeValidationErrors.length > 0) return null;
  const tableRenderPlan = buildTableRenderPlan(normalizedGrid);
  headerRows = normalizedGrid.headerRows;
  headers = normalizedGrid.leafHeaders;
  rows = normalizedGrid.bodyRows as unknown[][];
  const columnTypes = normalizedGrid.columnTypes;
  const columnWidths = normalizedGrid.columnWidths;
  const merges = normalizedGrid.merges;
  const autoMergeRules = normalizedGrid.autoMergeRules;

  const children = headers.map((header, colIndex) => {
    const type = columnTypes[colIndex] || 'Text';
    const cellComponentId = tableTypeToComponentId(type);
    const isActionColumn = cellComponentId === 'table-cell-action-text' || cellComponentId === 'table-cell-action-icon';
    const columnValues = rows.map((row) => row[colIndex]);
    const numberUnitMeta = inferNumberUnitColumnMeta(header, columnValues);
    const widthRaw = Number(columnWidths[colIndex]);
    const hasWidth = Number.isFinite(widthRaw) && widthRaw > 0;
    const width = hasWidth ? widthRaw : undefined;
    const tagColumnKind: TagColumnKind | null =
      cellComponentId === 'table-cell-tag' ? resolveTagColumnKind(type, header) : null;
    const headerText = isActionColumn ? '操作' : header;
    const textAlign =
      cellComponentId === 'table-cell-number-unit'
        ? numberUnitMeta.textAlign
        : cellComponentId === 'table-cell' && isNumericTextColumn(header, columnValues)
          ? 'right'
          : undefined;

    const columnChildren: any[] = [
      {
        componentId: 'table-header-cell',
        params: {
          text: headerText,
          ...(hasWidth && !isActionColumn ? { width } : {}),
          height: headerHeight,
          ...(textAlign ? { textAlign } : {})
        }
      }
    ];

    rows.forEach((row) => {
      const rawValue = row[colIndex];
      const value = extractCellText(rawValue);
      if (cellComponentId === 'table-cell-tag') {
        const columnKind = tagColumnKind || 'status';
        const tagPayload = extractTagCellPayload(rawValue, columnKind);
        const kind = tagPayload.kind || columnKind;
        const isStatus = kind === 'status';
        const fallbackToken = isStatus ? 'lib-data-display-status-tag' : 'lib-data-display-tag';
        const componentToken = tagPayload.componentToken || fallbackToken;
        const tagText = tagPayload.text || value || 'Tag';
        const baseParams: any = {
          height: bodyHeight,
          componentToken,
          tagKind: kind,
          tagText,
          text: tagText,
          tagColor: tagPayload.tagColor,
          ...(hasWidth && !isActionColumn ? { width } : {})
        };

        if (isStatus) {
          baseParams.statusType = tagPayload.statusType || 'L2 二级标签';
          baseParams.statusTheme = tagPayload.statusTheme || 'Success 成功';
          if (tagPayload.statusState) baseParams.statusState = tagPayload.statusState;
          // 规则：状态标签不携带 tagType，避免被误判为默认 Tag
          delete baseParams.tagType;
        } else {
          baseParams.tagType = tagPayload.tagType || 'Outline 线型标签';
        }

        columnChildren.push({
          componentId: 'table-cell-tag',
          params: {
            ...baseParams,
            // Ensure status family is preferred for status kind
            ...(isStatus ? { componentToken: 'lib-data-display-status-tag' } : {})
          }
        });
        return;
      }
      if (cellComponentId === 'table-cell-avatar') {
        columnChildren.push({
          componentId: 'table-cell-avatar',
          params: { height: bodyHeight, text: value || 'User', ...(hasWidth && !isActionColumn ? { width } : {}) }
        });
        return;
      }
      if (cellComponentId === 'table-cell-input') {
        columnChildren.push({
          componentId: 'table-cell-input',
          params: { height: bodyHeight, value, ...(hasWidth && !isActionColumn ? { width } : {}) }
        });
        return;
      }
      if (cellComponentId === 'table-cell-action-text') {
        const actionText = (value || '编辑 删除 …').replace(/\s*[|｜／\/]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
        columnChildren.push({
          componentId: 'table-cell-action-text',
          params: { height: bodyHeight, text: actionText }
        });
        return;
      }
      if (cellComponentId === 'table-cell-action-icon') {
        columnChildren.push({
          componentId: 'table-cell-action-icon',
          params: { height: bodyHeight, text: value }
        });
        return;
      }
      if (cellComponentId === 'table-cell-number-unit') {
        const parsed = parseNumberUnitCell(rawValue);
        const effectiveUnit = parsed.unit || numberUnitMeta.defaultUnit;
        columnChildren.push({
          componentId: 'table-cell-number-unit',
          params: {
            height: bodyHeight,
            value: parsed.value,
            unit: effectiveUnit,
            text: `${parsed.value}${effectiveUnit ? ` ${effectiveUnit}` : ''}`,
            ...(hasWidth && !isActionColumn ? { width } : {}),
            ...(textAlign ? { textAlign } : {})
          }
        });
        return;
      }
      columnChildren.push({
        componentId: 'table-cell',
        params: {
          height: bodyHeight,
          text: value,
          ...(hasWidth && !isActionColumn ? { width } : {}),
          ...(textAlign ? { textAlign } : {})
        }
      });
    });

    return {
      componentId: 'table-column',
      params: {
        headerText,
        rowCount: rows.length,
        ...(hasWidth && !isActionColumn ? { width } : {}),
        ...(isActionColumn ? { columnWidthMode: 'HUG' } : {}),
        ...(textAlign ? { textAlign } : {}),
        headerHeight,
        bodyHeight
      },
      children: columnChildren
    };
  });

  return {
    componentId: 'table',
    params: {
      columnCount: headers.length,
      rowCount: rows.length,
      headers,
      headerRows,
      merges,
      autoMergeRules,
      tableRenderPlan,
      headerHeight,
      bodyHeight,
      hasPagination,
      hasFilter,
      hasButtonGroup,
      hasTabs,
      filterTexts,
      primaryButtonText,
      secondaryButtonText,
      ...(rowAction ? { rowAction } : {})
    },
    children
  };
};
