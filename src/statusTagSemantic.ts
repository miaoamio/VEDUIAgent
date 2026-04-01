export type StatusTagThemeLabel =
  | 'Success 成功'
  | 'Warning 告警'
  | 'Error 错误'
  | 'Stop 停止'
  | 'Processing 等待中'
  | 'Loading 加载中'
  | 'Waiting 待启用';

export const STATUS_TAG_THEME_OPTIONS = new Set<StatusTagThemeLabel>([
  'Success 成功',
  'Warning 告警',
  'Error 错误',
  'Stop 停止',
  'Processing 等待中',
  'Loading 加载中',
  'Waiting 待启用'
]);

export function resolveStatusTagThemeFromSemantic(value: unknown): StatusTagThemeLabel | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;

  const exactThemeLabel = Array.from(STATUS_TAG_THEME_OPTIONS).find(
    (option) => option.trim().toLowerCase() === normalized
  );
  if (exactThemeLabel) return exactThemeLabel;

  if (
    normalized.includes('critical') ||
    normalized.includes('严重') ||
    normalized.includes('致命') ||
    normalized.includes('高危') ||
    normalized.includes('danger') ||
    normalized.includes('危险')
  ) return 'Error 错误';

  if (
    /^已.+/.test(normalized) ||
    normalized.includes('success') ||
    normalized.includes('成功') ||
    normalized.includes('已启用') ||
    normalized.includes('已生成') ||
    normalized.includes('approved') ||
    normalized.includes('通过') ||
    normalized.includes('已完成') ||
    normalized.includes('完成') ||
    normalized.includes('done') ||
    normalized.includes('completed') ||
    normalized.includes('resolved') ||
    normalized.includes('recovered') ||
    normalized.includes('已恢复') ||
    normalized.includes('恢复') ||
    normalized.includes('green')
  ) return 'Success 成功';

  if (
    normalized.includes('warning') ||
    normalized.includes('告警') ||
    normalized.includes('警告') ||
    normalized.includes('orange') ||
    normalized.includes('yellow')
  ) return 'Warning 告警';

  if (
    normalized.includes('error') ||
    normalized.includes('错误') ||
    normalized.includes('失败') ||
    normalized.includes('禁用') ||
    normalized.includes('rejected') ||
    normalized.includes('deny') ||
    normalized.includes('denied') ||
    normalized.includes('驳回') ||
    normalized.includes('拒绝') ||
    normalized.includes('red')
  ) return 'Error 错误';

  if (
    normalized.includes('stop') ||
    normalized.includes('停止') ||
    normalized.includes('终止') ||
    normalized.includes('gray') ||
    normalized.includes('grey')
  ) return 'Stop 停止';

  if (normalized.includes('loading') || normalized.includes('加载')) return 'Loading 加载中';

  if (
    /^待.+/.test(normalized) ||
    normalized.includes('waiting') ||
    normalized.includes('待启用') ||
    normalized.includes('待审核') ||
    normalized.includes('待审批') ||
    normalized.includes('待生成') ||
    normalized.includes('未填写') ||
    normalized.includes('未审核') ||
    normalized.includes('pending-review') ||
    normalized.includes('pending-approval') ||
    normalized.includes('pending review') ||
    normalized.includes('pending approval') ||
    normalized.includes('待开始') ||
    normalized.includes('未开始') ||
    normalized.includes('not started') ||
    normalized.includes('todo')
  ) return 'Waiting 待启用';

  if (
    normalized.includes('notice') ||
    normalized.includes('通知') ||
    normalized.includes('info') ||
    normalized.includes('信息') ||
    normalized.includes('processing') ||
    normalized.includes('审核中') ||
    normalized.includes('审批中') ||
    normalized.includes('生成中') ||
    normalized.includes('under-review') ||
    normalized.includes('under-approval') ||
    normalized.includes('in-review') ||
    normalized.includes('reviewing') ||
    normalized.includes('under review') ||
    normalized.includes('approving') ||
    normalized.includes('in review') ||
    normalized.includes('pending') ||
    normalized.includes('等待') ||
    normalized.includes('进行中') ||
    normalized.includes('填写中') ||
    normalized.includes('处理中') ||
    normalized.includes('in progress') ||
    normalized.includes('blue')
  ) return 'Processing 等待中';

  return null;
}

export function normalizeStatusTagThemeInput(value: unknown): StatusTagThemeLabel | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  if (STATUS_TAG_THEME_OPTIONS.has(trimmed as StatusTagThemeLabel)) {
    return trimmed as StatusTagThemeLabel;
  }
  return resolveStatusTagThemeFromSemantic(trimmed) || undefined;
}
