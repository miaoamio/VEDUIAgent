import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { COMPONENT_REGISTRY } from './registry';
import { BASE_COLOR_TOKEN_PACK, SEMANTIC_COLOR_TOKEN_PACK } from './theme/volcengine-design/color-tokens';
import { BASE_TYPOGRAPHY_TOKEN_PACK } from './theme/volcengine-design/typography';
import { BASE_COMPONENT_TOKEN_PACK } from './theme/volcengine-design/component-tokens';
import type { ComponentDefinition, ParamDefinition, SizeMetricDefinition } from './registry.types';

// ── Styles ────────────────────────────────────────────────────────────────────

const css = `
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
    font-size: 13px;
    color: #1d2129;
    background: #f5f6f8;
    line-height: 1.5;
  }
  a { color: inherit; text-decoration: none; }

  .admin-layout { display: flex; height: 100vh; overflow: hidden; }

  /* Sidebar */
  .sidebar {
    width: 220px; flex-shrink: 0;
    background: #fff;
    border-right: 1px solid #e5e8ef;
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .sidebar-header {
    padding: 16px;
    border-bottom: 1px solid #e5e8ef;
  }
  .sidebar-header h1 { margin: 0; font-size: 14px; font-weight: 600; color: #1d2129; }
  .sidebar-header p { margin: 2px 0 0; font-size: 11px; color: #86909c; }
  .sidebar-nav { flex: 1; overflow-y: auto; padding: 8px; }
  .nav-section { margin-bottom: 4px; }
  .nav-section-title {
    font-size: 10px; font-weight: 600; color: #86909c;
    text-transform: uppercase; letter-spacing: 0.6px;
    padding: 8px 8px 4px;
  }
  .nav-item {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 8px; border-radius: 6px;
    cursor: pointer; font-size: 12px; color: #4e5969;
    transition: background 0.12s;
  }
  .nav-item:hover { background: #f2f3f5; }
  .nav-item.active { background: #e8f0ff; color: #1664ff; font-weight: 500; }
  .nav-item .dot {
    width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  }

  /* Main */
  .main { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
  .main-header {
    background: #fff; border-bottom: 1px solid #e5e8ef;
    padding: 12px 24px;
    display: flex; align-items: center; gap: 12px; flex-shrink: 0;
  }
  .main-header h2 { margin: 0; font-size: 15px; font-weight: 600; }
  .main-header p { margin: 0; font-size: 12px; color: #86909c; }
  .breadcrumb { font-size: 11px; color: #86909c; }
  .breadcrumb span { color: #1664ff; }

  .main-content { flex: 1; padding: 20px 24px; }

  /* Tabs */
  .tabs { display: flex; gap: 0; border-bottom: 1px solid #e5e8ef; margin-bottom: 20px; }
  .tab {
    padding: 8px 16px; font-size: 13px; cursor: pointer;
    color: #86909c; border-bottom: 2px solid transparent;
    margin-bottom: -1px; transition: color 0.12s;
  }
  .tab:hover { color: #4e5969; }
  .tab.active { color: #1664ff; border-bottom-color: #1664ff; font-weight: 500; }

  /* Cards */
  .card {
    background: #fff; border-radius: 8px; border: 1px solid #e5e8ef;
    overflow: hidden; margin-bottom: 12px;
  }
  .card-header {
    padding: 12px 16px; border-bottom: 1px solid #f2f3f5;
    display: flex; align-items: center; gap: 8px;
    cursor: pointer; user-select: none;
  }
  .card-header:hover { background: #fafafa; }
  .card-header h3 { margin: 0; font-size: 13px; font-weight: 600; flex: 1; }
  .card-header .badge {
    font-size: 10px; padding: 2px 6px; border-radius: 10px;
    font-weight: 500;
  }
  .card-header .chevron {
    color: #86909c; font-size: 10px;
    transition: transform 0.15s;
  }
  .card-header .chevron.open { transform: rotate(90deg); }
  .card-body { padding: 16px; }

  /* Section inside card */
  .section { margin-bottom: 20px; }
  .section:last-child { margin-bottom: 0; }
  .section-title {
    font-size: 11px; font-weight: 600; color: #86909c;
    text-transform: uppercase; letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  /* Description */
  .description { font-size: 12px; color: #4e5969; line-height: 1.6; margin-bottom: 12px; }

  /* Table */
  .table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; border: 1px solid #e5e8ef; border-radius: 8px; overflow: hidden; margin: 0; }
  .table th:first-child { border-top-left-radius: 8px; }
  .table th:last-child { border-top-right-radius: 8px; }
  .table tr:last-child td:first-child { border-bottom-left-radius: 8px; }
  .table tr:last-child td:last-child { border-bottom-right-radius: 8px; }
  .table th {
    text-align: left; font-weight: 600;
    padding: 6px 10px; background: #f7f8fa;
    border-bottom: 1px solid #e5e8ef; color: #4e5969;
    font-size: 11px;
  }
  .table td {
    padding: 6px 10px; border-bottom: 1px solid #f2f3f5;
    vertical-align: top;
  }
  .table tr:last-child td { border-bottom: none; }
  .table tr:hover td { background: #fafafa; }

  /* Inline code */
  code {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px; background: #f2f3f5;
    padding: 1px 5px; border-radius: 3px; color: #1664ff;
  }

  /* Tags / badges */
  .tag {
    display: inline-block; font-size: 10px; font-weight: 500;
    padding: 1px 6px; border-radius: 10px; margin: 1px;
  }
  .tag-category { background: #e8f0ff; color: #1664ff; }
  .tag-type { background: #f0f7ff; color: #4080d0; }
  .tag-required { background: #fff0f0; color: #d7312a; }
  .tag-optional { background: #f2f3f5; color: #86909c; }
  .tag-string { background: #ecfdf5; color: #059669; }
  .tag-number { background: #fef3c7; color: #d97706; }
  .tag-boolean { background: #fde8d0; color: #c05621; }
  .tag-enum { background: #ede9fe; color: #7c3aed; }

  /* Color swatch */
  .swatch {
    display: inline-block; width: 14px; height: 14px;
    border-radius: 3px; border: 1px solid rgba(0,0,0,0.1);
    vertical-align: middle; margin-right: 4px; flex-shrink: 0;
  }

  /* Grid */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

  /* Search */
  .search-bar {
    width: 100%; padding: 8px 12px; border: 1px solid #e5e8ef;
    border-radius: 6px; font-size: 13px; outline: none;
    margin-bottom: 16px; background: #fff;
  }
  .search-bar:focus { border-color: #1664ff; }

  /* Rendernnotes */
  .render-notes { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px; }
  .render-notes .note-item { margin-bottom: 4px; font-size: 12px; color: #78350f; }
  .render-notes .note-item::before { content: '•'; margin-right: 6px; }

  /* Size metrics grid */
  .metrics-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .metrics-cell {
    background: #f7f8fa; border-radius: 6px; padding: 8px 12px;
    min-width: 120px; border: 1px solid #e5e8ef;
  }
  .metrics-cell .size-name { font-size: 11px; font-weight: 600; color: #4e5969; margin-bottom: 4px; }
  .metrics-cell .metric-row { font-size: 11px; color: #86909c; }
  .metrics-cell .metric-value { color: #1d2129; font-weight: 500; }

  /* Slot list */
  .slot-item { background: #f7f8fa; border-radius: 4px; padding: 6px 10px; margin-bottom: 4px; font-size: 12px; }
  .slot-allowed { color: #4e5969; }

  /* Empty state */
  .empty { color: #86909c; font-size: 12px; font-style: italic; padding: 8px 0; }

  /* Layer indicator */
  .layer-indicator {
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; padding: 8px 12px; border-radius: 6px;
    margin-bottom: 16px;
  }
  .layer-1 { background: #e8f0ff; color: #1664ff; }
  .layer-2 { background: #ecfdf5; color: #059669; }
  .layer-3 { background: #fde8d0; color: #c05621; }
  .layer-dot { width: 8px; height: 8px; border-radius: 50%; }

  /* Stats bar */
  .stats-bar {
    display: flex; gap: 16px; padding: 12px 16px;
    background: #fff; border-radius: 8px; border: 1px solid #e5e8ef;
    margin-bottom: 16px;
  }
  .stat { text-align: center; }
  .stat-value { font-size: 20px; font-weight: 700; color: #1664ff; }
  .stat-label { font-size: 11px; color: #86909c; margin-top: 2px; }

  /* Component type indicator */
  .type-a { border-left: 3px solid #1664ff; }
  .type-b { border-left: 3px solid #7c3aed; }

  /* Property map */
  .prop-map { background: #fafafa; border-radius: 4px; padding: 8px; }
  .prop-map-row { display: flex; gap: 8px; align-items: center; font-size: 11px; margin-bottom: 4px; }
  .prop-map-row:last-child { margin-bottom: 0; }
  .prop-map-arrow { color: #86909c; }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getParamTagClass(type: string): string {
  if (type === 'string') return 'tag-string';
  if (type === 'number') return 'tag-number';
  if (type === 'boolean') return 'tag-boolean';
  if (type === 'enum' || type === 'select' || type === 'segmented') return 'tag-enum';
  return 'tag-type';
}

function isFigmaLibraryComponent(comp: ComponentDefinition): boolean {
  return !!(comp.figmaPropertySnapshot || comp.figmaPropertySnapshotCatalog);
}

const CATEGORY_COLORS: Record<string, string> = {
  Layout: '#1664ff',
  Basic: '#059669',
  Form: '#7c3aed',
  Table: '#d97706',
  Data: '#c05621',
  Icon: '#86909c',
  Other: '#4e5969',
};

// ── Collapsible Card ──────────────────────────────────────────────────────────

function CollapsibleCard({
  title, badge, badgeColor = '#1664ff', badgeBg = '#e8f0ff',
  typeClass, defaultOpen = false, children,
}: {
  title: string; badge?: string; badgeColor?: string; badgeBg?: string;
  typeClass?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`card ${typeClass || ''}`}>
      <div className="card-header" onClick={() => setOpen(o => !o)}>
        <h3>{title}</h3>
        {badge && (
          <span className="badge" style={{ background: badgeBg, color: badgeColor }}>
            {badge}
          </span>
        )}
        <span className={`chevron ${open ? 'open' : ''}`}>▶</span>
      </div>
      {open && <div className="card-body">{children}</div>}
    </div>
  );
}

// ── Params Table ──────────────────────────────────────────────────────────────

function ParamsTable({ params }: { params: Record<string, ParamDefinition> }) {
  const entries = Object.entries(params);
  if (entries.length === 0) return <p className="empty">无参数</p>;
  return (
    <table className="table">
      <thead>
        <tr>
          <th>参数名</th>
          <th>类型</th>
          <th>默认值</th>
          <th>说明</th>
          <th>枚举值</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([key, p]) => (
          <tr key={key}>
            <td><code>{key}</code>{p.required && <span className="tag tag-required" style={{ marginLeft: 4 }}>必填</span>}</td>
            <td><span className={`tag ${getParamTagClass(p.type)}`}>{p.type}</span></td>
            <td>
              {p.default !== undefined
                ? <code>{JSON.stringify(p.default)}</code>
                : <span className="empty">—</span>}
            </td>
            <td style={{ maxWidth: 280, color: '#4e5969' }}>{p.description}</td>
            <td style={{ maxWidth: 200 }}>
              {p.enumValues?.map(v => (
                <span key={v} className="tag tag-enum" style={{ marginBottom: 2 }}>{v}</span>
              )) || <span className="empty">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Size Metrics ──────────────────────────────────────────────────────────────

function SizeMetricsView({ metrics }: { metrics: Record<string, SizeMetricDefinition> }) {
  return (
    <div className="metrics-grid">
      {Object.entries(metrics).map(([size, m]) => (
        <div key={size} className="metrics-cell">
          <div className="size-name">{size}</div>
          {Object.entries(m).map(([k, v]) => (
            <div key={k} className="metric-row">
              <span>{k}: </span>
              <span className="metric-value">{String(v)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Figma Property Snapshot ───────────────────────────────────────────────────

function FigmaSnapshotView({ comp }: { comp: ComponentDefinition }) {
  const snap = comp.figmaPropertySnapshot;
  const catalog = comp.figmaPropertySnapshotCatalog;

  if (!snap && !catalog) return null;

  const snapshots = snap ? [snap] : Object.entries(catalog!).map(([k, v]) => ({ ...v, _key: k }));

  return (
    <div className="section">
      <div className="section-title">Figma 属性映射 (figmaPropertySnapshot)</div>
      {snapshots.map((s, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          {s.componentName && <div style={{ fontSize: 11, color: '#86909c', marginBottom: 4 }}>组件: {s.componentName}</div>}
          {(s.token || s.componentSetName || s.inspectedAt) && (
            <div style={{ fontSize: 11, color: '#86909c', marginBottom: 6 }}>
              {s.token && <div>Token: <code>{s.token}</code></div>}
              {s.componentSetName && <div>组件集: {s.componentSetName}</div>}
              {s.inspectedAt && <div>采样时间: {s.inspectedAt}</div>}
            </div>
          )}
          {s.properties?.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Figma 属性名</th>
                  <th>类型</th>
                  <th>默认值</th>
                  <th>选项</th>
                </tr>
              </thead>
              <tbody>
                {s.properties.map((p, j) => (
                  <tr key={j}>
                    <td><code>{p.propertyName}</code></td>
                    <td><span className="tag tag-type">{p.type}</span></td>
                    <td>{p.defaultValue !== undefined ? <code>{String(p.defaultValue)}</code> : <span className="empty">—</span>}</td>
                    <td>{p.options?.join(', ') || <span className="empty">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="empty">无属性</p>}
        </div>
      ))}
    </div>
  );
}

// ── Component Card ────────────────────────────────────────────────────────────

function ComponentCard({ comp }: { comp: ComponentDefinition }) {
  const isLibrary = isFigmaLibraryComponent(comp);
  const typeClass = isLibrary ? 'type-b' : 'type-a';
  const catColor = CATEGORY_COLORS[comp.category] || '#4e5969';
  const catBg = catColor + '1a';

  const hasRuntime = comp.runtime && (
    comp.runtime.sizeMetrics || (comp.runtime as any).layoutModes || (comp.runtime as any).controlDefaults
  );
  const hasColorBindings = comp.colorVariableBindings && Object.keys(comp.colorVariableBindings).length > 0;
  const hasTypoBindings = comp.typographyBindings && Object.keys(comp.typographyBindings).length > 0;
  const hasSlots = comp.slots && Object.keys(comp.slots).length > 0;

  return (
    <CollapsibleCard
      title={`${comp.name}  `}
      badge={isLibrary ? 'Figma Key 渲染' : '代码自绘'}
      badgeColor={isLibrary ? '#7c3aed' : '#1664ff'}
      badgeBg={isLibrary ? '#ede9fe' : '#e8f0ff'}
      typeClass={typeClass}
    >
      {/* Meta */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <code style={{ fontSize: 12 }}>{comp.id}</code>
        <span className="tag tag-category" style={{ background: catBg, color: catColor }}>{comp.category}</span>
        {comp.tags?.map(t => <span key={t} className="tag tag-optional">{t}</span>)}
      </div>

      {comp.description && (
        <p className="description">{comp.description}</p>
      )}

      {comp.prompts?.usage && (
        <div className="section">
          <div className="section-title">AI 使用说明</div>
          <p style={{ fontSize: 12, color: '#4e5969', margin: 0 }}>{comp.prompts.usage}</p>
        </div>
      )}

      {/* Params */}
      <div className="section">
        <div className="section-title">
          参数 (params) — {Object.keys(comp.params).length} 个
        </div>
        <ParamsTable params={comp.params} />
      </div>

      {/* Slots */}
      {hasSlots && (
        <div className="section">
          <div className="section-title">槽位 (slots)</div>
          {Object.entries(comp.slots!).map(([slotName, slot]) => (
            <div key={slotName} className="slot-item">
              <strong>{slotName}</strong>
              {slot.required && <span className="tag tag-required" style={{ marginLeft: 6 }}>必须</span>}
              <div className="slot-allowed" style={{ marginTop: 4 }}>
                允许: {slot.allowedComponents.join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Runtime */}
      {hasRuntime && (
        <div className="section">
          <div className="section-title">渲染规格 (runtime)</div>
          {comp.runtime!.sizeMetrics && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#86909c', marginBottom: 6 }}>sizeMetrics</div>
              <SizeMetricsView metrics={comp.runtime!.sizeMetrics} />
            </div>
          )}
          {(comp.runtime as any).layoutModes && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#86909c', marginBottom: 6 }}>layoutModes</div>
              <pre style={{ fontSize: 11, background: '#f7f8fa', padding: 8, borderRadius: 4, margin: 0, overflow: 'auto' }}>
                {JSON.stringify((comp.runtime as any).layoutModes, null, 2)}
              </pre>
            </div>
          )}
          {(comp.runtime as any).controlDefaults && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#86909c', marginBottom: 6 }}>controlDefaults</div>
              <pre style={{ fontSize: 11, background: '#f7f8fa', padding: 8, borderRadius: 4, margin: 0, overflow: 'auto' }}>
                {JSON.stringify((comp.runtime as any).controlDefaults, null, 2)}
              </pre>
            </div>
          )}
          {(comp.runtime as any).controlClipRules && (
            <div>
              <div style={{ fontSize: 11, color: '#86909c', marginBottom: 6 }}>controlClipRules</div>
              <pre style={{ fontSize: 11, background: '#f7f8fa', padding: 8, borderRadius: 4, margin: 0, overflow: 'auto' }}>
                {JSON.stringify((comp.runtime as any).controlClipRules, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Figma snapshot */}
      <FigmaSnapshotView comp={comp} />

      {/* Color bindings */}
      {hasColorBindings && (
        <div className="section">
          <div className="section-title">颜色 Token 绑定</div>
          <table className="table">
            <thead>
              <tr><th>Token Key</th><th>状态</th><th>variableRef</th></tr>
            </thead>
            <tbody>
              {Object.entries(comp.colorVariableBindings!).map(([k, v]) => (
                <tr key={k}>
                  <td><code>{k}</code></td>
                  <td><span className={`tag ${v.enabled ? 'tag-string' : 'tag-optional'}`}>{v.enabled ? '已绑定' : '禁用'}</span></td>
                  <td style={{ fontSize: 11, color: '#86909c', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {v.variableRef || v.token || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Typography bindings */}
      {hasTypoBindings && (
        <div className="section">
          <div className="section-title">字体 Token 绑定</div>
          <table className="table">
            <thead>
              <tr><th>Token Key</th><th>状态</th><th>textStyleRef</th></tr>
            </thead>
            <tbody>
              {Object.entries(comp.typographyBindings!).map(([k, v]) => (
                <tr key={k}>
                  <td><code>{k}</code></td>
                  <td><span className={`tag ${v.enabled ? 'tag-string' : 'tag-optional'}`}>{v.enabled ? '已绑定' : '禁用'}</span></td>
                  <td style={{ fontSize: 11, color: '#86909c' }}>{v.textStyleRef || v.token || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Prompts examples */}
      {comp.prompts?.examples && comp.prompts.examples.length > 0 && (
        <div className="section">
          <div className="section-title">使用示例</div>
          {comp.prompts.examples.map((ex, i) => (
            <pre key={i} style={{ fontSize: 11, background: '#f7f8fa', padding: 8, borderRadius: 4, overflow: 'auto', whiteSpace: 'pre-wrap', marginBottom: 6, marginTop: 0 }}>
              {ex}
            </pre>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}

// ── Layer 1: Registry ─────────────────────────────────────────────────────────

function RegistryView() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const allComponents = Object.values(COMPONENT_REGISTRY.components);

  const categories = useMemo(() => {
    const cats = new Set(allComponents.map(c => c.category));
    return ['all', ...Array.from(cats).sort()];
  }, [allComponents]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allComponents.filter(c => {
      const matchCat = filterCategory === 'all' || c.category === filterCategory;
      const matchSearch = !q || c.id.includes(q) || c.name.includes(q) || c.description?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [allComponents, search, filterCategory]);

  const grouped = useMemo(() => {
    const g: Record<string, ComponentDefinition[]> = {};
    for (const c of filtered) {
      if (!g[c.category]) g[c.category] = [];
      g[c.category].push(c);
    }
    return g;
  }, [filtered]);

  const customCount = allComponents.filter(c => !isFigmaLibraryComponent(c)).length;
  const libraryCount = allComponents.filter(c => isFigmaLibraryComponent(c)).length;

  return (
    <div>
      <div className="layer-indicator layer-1">
        <div className="layer-dot" style={{ background: '#1664ff' }} />
        <strong>Layer 1 — Component Spec</strong>
        <span style={{ color: '#4080d0' }}>定义组件结构、参数、runtime 渲染规格</span>
      </div>

      <div className="stats-bar">
        <div className="stat">
          <div className="stat-value">{allComponents.length}</div>
          <div className="stat-label">总组件数</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#1664ff' }}>{customCount}</div>
          <div className="stat-label">代码自绘</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#7c3aed' }}>{libraryCount}</div>
          <div className="stat-label">Figma Key 渲染</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#059669' }}>{categories.length - 1}</div>
          <div className="stat-label">分类数</div>
        </div>
      </div>

      <input
        className="search-bar"
        placeholder="搜索组件 ID、名称或描述…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            style={{
              padding: '4px 10px', borderRadius: 20, border: '1px solid #e5e8ef',
              background: filterCategory === cat ? '#1664ff' : '#fff',
              color: filterCategory === cat ? '#fff' : '#4e5969',
              cursor: 'pointer', fontSize: 12, fontWeight: filterCategory === cat ? 600 : 400,
            }}
          >
            {cat === 'all' ? '全部' : cat}
            <span style={{ marginLeft: 4, opacity: 0.7 }}>
              ({cat === 'all' ? allComponents.length : allComponents.filter(c => c.category === cat).length})
            </span>
          </button>
        ))}
      </div>

      {Object.entries(grouped).map(([cat, comps]) => (
        <div key={cat}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: CATEGORY_COLORS[cat] || '#4e5969',
            padding: '8px 0 4px', marginBottom: 8, borderBottom: `2px solid ${CATEGORY_COLORS[cat] || '#e5e8ef'}22`,
          }}>
            {cat} ({comps.length})
          </div>
          {comps.map(c => <ComponentCard key={c.id} comp={c} />)}
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#86909c' }}>
          没有匹配的组件
        </div>
      )}
    </div>
  );
}

// ── Layer 2: Theme ────────────────────────────────────────────────────────────

const SEMANTIC_COLOR_HINTS: Record<string, string> = {
  'table': '#d97706', 'input': '#7c3aed', 'button': '#1664ff',
  'form': '#059669', 'select': '#c05621', 'checkbox': '#4e5969',
  'radio': '#4e5969', 'card': '#1664ff', 'chart': '#d97706',
  'layout': '#86909c', 'text': '#1d2129',
};

function getSemanticColor(token: string): string {
  const prefix = token.split('.')[0];
  return SEMANTIC_COLOR_HINTS[prefix] || '#86909c';
}

function ThemeView() {
  const [tab, setTab] = useState<'base' | 'semantic' | 'typography' | 'componentBase'>('semantic');

  const baseTokens = Object.values(BASE_COLOR_TOKEN_PACK);
  const semanticTokens = Object.values(SEMANTIC_COLOR_TOKEN_PACK);
  const typographyTokens = Object.values(BASE_TYPOGRAPHY_TOKEN_PACK);
  const baseComponentTokens = Object.values(BASE_COMPONENT_TOKEN_PACK);

  // Group semantic tokens by component prefix
  const semanticGroups = useMemo(() => {
    const g: Record<string, typeof semanticTokens> = {};
    for (const t of semanticTokens) {
      const prefix = t.token.split('.')[0];
      if (!g[prefix]) g[prefix] = [];
      g[prefix].push(t);
    }
    return g;
  }, [semanticTokens]);

  return (
    <div>
      <div className="layer-indicator layer-2">
        <div className="layer-dot" style={{ background: '#059669' }} />
        <strong>Layer 2 — Theme Package</strong>
        <span style={{ color: '#047857' }}>颜色 Token、字体 Token，可整包替换</span>
      </div>

      <div className="stats-bar">
        <div className="stat">
          <div className="stat-value" style={{ color: '#059669' }}>{baseTokens.length}</div>
          <div className="stat-label">基础颜色 Token</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#1664ff' }}>{semanticTokens.length}</div>
          <div className="stat-label">语义颜色 Token</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#7c3aed' }}>{typographyTokens.length}</div>
          <div className="stat-label">字体 Token</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#d97706' }}>{baseComponentTokens.length}</div>
          <div className="stat-label">基础组件 Token</div>
        </div>
      </div>

      <div className="tabs">
        {([['semantic', '语义颜色 Token'], ['base', '基础颜色 Token'], ['typography', '字体 Token'], ['componentBase', '基础组件 Token (含 Key)']] as const).map(([key, label]) => (
          <div key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key as any)}>
            {label}
          </div>
        ))}
      </div>

      {tab === 'base' && (
        <div className="card">
          <div className="card-body">
            <p className="description">基础 Token 是原始色值的抽象，绑定 Figma 变量。语义 Token 引用基础 Token。</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>variableRef</th>
                  <th>名称候选</th>
                </tr>
              </thead>
              <tbody>
                {baseTokens.map(t => (
                  <tr key={t.token}>
                    <td><code>{t.token}</code></td>
                    <td style={{ fontSize: 10, color: '#86909c', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.variableRef || <span className="empty">—</span>}
                    </td>
                    <td style={{ fontSize: 11, color: '#4e5969' }}>
                      {t.nameCandidates?.slice(0, 2).join(', ') || <span className="empty">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'semantic' && (
        <div>
          <p className="description" style={{ marginBottom: 16 }}>
            语义 Token 按组件分组，每个 Token 映射到基础 Token。Registry 里只写 Token key，theme 文件写实际值。
          </p>
          {Object.entries(semanticGroups).map(([prefix, tokens]) => (
            <CollapsibleCard
              key={prefix}
              title={prefix}
              badge={`${tokens.length} tokens`}
              badgeColor={getSemanticColor(tokens[0].token)}
              badgeBg={getSemanticColor(tokens[0].token) + '1a'}
              defaultOpen
            >
              <table className="table">
                <thead>
                  <tr>
                    <th>语义 Token</th>
                    <th>→ 基础 Token</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map(t => (
                    <tr key={t.token}>
                      <td><code>{t.token}</code></td>
                      <td><code style={{ color: '#059669' }}>{t.baseToken}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CollapsibleCard>
          ))}
        </div>
      )}

      {tab === 'typography' && (
        <div className="card">
          <div className="card-body">
            <p className="description">字体 Token 绑定 Figma Text Style。</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>textStyleRef</th>
                  <th>名称候选</th>
                </tr>
              </thead>
              <tbody>
                {typographyTokens.map(t => (
                  <tr key={t.token}>
                    <td><code>{t.token}</code></td>
                    <td style={{ fontSize: 10, color: '#86909c' }}>{t.textStyleRef || '—'}</td>
                    <td style={{ fontSize: 11, color: '#4e5969' }}>
                      {t.nameCandidates?.slice(0, 2).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'componentBase' && (
        <div className="card">
          <div className="card-body">
            <p className="description">基础组件 Token 包含实际的 Figma Component Key。</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Figma Component Key</th>
                  <th>Aliases</th>
                </tr>
              </thead>
              <tbody>
                {baseComponentTokens.map(t => (
                  <tr key={t.token}>
                    <td><code>{t.token}</code></td>
                    <td style={{ fontSize: 10, color: '#86909c' }}><code>{t.componentKey}</code></td>
                    <td style={{ fontSize: 11, color: '#4e5969' }}>
                      {t.aliases?.join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


    </div>
  );
}

// ── Code-type Skills Catalog ──────────────────────────────────────────────────

// 层级 0：Utils / Helpers（纯函数工具，不暴露给 AI）
interface UtilDef {
  layer: 0;
  name: string;
  signature: string;
  file: string;
  description: string;
  canCallFigmaAPI: boolean;
}

// 层级 1：Tool / Action（AI 可调用的动作，via action.type）
interface ToolDef {
  layer: 1;
  actionType: string;
  file: string;
  description: string;
  calledSkill?: string;
}

// 层级 2：Skill（封装完整业务逻辑的代码单元）
interface SkillDef {
  layer: 2;
  name: string;
  signature: string;
  file: string;
  description: string;
  relatedComponents: string[];
}

const UTILS_DEFS: UtilDef[] = [
  {
    layer: 0,
    name: 'isObject',
    signature: 'isObject(value: unknown): value is Record<string, any>',
    file: 'engine/skills/block.helpers.ts',
    description: '判断值是否为非 null 对象，跨 Skill 共用。',
    canCallFigmaAPI: false,
  },
  {
    layer: 0,
    name: 'getBlockSource',
    signature: 'getBlockSource(payload: any): any | null',
    file: 'engine/skills/block.helpers.ts',
    description: '从 payload 中提取 block/schema/source 字段，统一入口标准化。',
    canCallFigmaAPI: false,
  },
  {
    layer: 0,
    name: 'toButtonFromItem',
    signature: 'toButtonFromItem(item: any, fallbackLabel: string, defaultVariant: string): any',
    file: 'engine/skills/block.helpers.ts',
    description: '将 payload 中的 action/button item 归一化为 button componentId 对象。',
    canCallFigmaAPI: false,
  },
  {
    layer: 0,
    name: 'buildHeaderSectionChildren',
    signature: 'buildHeaderSectionChildren(header: any): any[]',
    file: 'engine/skills/block.helpers.ts',
    description: '构建表单/区块头部（title + actions）的 children 列表。',
    canCallFigmaAPI: false,
  },
  {
    layer: 0,
    name: 'getSizeMetrics',
    signature: 'getSizeMetrics(componentId: string, size: string): SizeMetricDefinition | null',
    file: 'engine/skills/resolve/size.ts',
    description: '从 registry.runtime.sizeMetrics 读取组件尺寸规格，模糊匹配 size 参数。',
    canCallFigmaAPI: false,
  },
  {
    layer: 0,
    name: 'getSizeMetricsMap',
    signature: 'getSizeMetricsMap(componentId: string): Record<string, SizeMetricDefinition> | null',
    file: 'engine/skills/resolve/size.ts',
    description: '返回组件全量 sizeMetrics 映射表，供枚举所有尺寸选项使用。',
    canCallFigmaAPI: false,
  },
  {
    layer: 0,
    name: 'setFillWidth',
    signature: 'setFillWidth(node: SceneNode): void',
    file: 'engine/skills/resolve/layout.ts',
    description: '设置节点宽度为充满父容器（layoutGrow=1 + layoutSizingHorizontal=FILL）。',
    canCallFigmaAPI: true,
  },
  {
    layer: 0,
    name: 'setFixedWidth',
    signature: 'setFixedWidth(node: SceneNode, width: number): void',
    file: 'engine/skills/resolve/layout.ts',
    description: '设置节点固定宽度，兼容 resize + layoutSizingHorizontal=FIXED。',
    canCallFigmaAPI: true,
  },
  {
    layer: 0,
    name: 'applyColorVariable',
    signature: 'applyColorVariable(node: SceneNode, variableKey: string, fallbackHex: string): Promise<void>',
    file: 'engine/skills/resolve/color.ts',
    description: '将颜色 token 绑定到节点 fills。优先绑定 Figma 变量，失败时设置 fallback hex。',
    canCallFigmaAPI: true,
  },
  {
    layer: 0,
    name: 'applyStrokeColorVariable',
    signature: 'applyStrokeColorVariable(node: SceneNode, variableKey: string, fallbackHex: string): Promise<void>',
    file: 'engine/skills/resolve/color.ts',
    description: '将颜色 token 绑定到节点 strokes。同 applyColorVariable 但作用于描边。',
    canCallFigmaAPI: true,
  },
  {
    layer: 0,
    name: 'applyFigmaComponentProps',
    signature: 'applyFigmaComponentProps(instance: InstanceNode, componentId: string, params: Record<string, any>): void',
    file: 'code.ts',
    description: '通用属性应用函数（Step 6）。读 registry.figmaPropertySnapshot.propertyMap，通过 findInstanceComponentPropertyName 解析实际属性名，调用 setProperties()。取代各组件的硬编码属性名数组。',
    canCallFigmaAPI: true,
  },
];

const TOOLS_DEFS: ToolDef[] = [
  { layer: 1, actionType: 'draw_tabl / draw_table', file: 'App.tsx', description: '创建表格。Skill 负责解析 payload 并构建 schema，渲染引擎在 code.ts 中执行 Figma 节点操作。', calledSkill: 'buildTableComponentFromPayload' },
  { layer: 1, actionType: 'draw_form', file: 'App.tsx', description: '创建表单。Skill 负责解析 rows、控件类型、布局等参数，构建完整 scene 树。', calledSkill: 'buildFormComponentFromPayload' },
  { layer: 1, actionType: 'apply_scene', file: 'App.tsx', description: '提交通用 scene 树，渲染引擎递归创建节点。表格/表单以外的所有组件走此路径。', calledSkill: undefined },
  { layer: 1, actionType: 'create_node', file: 'App.tsx', description: '创建单个节点（frame / text / component）。', calledSkill: undefined },
  { layer: 1, actionType: 'read_specs', file: 'App.tsx', description: '读取组件规格（三层：index / params / runtime）。', calledSkill: undefined },
  { layer: 1, actionType: 'discover_component_props', file: 'App.tsx', description: '探测 Figma 组件属性并写入 registry.figmaPropertySnapshot。', calledSkill: undefined },
  { layer: 1, actionType: 'finish', file: 'App.tsx', description: '结束当前任务，触发收尾逻辑。', calledSkill: undefined },
];

const SKILLS_DEFS: SkillDef[] = [
  {
    layer: 2,
    name: 'buildFormComponentFromPayload',
    signature: 'buildFormComponentFromPayload(payload: any): any | null',
    file: 'engine/skills/form.skill.ts',
    description: 'draw_form 完整执行逻辑。解析 rows（字段行）、layout（纵/横）、footer.actions（按钮）等参数，构建 form scene 树（抽象结构，不调用 Figma API）。被 App.tsx 的 draw_form case handler 调用。',
    relatedComponents: ['form', 'form-field', 'input', 'select', 'checkbox', 'radio', 'switch'],
  },
  {
    layer: 2,
    name: 'buildTableComponentFromPayload',
    signature: 'buildTableComponentFromPayload(payload: any, options?: { minRowCount?: number }): any | null',
    file: 'engine/skills/table.skill.ts',
    description: 'draw_tabl 完整执行逻辑。解析 headers、rows、columnTypes（自动推断 StatusTag/Avatar/ActionText 等）、pagination/filter/tabs/buttonGroup 参数，构建 table scene 树（抽象结构，不调用 Figma API）。被 App.tsx 的 draw_tabl case handler 调用。',
    relatedComponents: ['table', 'table-column', 'table-header-cell', 'table-cell', 'table-cell-tag', 'table-cell-avatar', 'table-cell-action-text'],
  },
];

const LAYER_COLORS = {
  0: { bg: '#f0f7ff', color: '#1664ff', border: '#bdd3ff', label: 'Layer 0 — Utils' },
  1: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', label: 'Layer 1 — Tool' },
  2: { bg: '#fdf4ff', color: '#7c3aed', border: '#e9d5ff', label: 'Layer 2 — Skill' },
  3: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: 'Layer 3 — Agentic Recovery' },
};

// ── Layer 3: Skills / renderNotes ─────────────────────────────────────────────

function SkillsView() {
  const [tab, setTab] = useState<'four-layers' | 'rendernotes'>('four-layers');
  const allComponents = Object.values(COMPONENT_REGISTRY.components);
  const compsWithRenderNotes = allComponents.filter(c => (c as any).renderNotes);

  return (
    <div>
      <div className="layer-indicator layer-3">
        <div className="layer-dot" style={{ background: '#c05621' }} />
        <strong>执行层 — 四层概念</strong>
        <span style={{ color: '#9a3412' }}>Utils / Tool / Skill / Agentic Recovery（来自 NORTH_STAR.md §5）</span>
      </div>

      <div className="stats-bar">
        <div className="stat">
          <div className="stat-value" style={{ color: '#1664ff' }}>{UTILS_DEFS.length}</div>
          <div className="stat-label">E0 Utils</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#c2410c' }}>{TOOLS_DEFS.length}</div>
          <div className="stat-label">E1 Tools</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#7c3aed' }}>{SKILLS_DEFS.length}</div>
          <div className="stat-label">E2 Skills</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#059669' }}>{compsWithRenderNotes.length}</div>
          <div className="stat-label">E3 Agentic Recovery</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'four-layers' ? 'active' : ''}`} onClick={() => setTab('four-layers')}>
          E0–E3 执行层概念
        </div>
        <div className={`tab ${tab === 'rendernotes' ? 'active' : ''}`} onClick={() => setTab('rendernotes')}>
          E3 — renderNotes 详情（静态）
        </div>
      </div>

      {tab === 'four-layers' && (
        <div>
          {/* Layer 0 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 8, marginBottom: 12,
              background: LAYER_COLORS[0].bg, border: `1px solid ${LAYER_COLORS[0].border}`,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: LAYER_COLORS[0].color, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: LAYER_COLORS[0].color, fontSize: 13 }}>E0 — Utils / Helpers（工具函数）</div>
                <div style={{ fontSize: 11, color: '#4e5969', marginTop: 2 }}>
                  纯工具函数，不暴露给 AI。被 Skill 或 code.ts 内部调用。参数来自 registry / theme，不硬编码数字或颜色。
                  部分函数调用 Figma API（布局/颜色绑定），不可迁入纯 UI 线程。
                </div>
              </div>
            </div>

            {UTILS_DEFS.map(u => (
              <CollapsibleCard
                key={u.name}
                title={u.name}
                badge={u.file.split('/').pop()!}
                badgeColor={LAYER_COLORS[0].color}
                badgeBg={LAYER_COLORS[0].bg}
                defaultOpen={false}
              >
                <div className="section">
                  <div className="section-title">函数签名</div>
                  <pre style={{ fontSize: 11, background: '#f7f8fa', padding: 8, borderRadius: 4, margin: 0, overflow: 'auto' }}>
                    {u.signature}
                  </pre>
                </div>
                <div className="section">
                  <div className="section-title">说明</div>
                  <p style={{ fontSize: 12, color: '#4e5969', margin: 0 }}>{u.description}</p>
                </div>
                <div className="section" style={{ marginBottom: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <code style={{ fontSize: 11 }}>{u.file}</code>
                  {u.canCallFigmaAPI && (
                    <span className="tag" style={{ background: '#fff7ed', color: '#c2410c', fontSize: 10 }}>调用 Figma API</span>
                  )}
                </div>
              </CollapsibleCard>
            ))}
          </div>

          {/* Layer 1 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 8, marginBottom: 12,
              background: LAYER_COLORS[1].bg, border: `1px solid ${LAYER_COLORS[1].border}`,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: LAYER_COLORS[1].color, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: LAYER_COLORS[1].color, fontSize: 13 }}>E1 — Tool / Action（动作）</div>
                <div style={{ fontSize: 11, color: '#4e5969', marginTop: 2 }}>
                  AI 可调用的最小执行单元，via <code>action.type</code>。AI 触发，代码执行。
                  Tool 本身只做 dispatch，实际业务逻辑委托给 Skill。错误信息要对 AI 可读（语义化）。
                </div>
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>action.type</th>
                  <th>文件</th>
                  <th>调用的 Skill</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS_DEFS.map(t => (
                  <tr key={t.actionType}>
                    <td><code>{t.actionType}</code></td>
                    <td><span style={{ fontSize: 11, color: '#86909c' }}>{t.file}</span></td>
                    <td>
                      {t.calledSkill
                        ? <code style={{ color: '#7c3aed' }}>{t.calledSkill}()</code>
                        : <span className="empty">—（直接处理）</span>}
                    </td>
                    <td style={{ fontSize: 12, color: '#4e5969' }}>{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Layer 2 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 8, marginBottom: 12,
              background: LAYER_COLORS[2].bg, border: `1px solid ${LAYER_COLORS[2].border}`,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: LAYER_COLORS[2].color, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: LAYER_COLORS[2].color, fontSize: 13 }}>E2 — Skill（技能包）</div>
                <div style={{ fontSize: 11, color: '#4e5969', marginTop: 2 }}>
                  封装完整业务逻辑的代码单元。有语义名称，对应一类完整任务。被 Tool 的 case handler 调用，不直接暴露给 AI。
                  运行在 UI 线程（Iframe），只构造抽象 scene 树，<strong>不调用 Figma API</strong>。
                </div>
              </div>
            </div>

            {SKILLS_DEFS.map(s => (
              <CollapsibleCard
                key={s.name}
                title={s.name}
                badge={s.file.split('/').pop()!}
                badgeColor={LAYER_COLORS[2].color}
                badgeBg={LAYER_COLORS[2].bg}
                defaultOpen={true}
              >
                <div className="section">
                  <div className="section-title">函数签名</div>
                  <pre style={{ fontSize: 11, background: '#f7f8fa', padding: 8, borderRadius: 4, margin: 0, overflow: 'auto' }}>
                    {s.signature}
                  </pre>
                </div>
                <div className="section">
                  <div className="section-title">说明</div>
                  <p style={{ fontSize: 12, color: '#4e5969', margin: 0 }}>{s.description}</p>
                </div>
                <div className="section" style={{ marginBottom: 0 }}>
                  <div className="section-title">关联组件</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {s.relatedComponents.map(id => (
                      <span key={id} className="tag tag-optional">{id}</span>
                    ))}
                  </div>
                </div>
              </CollapsibleCard>
            ))}
          </div>

          {/* Layer 3 */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 8, marginBottom: 12,
              background: LAYER_COLORS[3].bg, border: `1px solid ${LAYER_COLORS[3].border}`,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: LAYER_COLORS[3].color, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: LAYER_COLORS[3].color, fontSize: 13 }}>E3 — Agentic Recovery（Agent 自愈）</div>
                <div style={{ fontSize: 11, color: '#4e5969', marginTop: 2 }}>
                  静态写入 registry.ts，编译时确定，运行时不变。AI 读取 Tool 返回的语义化错误 → 推理原因 → 重新调用 Tool 修复，形成 Reason + Act 循环。
                  启用条件：Tool 返回可读错误（"columnWidths 总和 600 ≠ 800，差值 200"）+ registry 各组件填充 <code>renderNotes.commonErrors</code>。
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="section-title" style={{ marginBottom: 8 }}>当前 renderNotes 覆盖情况</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allComponents.map(c => {
                    const hasNotes = !!(c as any).renderNotes;
                    const catColor = CATEGORY_COLORS[c.category] || '#86909c';
                    return (
                      <div key={c.id} style={{
                        padding: '3px 8px', borderRadius: 4, fontSize: 11,
                        background: hasNotes ? catColor + '1a' : '#f2f3f5',
                        color: hasNotes ? catColor : '#c9cdd4',
                        border: `1px solid ${hasNotes ? catColor + '44' : '#e5e8ef'}`,
                        fontWeight: hasNotes ? 600 : 400,
                      }}>
                        {c.id}
                        {hasNotes && <span style={{ marginLeft: 4, fontSize: 10 }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: '#86909c' }}>
                  有 renderNotes：{compsWithRenderNotes.length} 个 / 共 {allComponents.length} 个
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'rendernotes' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body">
              <p className="description" style={{ margin: 0 }}>
                <strong>renderNotes</strong> 存储在 registry 各组件的字段中，是 Layer 3 Agentic Recovery 的数据载体。
                AI 在生成组件前读取，了解 actionHint（用哪个动作）、paramRules（参数约束）、commonErrors（常见错误）。
                每次发现 AI 反复犯某个错，立刻写进 <code>commonErrors</code>，不在 App.tsx 加 if 判断。
              </p>
            </div>
          </div>

          {allComponents.filter(c => (c as any).renderNotes || c.prompts?.usage).map(comp => (
            <CollapsibleCard
              key={comp.id}
              title={`${comp.name}`}
              badge={comp.id}
              badgeColor="#4e5969"
              badgeBg="#f2f3f5"
              defaultOpen={false}
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span className="tag tag-category" style={{
                  background: (CATEGORY_COLORS[comp.category] || '#4e5969') + '1a',
                  color: CATEGORY_COLORS[comp.category] || '#4e5969',
                }}>
                  {comp.category}
                </span>
                <span className="tag" style={{
                  background: isFigmaLibraryComponent(comp) ? '#ede9fe' : '#e8f0ff',
                  color: isFigmaLibraryComponent(comp) ? '#7c3aed' : '#1664ff',
                }}>
                  {isFigmaLibraryComponent(comp) ? 'Figma Key 渲染' : '代码自绘'}
                </span>
              </div>

              {comp.prompts?.usage && (
                <div className="section">
                  <div className="section-title">AI 使用说明 (prompts.usage)</div>
                  <p style={{ fontSize: 12, color: '#4e5969', margin: 0 }}>{comp.prompts.usage}</p>
                </div>
              )}

              {(comp as any).renderNotes && (
                <div className="section">
                  <div className="section-title">renderNotes</div>
                  <div className="render-notes">
                    {(comp as any).renderNotes.actionHint && (
                      <div className="note-item"><strong>actionHint:</strong> {(comp as any).renderNotes.actionHint}</div>
                    )}
                    {(comp as any).renderNotes.paramRules?.map((r: string, i: number) => (
                      <div key={i} className="note-item">{r}</div>
                    ))}
                    {(comp as any).renderNotes.commonErrors?.map((e: string, i: number) => (
                      <div key={i} className="note-item" style={{ color: '#b45309' }}>⚠ {e}</div>
                    ))}
                    {(comp as any).renderNotes.agentHints?.map((h: string, i: number) => (
                      <div key={i} className="note-item" style={{ color: '#047857' }}>💡 {h}</div>
                    ))}
                  </div>
                </div>
              )}

              {comp.prompts?.examples && comp.prompts.examples.length > 0 && (
                <div className="section">
                  <div className="section-title">使用示例</div>
                  {comp.prompts.examples.map((ex, i) => (
                    <pre key={i} style={{ fontSize: 11, background: '#f7f8fa', padding: 8, borderRadius: 4, overflow: 'auto', whiteSpace: 'pre-wrap', margin: 0, marginBottom: 6 }}>
                      {ex}
                    </pre>
                  ))}
                </div>
              )}
            </CollapsibleCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

// Architecture diagram sub-components
function ArchBox({ label, sub, bg, border, color }: {
  label: string; sub?: string; bg: string; border: string; color: string;
}) {
  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 6,
      padding: '6px 10px', fontSize: 11, color, textAlign: 'center',
    }}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ArchArrow({ label, dir = 'down' }: { label?: string; dir?: 'down' | 'right' | 'left' }) {
  if (dir === 'right') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#86909c', fontSize: 10 }}>
        {label && <span>{label}</span>}
        <span style={{ fontSize: 14 }}>→</span>
      </div>
    );
  }
  if (dir === 'left') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#86909c', fontSize: 10 }}>
        <span style={{ fontSize: 14 }}>←</span>
        {label && <span>{label}</span>}
      </div>
    );
  }
  return (
    <div style={{ textAlign: 'center', color: '#86909c', lineHeight: 1, padding: '1px 0', fontSize: 11 }}>
      <div>↓</div>
      {label && <div style={{ fontSize: 10 }}>{label}</div>}
    </div>
  );
}

function ArchDivider({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      margin: '6px 0', color: '#86909c', fontSize: 10,
    }}>
      <div style={{ flex: 1, height: 1, borderTop: '1px dashed #d0d5dd' }} />
      <span style={{ whiteSpace: 'nowrap', fontStyle: 'italic' }}>{label}</span>
      <div style={{ flex: 1, height: 1, borderTop: '1px dashed #d0d5dd' }} />
    </div>
  );
}

function MetricsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      // 在本地开发时，如果没有部署到生产环境，你可以修改这里的 URL 指向你本地的 wrangler (通常是 http://127.0.0.1:8787)
      const WORKER_URL = 'https://figma-ui-agent-proxy.uhimiao-thu.workers.dev';
      const res = await fetch(`${WORKER_URL}/api/metrics`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) return <div style={{ padding: 24 }}>正在加载埋点数据...</div>;
  if (error) return <div style={{ padding: 24, color: 'red' }}>错误: {error} <button onClick={fetchMetrics} style={{marginLeft: 8, padding: '4px 8px'}}>重试</button></div>;
  if (!data) return null;

  return (
    <div className="section-card" style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: '#1d2129' }}>Agent 线上运行数据总览</h2>
        <button 
          onClick={fetchMetrics} 
          style={{ 
            padding: '8px 16px', 
            background: '#1664ff', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(22, 100, 255, 0.2)',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#0e52d6'}
          onMouseOut={(e) => e.currentTarget.style.background = '#1664ff'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          刷新数据
        </button>
      </div>

      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e6eb', padding: '32px', marginBottom: '40px', display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: '1', borderRight: '1px solid #e5e6eb', paddingRight: '24px' }}>
          <div style={{ fontSize: '14px', color: '#1d2129', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '16px', background: '#1d2129', borderRadius: '2px' }}></div>
            调用总量tokens
          </div>
          <div style={{ fontSize: '48px', fontWeight: 600, color: '#1d2129', lineHeight: 1 }}>
            {(data.totals.total_tokens || 0).toLocaleString()}
          </div>
        </div>
        
        <div style={{ flex: '1', borderRight: '1px solid #e5e6eb', padding: '0 24px' }}>
          <div style={{ fontSize: '14px', color: '#4e5969', marginBottom: '12px' }}>
            输入tokens
          </div>
          <div style={{ fontSize: '36px', fontWeight: 500, color: '#4e5969', lineHeight: 1 }}>
            {(data.totals.total_prompt_tokens || 0).toLocaleString()}
          </div>
        </div>
        
        <div style={{ flex: '1', borderRight: '1px solid #e5e6eb', padding: '0 24px' }}>
          <div style={{ fontSize: '14px', color: '#4e5969', marginBottom: '12px' }}>
            输出tokens
          </div>
          <div style={{ fontSize: '36px', fontWeight: 500, color: '#4e5969', lineHeight: 1 }}>
            {(data.totals.total_completion_tokens || 0).toLocaleString()}
          </div>
        </div>
        
        <div style={{ flex: '1', borderRight: '1px solid #e5e6eb', padding: '0 24px' }}>
          <div style={{ fontSize: '14px', color: '#4e5969', marginBottom: '12px' }}>
            对话次数
          </div>
          <div style={{ fontSize: '36px', fontWeight: 500, color: '#4e5969', lineHeight: 1 }}>
            {(data.totals.total_sessions || 0).toLocaleString()}
          </div>
        </div>

        <div style={{ flex: '1', paddingLeft: '24px' }}>
          <div style={{ fontSize: '14px', color: '#4e5969', marginBottom: '12px' }}>
            AI生成次数
          </div>
          <div style={{ fontSize: '36px', fontWeight: 500, color: '#4e5969', lineHeight: 1 }}>
            {(data.totals.total_generations || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1d2129', marginBottom: '16px' }}>近 30 天趋势</h3>
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e6eb', overflow: 'hidden', marginBottom: '40px' }}>
        <table className="props-table" style={{ margin: 0, width: '100%', border: 'none' }}>
          <thead>
            <tr>
              <th style={{ background: '#f7f8fa', padding: '12px 16px', fontWeight: 500, color: '#4e5969' }}>日期</th>
              <th style={{ background: '#f7f8fa', padding: '12px 16px', fontWeight: 500, color: '#4e5969' }}>对话数</th>
              <th style={{ background: '#f7f8fa', padding: '12px 16px', fontWeight: 500, color: '#4e5969' }}>生成数</th>
              <th style={{ background: '#f7f8fa', padding: '12px 16px', fontWeight: 500, color: '#4e5969' }}>消耗 Token</th>
            </tr>
          </thead>
          <tbody>
            {data.daily.map((day: any) => (
              <tr key={day.date} style={{ borderBottom: '1px solid #f2f3f5' }}>
                <td style={{ padding: '12px 16px', color: '#1d2129' }}>{day.date}</td>
                <td style={{ padding: '12px 16px', color: '#1d2129' }}>{day.daily_sessions}</td>
                <td style={{ padding: '12px 16px', color: '#1d2129' }}>{day.daily_generations}</td>
                <td style={{ padding: '12px 16px', color: '#1d2129' }}>{day.daily_tokens.toLocaleString()}</td>
              </tr>
            ))}
            {data.daily.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#86909c' }}>暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1d2129', marginBottom: '16px' }}>最新事件流 (Top 50)</h3>
      <div style={{ maxHeight: '500px', overflowY: 'auto', background: '#fff', border: '1px solid #e5e6eb', borderRadius: '8px' }}>
        <table className="props-table" style={{ border: 'none', margin: 0, width: '100%' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f7f8fa', zIndex: 1 }}>
            <tr>
              <th style={{ padding: '12px 16px', fontWeight: 500, color: '#4e5969', borderBottom: '1px solid #e5e6eb' }}>时间</th>
              <th style={{ padding: '12px 16px', fontWeight: 500, color: '#4e5969', borderBottom: '1px solid #e5e6eb' }}>用户</th>
              <th style={{ padding: '12px 16px', fontWeight: 500, color: '#4e5969', borderBottom: '1px solid #e5e6eb' }}>事件类型</th>
              <th style={{ padding: '12px 16px', fontWeight: 500, color: '#4e5969', borderBottom: '1px solid #e5e6eb' }}>详情 (JSON)</th>
            </tr>
          </thead>
          <tbody>
            {data.recent.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f2f3f5' }}>
                <td style={{ whiteSpace: 'nowrap', padding: '12px 16px', color: '#86909c', fontSize: '13px' }}>
                  {new Date(item.created_at).toLocaleString()}
                </td>
                <td style={{ padding: '12px 16px', color: '#1d2129' }}>{item.user_id}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span className="tag" style={{ 
                    background: item.event_type === 'ai_generation' ? '#e8f3ff' : item.event_type === 'chat_start' ? '#e8ffea' : '#f2f3f5',
                    color: item.event_type === 'ai_generation' ? '#1664ff' : item.event_type === 'chat_start' ? '#00b42a' : '#4e5969',
                    border: 'none',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {item.event_type}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ 
                    background: '#f7f8fa', 
                    padding: '8px 12px', 
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#4e5969',
                    maxHeight: '60px',
                    overflowY: 'auto',
                    wordBreak: 'break-all'
                  }} title={item.details}>
                    {item.details}
                  </div>
                </td>
              </tr>
            ))}
            {data.recent.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#86909c' }}>暂无事件记录</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OverviewView() {
  const allComponents = Object.values(COMPONENT_REGISTRY.components);
  const cats: Record<string, number> = {};
  for (const c of allComponents) cats[c.category] = (cats[c.category] || 0) + 1;

  return (
    <div>
      {/* Stats */}
      <div className="stats-bar" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="stat">
          <div className="stat-value">{allComponents.length}</div>
          <div className="stat-label">注册组件</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#1664ff' }}>
            {allComponents.filter(c => !isFigmaLibraryComponent(c)).length}
          </div>
          <div className="stat-label">代码自绘</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#7c3aed' }}>
            {allComponents.filter(c => isFigmaLibraryComponent(c)).length}
          </div>
          <div className="stat-label">Figma Key 渲染</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#059669' }}>
            {Object.keys(BASE_COLOR_TOKEN_PACK).length + Object.keys(SEMANTIC_COLOR_TOKEN_PACK).length}
          </div>
          <div className="stat-label">颜色 Token</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: '#d97706' }}>
            {Object.keys(BASE_TYPOGRAPHY_TOKEN_PACK).length}
          </div>
          <div className="stat-label">字体 Token</div>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-body" style={{ padding: '20px 24px' }}>
          <div className="section-title" style={{ marginBottom: 4 }}>完整架构图</div>
          <div style={{ fontSize: 11, color: '#86909c', marginBottom: 20 }}>
            一句话：设计师说需求 → AI 读规范 → 生成指令 → 引擎执行 → Figma 画布落地
          </div>

          {/* ── 第一层：对话 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr 40px 1fr', alignItems: 'stretch', gap: 0, marginBottom: 6 }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#f9fafb', border: '1.5px solid #d0d5dd', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>👤</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1d2129' }}>设计师</div>
              <div style={{ fontSize: 10, color: '#86909c', marginTop: 2 }}>用自然语言描述需求</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#d0d5dd' }}>⇆</div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#fef3c7', border: '1.5px solid #fbbf24', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>🤖</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>VED UI Agent</div>
              <div style={{ fontSize: 10, color: '#92400e', marginTop: 2, opacity: 0.8 }}>理解需求，规划步骤，调用工具</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#86909c', lineHeight: 1.4, textAlign: 'center' }}>读<br/>规范</div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#eef2ff', border: '1.5px solid #c7d2fe', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#3730a3', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                规范库（只读）
              </div>
              <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                <div style={{ flex: 1, background: '#e8f0ff', border: '1px solid #93c5fd', borderRadius: 6, padding: '6px 8px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#1e40af', marginBottom: 2 }}>Layer 1 — 组件规范</div>
                  <div style={{ fontSize: 9, color: '#3b82f6', lineHeight: 1.5 }}>
                    每个组件「是什么」<br/>
                    参数定义 / 尺寸规格<br/>
                    AI 可读的渲染注意事项
                  </div>
                </div>
                <div style={{ flex: 1, background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 6, padding: '6px 8px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#065f46', marginBottom: 2 }}>Layer 2 — 主题</div>
                  <div style={{ fontSize: 9, color: '#047857', lineHeight: 1.5 }}>
                    「用哪套视觉」<br/>
                    颜色 / 间距 token<br/>
                    Figma 组件 key
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 箭头：AI 输出指令 ── */}
          <div style={{ textAlign: 'center', padding: '2px 0 6px', color: '#86909c', fontSize: 10 }}>
            <span style={{ fontSize: 14 }}>↓</span>　AI 输出结构化指令（draw_table / draw_form / apply_scene …）
          </div>

          {/* ── 第二层：执行层 ── */}
          <div style={{
            border: '1.5px solid #fed7aa', borderRadius: 8,
            background: '#fff7ed', padding: '12px 14px', marginBottom: 6,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9a3412', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              执行层（Layer 3）— AI 指令在这里被翻译成 Figma 操作
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', gap: 6, alignItems: 'start' }}>
              {/* 左：对外接口 */}
              <div style={{ border: '1px solid #a7f3d0', borderRadius: 6, padding: '8px 10px', background: '#ecfdf5' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#065f46', marginBottom: 6 }}>
                  🔌 对外接口（AI 可调用）
                </div>
                <div style={{ fontSize: 10, color: '#047857', lineHeight: 1.7 }}>
                  <div><strong>draw_table</strong> — 创建表格</div>
                  <div><strong>draw_form</strong> — 创建表单</div>
                  <div><strong>apply_scene</strong> — 提交节点树</div>
                  <div><strong>read_specs</strong> — 读取组件规范</div>
                  <div><strong>create_node</strong> — 创建单个节点</div>
                </div>
                <div style={{ marginTop: 6, fontSize: 9, color: '#6ee7b7' }}>App.tsx action dispatch</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#86909c', paddingTop: 20 }}>→</div>
              {/* 右：内部执行 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ border: '1px solid #c4b5fd', borderRadius: 6, padding: '8px 10px', background: '#f5f3ff' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#4c1d95', marginBottom: 4 }}>
                    ⚙️ 技能包（Skill）
                  </div>
                  <div style={{ fontSize: 9, color: '#5b21b6', lineHeight: 1.5 }}>
                    封装完整业务逻辑，读规范、组装节点结构<br/>
                    <span style={{ opacity: 0.7 }}>form.skill.ts · table.skill.ts</span>
                  </div>
                </div>
                <div style={{ border: '1px solid #bfdbfe', borderRadius: 6, padding: '8px 10px', background: '#eff6ff' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>
                    🔧 工具函数（Utils）
                  </div>
                  <div style={{ fontSize: 9, color: '#1e40af', lineHeight: 1.5 }}>
                    解析尺寸 / 应用颜色变量 / 设置布局<br/>
                    <span style={{ opacity: 0.7 }}>resolve/size · color · layout</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 箭头：跨线程 ── */}
          <ArchDivider label="── Figma Plugin 线程边界  ·  上方 UI thread（网页环境）/ 下方 main thread（Figma 沙盒）──" />

          {/* ── 第三层：主线程 ── */}
          <div style={{
            border: '1.5px solid #d1d5db', borderRadius: 8,
            background: '#f9fafb', padding: '12px 14px', marginBottom: 6,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              主线程（code.ts）— 唯一能直接操作 Figma 的地方
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr 28px 1fr', gap: 4, alignItems: 'center' }}>
              <div style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '7px 10px', background: '#fff', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginBottom: 2 }}>operationExecutor</div>
                <div style={{ fontSize: 9, color: '#6b7280' }}>接收指令，分发给对应处理器</div>
              </div>
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>→</div>
              <div style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '7px 10px', background: '#fff', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginBottom: 2 }}>renderSceneNode</div>
                <div style={{ fontSize: 9, color: '#6b7280' }}>把节点结构树递归渲染成 Figma 节点</div>
              </div>
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>→</div>
              <div style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '7px 10px', background: '#fff', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginBottom: 2 }}>applyFigmaComponentProps</div>
                <div style={{ fontSize: 9, color: '#6b7280' }}>按 propertyMap 给实例设置属性</div>
              </div>
            </div>
          </div>

          {/* ── 箭头 ── */}
          <div style={{ textAlign: 'center', padding: '2px 0 6px', color: '#86909c', fontSize: 10 }}>
            <span style={{ fontSize: 14 }}>↓</span>　createFrame / createInstance / setProperties …
          </div>

          {/* ── 底层：Figma 画布 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>🎨</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#065f46', marginBottom: 2 }}>代码自绘</div>
              <div style={{ fontSize: 9, color: '#047857', lineHeight: 1.5 }}>
                由代码从零构建节点树<br/>
                table / form / layout 等复杂结构
              </div>
            </div>
            <div style={{ background: '#ede9fe', border: '1.5px solid #c4b5fd', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>🧩</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#4c1d95', marginBottom: 2 }}>Figma 组件库实例</div>
              <div style={{ fontSize: 9, color: '#5b21b6', lineHeight: 1.5 }}>
                通过 componentKey 导入设计系统组件<br/>
                button / tag / icon / input 等
              </div>
            </div>
          </div>

          {/* ── 底注 ── */}
          <div style={{ marginTop: 12, fontSize: 9, color: '#86909c', textAlign: 'center', lineHeight: 1.6 }}>
            规范库（Layer 1 + 2）被 AI 和执行层同时读取，但不参与运行时执行，只提供"规则"和"数值"。
          </div>
        </div>
      </div>

      {/* 两种渲染方式说明 */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-body">
          <div className="section-title" style={{ marginBottom: 12 }}>两种渲染方式</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, fontSize: 12, color: '#065f46' }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>🎨 代码自绘（Custom Component）</div>
              <div style={{ fontSize: 11, lineHeight: 1.7, color: '#047857' }}>
                渲染引擎用 Figma API 从零构建节点树，完全按 registry 规范执行。
                <br/>适用于：<strong>form · table · layout</strong> 等复杂结构组件。
              </div>
            </div>
            <div style={{ padding: '10px 14px', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 8, fontSize: 12, color: '#4c1d95' }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>🧩 Figma Key 渲染（Figma Library Component）</div>
              <div style={{ fontSize: 11, lineHeight: 1.7, color: '#5b21b6' }}>
                通过 componentKey 导入设计系统实例，再按 propertyMap 设置 variant 属性。
                <br/>适用于：<strong>button · tag · input · icon</strong> 等设计系统组件。
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Component category bar chart */}
      <div className="card">
        <div className="card-body">
          <div className="section-title" style={{ marginBottom: 12 }}>组件分类</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', minWidth: 100 }}>
                <div style={{
                  width: `${(count / allComponents.length) * 80}px`,
                  height: 16, borderRadius: 4,
                  background: (CATEGORY_COLORS[cat] || '#86909c') + '33',
                  border: `1px solid ${CATEGORY_COLORS[cat] || '#86909c'}44`,
                  marginRight: 6,
                }} />
                <span style={{ fontSize: 12, color: CATEGORY_COLORS[cat] || '#4e5969', fontWeight: 500 }}>
                  {cat}
                </span>
                <span style={{ fontSize: 11, color: '#86909c', marginLeft: 4 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Prompt View ───────────────────────────────────────────────────────────────

const PROMPT_SECTIONS = [
  {
    id: 'identity',
    title: '身份 & 组件索引',
    color: '#1664ff',
    content: `你是一个高级 Figma 助手 (Agent)。你的任务是根据用户需求，逐步构建 Figma 组件树。

由于组件库很大，你不能一次性获取所有组件的详细文档。你需要通过"工具调用"的方式来获取所需组件的详细信息，然后逐步创建组件。

可用组件列表 (Component Index): [动态生成，包含所有已启用组件的 id 和 description]`,
  },
  {
    id: 'workflow',
    title: '工作流 (Workflow)',
    color: '#059669',
    content: `1. 若用户输入包含"图表"等明确组件关键词，直接调用 read_specs 获取对应组件信息。
   ⚠️ 例外：创建表格（Table）时，直接使用 draw_table，无需读取 spec。
   ⚠️ 例外：创建表单（Form）时，直接使用 draw_form，无需读取 spec。

2. 其他情况先分析用户需求，必须从 Component Index 里选择可用组件，再决定需要使用哪些组件。
   - 必须调用 read_specs([id1, id2...]) 获取组件的详细参数定义和结构要求。
   - 例外：表格组件（table/table-column等）无需读取 spec，直接使用 draw_table。
   - 禁止在未读取 spec 的情况下直接猜测组件参数（表格除外）。
   - 已读取过的组件 spec 不要重复调用 read_specs，直接复用已有上下文。
   - 当要复用 Figma 设计系统组件时，先 read_specs(["figma-component"]) 获取 ComponentTokenCatalog。
   - 若需要给 figma-component 传 variantCriteria，先调用 discover_component_props 探测目标 token 的真实可设置属性。
   - 如果未探测到属性，先只摆放组件本体（componentToken），不要猜测属性名。
   - 禁止臆造 componentKey；只有 token 不可用时再回退 componentKey。
   - 对于 boolean 参数，不要显式输出默认值；仅当用户强行指定时才写入 true/false。
   - 对于 figma-component，不要输出 width/height，除非用户明确要求尺寸。

3. 表格创建优先走 draw_table(payload)（不要输出冗长 table 子树）。
4. 标准表单/筛选表单创建优先走 draw_form(payload)。
5. 当需要复刻设计系统组件内部结构时，先调用 inspect_component_structure 获取内部层级。
6. 对于非表格复杂结构或增量编辑，优先调用 apply_scene(payload)。
7. 当你只需要创建一个简单节点时，也可以调用 create_node(componentId, params, parentId?, children?)。
8. 只有当必须依赖父节点 ID 且无法一次性构建时，才分步执行。
9. 当任务包含多区块下钻，必须先建立外部计划队列（set_plan / plan_next / update_plan）。
10. 不要依赖你自己的记忆来追踪待办，下钻待办以系统计划队列为准。
11. 系统在复杂请求时可能自动初始化计划队列（auto plan）。
12. 对于已知任务类型，优先调用 execute_task(payload)（或 run_task）让系统按 task.type 执行。
    - 仅支持 task.type: create_shell / expand_table_block / expand_form_block / expand_chart_block / expand_tabs_block。
13. 用户当前轮消息可能包含"用户提供内容"摘要、表格结构(JSON)和图片附件。`,
  },
  {
    id: 'table',
    title: 'draw_table 详细规则',
    color: '#7c3aed',
    content: `payload 使用紧凑结构，例如：
{
  "headers": ["姓名", "年龄", "城市"],
  "rows": [["张三", "28", "北京"], ["李四", "32", "上海"]],
  "columnTypes": ["Text", "Text", "Text"],
  "tabs": ["全部", "进行中"],
  "filters": ["状态", "城市", "关键词"],
  "buttonGroup": { "primaryText": "新建", "secondaryText": "导出" },
  "pagination": true,
  "rowHeight": { "header": 40, "body": 40 }
}

- 若表格存在"多选/勾选/选择列"，在 payload 顶层加入 "rowAction": "multiple"。
- 单选列请使用 "rowAction": "single"。
- 不要把勾选列写进 headers/rows/columnTypes。
- 标签列（Tag）分为 StatusTag（状态）和 TypeTag（类型/分类）。
  - StatusTag 示例: { "text": "启用", "statusTheme": "Success 成功" }
  - TypeTag 示例: { "text": "企业", "tagType": "Outline 线型标签" }
- 若表格包含操作列特征（表头为"操作/Action/Actions"，或单元格包含编辑/删除等动词），columnTypes 设为 "ActionText" 或 "ActionIcon"。
- draw_table 与 draw_tabl 等价；为兼容旧接口，优先使用 draw_tabl。
- draw_table payload 禁止包含 nodeId/componentId/props/children。`,
  },
  {
    id: 'form',
    title: 'draw_form 详细规则',
    color: '#c05621',
    content: `payload 使用紧凑结构，例如：
{
  "align": "top",
  "labelWidthPreset": "fill",
  "rows": [
    [{ "componentId": "input", "label": "姓名", "props": { "placeholder": "请输入姓名" } }],
    [{ "componentId": "select", "label": "城市", "props": { "value": "请选择" } }]
  ]
}

- 默认优先每行一个字段（单列）：除非用户明确要求"双列/多列"，否则 rows 的每个子数组只放 1 个字段。
- 当根据图片生成表单时，必须输出图片中所有字段。
- 图片场景禁止只输出 fields：必须输出 rows[][] 以保证多行字段被逐行渲染。
- 字段类型不确定时优先用 input，有明确选项/状态时再用 select / checkbox-group / radio-group / switch。
- rows 内 componentId 可使用 input / select / checkbox-group / radio-group / button，也可继续挂 figma-component。
- 若参考图里出现标准复选框/单选框/开关/勾选列表，不要手工画 vector/svg/path/text 勾号。
- 多选项优先使用 checkbox-group；若是零散多选项行，也可以直接组合多个 checkbox。`,
  },
  {
    id: 'plan',
    title: '计划队列规则',
    color: '#0891b2',
    content: `当任务包含多区块下钻（如：页面 + 表格区 + 图表区 + 表单区），必须先建立外部计划队列：

- set_plan(payload): 初始化任务清单（pending/in_progress/done/failed）。
- plan_next(payload): 让系统返回下一个可执行任务（考虑 dependsOn）。
- update_plan(payload): 更新任务状态，可追加新下钻任务。
  - 状态更新：payload.updates=[{taskId,status,notes?}]
  - 追加任务：payload.addTasks=[...]（兼容 appendTasks / tasks）
- 执行中的动作尽量带 taskId（action.taskId 或 action.payload.taskId）。
- 对于已知任务类型，优先调用 execute_task(payload)。
  - 仅支持 task.type: create_shell / expand_table_block / expand_form_block / expand_chart_block / expand_tabs_block
  - 禁止使用未实现类型（如 expand_header_block / expand_actions_block）
  - 表格+筛选器/分页器请求（单区块）不要 set_plan，直接 draw_tabl 带参数即可`,
  },
  {
    id: 'format',
    title: '回复格式 (Response Format)',
    color: '#374151',
    content: `只回复一个 JSON 对象，包含 "thought" 和 "action"。

- "thought" 必须极短，优先 4-12 个汉字或等价短语。
- 不要复述用户需求，不要写"首先/现在/已获取/成功/需要"等空话。
- 用动作短语即可，例如：读input spec / 建基础input / 结束。
- 优先输出紧凑 JSON；不要使用 Markdown code block，不要输出 JSON 之外的解释。

重要限制：
- 创建新表格时优先 draw_table，避免输出冗长 table 子树。
- 新建表格时不要使用 apply_scene，直接 draw_table/draw_tabl。
- 多区块复杂任务必须先 set_plan，并通过 plan_next / update_plan 驱动执行。
- 复杂结构优先用 apply_scene，一次提交完整 scene 或 patch。
- 简单创建可用 create_node。
- 每次只执行一个动作。
- "thought" 只保留当前动作意图，越短越好。
- 如果所有步骤都已完成，调用 { "type": "finish" }。`,
  },
];

function PromptView() {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(['identity', 'workflow']));
  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const expandAll = () => setExpanded(new Set(PROMPT_SECTIONS.map(s => s.id)));
  const collapseAll = () => setExpanded(new Set());

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, fontSize: 12, color: '#86909c' }}>
          Runtime AI 收到的 system prompt — 由 <code>generateMasterPrompt()</code> 动态生成（组件索引部分随 registry 变化）
        </div>
        <button
          onClick={expandAll}
          style={{ fontSize: 11, padding: '3px 8px', border: '1px solid #e5e8ef', borderRadius: 4, cursor: 'pointer', background: '#fff', color: '#4e5969' }}
        >
          全部展开
        </button>
        <button
          onClick={collapseAll}
          style={{ fontSize: 11, padding: '3px 8px', border: '1px solid #e5e8ef', borderRadius: 4, cursor: 'pointer', background: '#fff', color: '#4e5969' }}
        >
          全部折叠
        </button>
      </div>

      {PROMPT_SECTIONS.map(section => {
        const open = expanded.has(section.id);
        return (
          <div key={section.id} className="card">
            <div className="card-header" onClick={() => toggle(section.id)}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: section.color, flexShrink: 0 }} />
              <h3 style={{ fontSize: 13 }}>{section.title}</h3>
              <span className="chevron" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
            </div>
            {open && (
              <div style={{ padding: '12px 16px' }}>
                <pre style={{
                  margin: 0,
                  fontFamily: 'Menlo, Monaco, Consolas, monospace',
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: '#1d2129',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: '#f8f9fc',
                  border: '1px solid #eef0f5',
                  borderRadius: 6,
                  padding: '10px 12px',
                }}>
                  {section.content}
                </pre>
              </div>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 16, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#92400e', lineHeight: 1.6 }}>
        <strong>注意：</strong>上方内容为静态展示，组件索引部分（身份 & 组件索引）会随 registry 启用状态动态变化。
        修改规则请直接编辑 <code>src/App.tsx</code> 中的 <code>generateMasterPrompt()</code> 函数。
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

type NavPage = 'overview' | 'registry' | 'theme' | 'skills' | 'prompt' | 'metrics';

const NAV_ITEMS: { id: NavPage; label: string; dot: string; desc: string }[] = [
  { id: 'overview', label: '总览', dot: '#1d2129', desc: '项目架构概览' },
  { id: 'registry', label: 'Layer 1 — 组件规范', dot: '#1664ff', desc: 'registry.ts' },
  { id: 'theme', label: 'Layer 2 — 主题包', dot: '#059669', desc: 'theme.*.ts' },
  { id: 'skills', label: 'Layer 3 — 技能包', dot: '#c05621', desc: 'renderNotes & skills' },
  { id: 'prompt', label: 'System Prompt', dot: '#7c3aed', desc: 'generateMasterPrompt()' },
  { id: 'metrics', label: '埋点数据观测', dot: '#eab308', desc: 'Agent 线上运行数据' },
];

export default function AdminApp() {
  const [page, setPage] = useState<NavPage>('overview');
  const current = NAV_ITEMS.find(n => n.id === page)!;

  const pageComponents: Record<NavPage, React.ReactNode> = {
    overview: <OverviewView />,
    registry: <RegistryView />,
    theme: <ThemeView />,
    skills: <SkillsView />,
    prompt: <PromptView />,
    metrics: <MetricsView />,
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="admin-layout">
        <div className="sidebar">
          <div className="sidebar-header">
            <h1>Figma UI Agent</h1>
            <p>规范管理台</p>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-section">
              <div className="nav-section-title">导航</div>
              {NAV_ITEMS.map(item => (
                <div
                  key={item.id}
                  className={`nav-item ${page === item.id ? 'active' : ''}`}
                  onClick={() => setPage(item.id)}
                >
                  <div className="dot" style={{ background: item.dot }} />
                  <div>
                    <div>{item.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </nav>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e8ef', fontSize: 10, color: '#86909c' }}>
            数据来自 registry.ts & theme.*.ts<br />
            实时读取，无需手动同步
          </div>
        </div>

        <div className="main">
          <div className="main-header">
            <div>
              <div className="breadcrumb">
                Figma UI Agent / <span>{current.label}</span>
              </div>
              <h2 style={{ marginTop: 2 }}>{current.label}</h2>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: '#86909c', textAlign: 'right' }}>
              实时读取注册表数据<br />
              最后更新: {COMPONENT_REGISTRY.meta?.updatedAt || '—'}
            </div>
          </div>

          <div className="main-content">
            {pageComponents[page]}
          </div>
        </div>
      </div>
    </>
  );
}
