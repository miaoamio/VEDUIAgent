/**
 * chart.skill.ts — Layer 2: Skill
 *
 * 封装图表区块 (chart block) 的构建逻辑。
 * 被 App.tsx 调用，不直接暴露给 AI。
 *
 * 依赖：
 *   - block.helpers.ts（共用 Utils）
 */

import {
  isObject,
  getBlockSource,
  getBlockBody,
  buildHeaderSectionChildren,
  resolveBlockContainerMeta
} from './block.helpers';

// ─── Utils：图表专属工具函数 ────────────────────────────────────────────────

// componentId → figmaPropertySnapshot.token 直接映射（优先于关键字匹配）
const CHART_COMPONENT_TOKEN_MAP: Record<string, string> = {
  'chart-toplist': 'lib-data-display-toplist',
  'chart-pie':     'lib-data-display-component-piechart',
  'chart-line':    'lib-data-display-component-linechart',
  'chart-bar':     'lib-data-display-component-barchart',
  'chart-area':    'lib-data-display-component-areachart',
};

export const getChartToken = (hint: string, fallbackToken = ''): string => {
  const normalized = String(hint || '').replace(/\s+/g, '').toLowerCase();
  if (!normalized) return fallbackToken;
  if (normalized.includes('面积图') || normalized.includes('area')) return 'lib-data-display-component-areachart';
  if (
    normalized.includes('折线图') ||
    normalized.includes('linechart') ||
    normalized.includes('line-chart') ||
    normalized.includes('line')
  ) {
    return 'lib-data-display-component-linechart';
  }
  if (normalized.includes('柱状图') || normalized.includes('barchart') || normalized.includes('bar-chart') || normalized === 'bar') {
    return 'lib-data-display-component-barchart';
  }
  if (normalized.includes('条形图') || normalized.includes('toplist')) return 'lib-data-display-toplist';
  if (
    normalized.includes('饼图') ||
    normalized.includes('环形图') ||
    normalized.includes('pie') ||
    normalized.includes('donut') ||
    normalized.includes('piechart')
  ) {
    return 'lib-data-display-component-piechart';
  }
  return fallbackToken;
};

// ─── Skill 主体 ───────────────────────────────────────────────────────────────

export const buildChartBlockComponentFromPayload = (payload: any, fallbackTitle: string): any | null => {
  const source = getBlockSource(payload);
  if (!source) return null;
  const body = getBlockBody(source);

  const blockChildren: any[] = [];
  const rowChildren = buildHeaderSectionChildren(source.header);
  if (rowChildren.length > 0) {
    blockChildren.push({
      componentId: 'layout',
      params: { direction: 'horizontal', spacing: 12, paddingBottom: 8 },
      children: rowChildren
    });
  }

  const charts = Array.isArray(body.charts)
    ? body.charts
    : isObject(body.chart)
      ? [body.chart]
      : Array.isArray(source.charts)
        ? source.charts
        : isObject(source.chart)
          ? [source.chart]
          : [];

  const chartNodes: any[] = [];
  charts.forEach((chart: any, index: number) => {
    const chartObj = isObject(chart) ? chart : {};
    const props = isObject(chartObj.props) ? chartObj.props : {};
    const heightRaw = Number(props.height ?? chartObj.height);

    // 优先用 componentId 直接查表，避免关键字猜测失败
    const componentIdHint = String(chartObj.componentId ?? '').trim();
    const tokenFromId = CHART_COMPONENT_TOKEN_MAP[componentIdHint];
    const tokenHint = String(props.type ?? chartObj.type ?? props.chartType ?? chartObj.chartType ?? '').trim();
    const token = tokenFromId || getChartToken(tokenHint, 'lib-data-display-toplist');

    // Build variantCriteria from all non-reserved props.
    const RESERVED = new Set(['type', 'chartType', 'height', 'componentToken', 'fallbackName', 'componentId']);
    const variantProps: Record<string, string> = {};
    const booleanProps: Record<string, boolean> = {};
    [props, chartObj].forEach((src) => {
      Object.entries(src).forEach(([k, v]) => {
        if (!RESERVED.has(k) && v !== undefined) {
          if (typeof v === 'string') {
            variantProps[k] = v;
          } else if (typeof v === 'number') {
            variantProps[k] = String(v);
          } else if (typeof v === 'boolean') {
            booleanProps[k] = v;
          }
        }
      });
    });
    const variantCriteria = Object.keys(variantProps).length > 0
      ? JSON.stringify(variantProps)
      : undefined;

    chartNodes.push({
      componentId: componentIdHint.startsWith('chart-') ? componentIdHint : 'figma-component',
      params: {
        componentToken: token,
        fallbackName: `图表 ${index + 1}`,
        ...(Number.isFinite(heightRaw) && heightRaw > 0 ? { height: heightRaw } : {}),
        ...booleanProps,
        ...(variantCriteria ? { variantCriteria } : {})
      }
    });
  });

  if (chartNodes.length === 0) {
    chartNodes.push({
      componentId: 'chart-toplist',
      params: {
        componentToken: 'lib-data-display-toplist',
        fallbackName: String(source.chartTitle || '趋势')
      }
    });
  }

  blockChildren.push({
    componentId: 'layout',
    params: {
      direction: 'vertical',
      spacing: 8
    },
    children: chartNodes
  });

  const footer = isObject(source.footer) ? source.footer : {};
  const notes = typeof footer.notes === 'string'
    ? footer.notes
    : typeof (body as any).notes === 'string'
      ? (body as any).notes
      : '';
  if (notes) {
    blockChildren.push({
      componentId: 'text',
      params: {
        text: notes
      }
    });
  }

  const { title, width } = resolveBlockContainerMeta(source, fallbackTitle || '图表区块', 980);

  return {
    componentId: 'card',
    params: {
      title,
      width
    },
    children: blockChildren
  };
};
