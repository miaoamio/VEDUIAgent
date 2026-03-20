import * as React from 'react';
import CP_EXCEL_BUNDLE_SOURCE from 'codepage/dist/cpexcel.full.js?raw';
import XLSX_BUNDLE_SOURCE from 'xlsx/dist/xlsx.full.min.js?raw';
import AI_CHART_UI_HTML from './ai-chart-ui.html?raw';
import ECHARTS_BUNDLE_SOURCE from 'echarts/dist/echarts.min.js?raw';
import { COMPONENT_REGISTRY } from './registry';
import { loadRegistry } from './registry.loader';
import { ComponentDefinition, ParamDefinition } from './registry.types';
import {
  FULL_RERENDER_COMPONENT_IDS,
  GENERIC_EDITABLE_PARAM_KEYS,
  COMPONENT_EDITABLE_PARAM_KEYS,
  GENERATION_ONLY_PARAM_KEYS
} from './editability';
import {
  ColorControl,
  FieldRow,
  NumberInputControl,
  SegmentedControl,
  SelectControl,
  SwitchControl,
  TextInputControl
} from './ui/PropertyControls';
import { Tooltip } from './ui/Tooltip';
import { BASE_COLOR_TOKEN_PACK, SEMANTIC_COLOR_TOKEN_PACK } from './theme.color-tokens';
import { BASE_TYPOGRAPHY_TOKEN_PACK, SEMANTIC_TYPOGRAPHY_TOKEN_PACK } from './theme.typography-tokens';
import { BASE_COMPONENT_TOKEN_PACK, SEMANTIC_COMPONENT_TOKEN_PACK } from './theme.component-tokens';
import { SPEC_COMPONENT_TOKEN_MAP } from './spec.component-token-map';
import { parseVariantCriteria } from './figmaComponent';

const COMPONENT_DEFS = COMPONENT_REGISTRY.components;
const isEnabledComponent = (def: ComponentDefinition) => (
  def.id === 'figma-component' || !def.figmaPropertySnapshot
);
const BASE_COMPONENT_KEY_TO_NAME = Object.values(BASE_COMPONENT_TOKEN_PACK).reduce((acc, item) => {
  const key = typeof item?.componentKey === 'string' ? item.componentKey.trim() : '';
  if (key) {
    acc[key] = String(item?.displayName || key);
  }
  return acc;
}, {} as Record<string, string>);

type PlanTaskStatus = 'pending' | 'in_progress' | 'done' | 'failed' | 'blocked';

interface PlanTask {
  taskId: string;
  title: string;
  type: string;
  targetNodeId?: string;
  dependsOn: string[];
  requiredSpecs: string[];
  status: PlanTaskStatus;
  retries: number;
  notes?: string;
}

interface AgentPlanState {
  planId: string;
  rootGoal: string;
  tasks: PlanTask[];
  createdAt: string;
  updatedAt: string;
}

const TASK_MAX_RETRIES = 2;
const MAX_VARIANTS_IN_STRUCTURE_JSON = 4;
const MAX_EXPAND_DEPTH_IN_STRUCTURE_JSON = 2;
const MAX_CHILD_SUMMARY_ITEMS = 6;
const MAX_TABLE_PREVIEW_CHARS = 200;
const MAX_TABLE_CONTEXT_ROWS = 10;
const MAX_ATTACHMENT_IMAGES_PER_TURN = 4;
const STREAM_TABLE_PREFIX = '@@table_stream';
const TABLE_SPEC_IDS = ['table', 'table-column', 'table-header-cell', 'table-cell'];
const TABLE_PROMPT_REGEX = /(表格|table)/i;

type XlsxWorkbook = {
  SheetNames: string[];
  Sheets: Record<string, unknown>;
};

type XlsxParser = {
  read: (data: Uint8Array, options: { type: 'array' }) => XlsxWorkbook;
  set_cptable?: (cptable: unknown) => void;
  cptable?: unknown;
  utils: {
    sheet_to_json: (
      sheet: unknown,
      options: { header: 1; defval: string; raw: false }
    ) => unknown[];
  };
};

declare global {
  interface Window {
    XLSX?: XlsxParser;
    cptable?: unknown;
  }
}

type UploadedImageAttachment = {
  id: string;
  name: string;
  dataUrl: string;
  source: 'upload' | 'paste';
  size: number;
};

type UploadedTableAttachment = {
  id: string;
  name: string;
  kind: 'csv' | 'tsv' | 'xlsx' | 'xls' | 'unknown';
  headers: string[];
  rows: string[][];
  previewLines: string[];
  summary: string;
  size: number;
  parseError?: string;
};

type StreamTableEvent =
  | {
      event: 'table_start';
      headers: string[];
      rows?: any[][];
      columnTypes?: string[];
      columnWidths?: number[];
      rowHeight?: { header?: number; body?: number };
    }
  | { event: 'table_row'; row: any[] }
  | { event: 'table_done' };

type StreamTableState = {
  tableId: string;
  headers: string[];
  rows: any[][];
  columnTypes: string[];
  columnWidths: number[];
  rowHeight: { header?: number; body?: number };
  columnNodeIds: string[];
  rowCount: number;
  parentId?: string;
};

function createLocalAttachmentId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clampPreview(text: string, maxLength = MAX_TABLE_PREVIEW_CHARS): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function normalizeDisplayText(value: string): string {
  return String(value || '').replace(/\\n/g, '\n');
}

function normalizeSpecKind(raw: string): string {
  const rawKind = String(raw || '').trim();
  const lowered = rawKind.toLowerCase();
  if (lowered === 'table') return '表格';
  if (lowered === 'form') return '表单';
  if (lowered === 'chart') return '图表';
  return rawKind;
}

function toSeriesSpecText(raw: string, redo = false): string {
  const kind = normalizeSpecKind(raw);
  return `${redo ? '重新读取' : '读取'}${kind}规范`;
}

type AiDisplayItem = {
  kind: 'thought' | 'text';
  text: string;
};

function parseSeriesSpecLine(text: string): { kind: string; redo: boolean } | null {
  const normalized = String(text || '').trim();
  let match = normalized.match(/^(重新)?读取\s*(.+?)\s*规范$/);
  if (!match) {
    match = normalized.match(/^(重新)?读取\s*(.+?)\s*系列组件的规格说明$/);
  }
  if (!match) return null;
  const kind = String(match[2] || '').trim();
  if (!kind) return null;
  return { kind: normalizeSpecKind(kind), redo: Boolean(match[1]) };
}

function formatSeriesSpecLine(kind: string, redo: boolean): string {
  return toSeriesSpecText(kind, redo);
}

function normalizeComponentSpecLine(text: string): string {
  const normalized = String(text || '').trim();
  const existing = parseSeriesSpecLine(normalized);
  if (existing) return formatSeriesSpecLine(existing.kind, existing.redo);
  const componentSpecMatch = normalized.match(/^(重新)?读(?:取)?\s*(.+?)\s*(?:组件)?\s*spec\b/i);
  if (componentSpecMatch) {
    return toSeriesSpecText(componentSpecMatch[2], Boolean(componentSpecMatch[1]));
  }
  const legacySpecMatch = normalized.match(/^读\s*(表格|表单|图表|table|form|chart)\s*系列spec$/i);
  if (legacySpecMatch) return toSeriesSpecText(legacySpecMatch[1]);
  return text;
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3.5 5.75L7 9.25L10.5 5.75"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type UiMessage = {
  role: 'user' | 'ai';
  content: string;
  images?: UploadedImageAttachment[];
  tables?: UploadedTableAttachment[];
};

function UserMessageBubble({
  content,
  images = [],
  tables = []
}: {
  content: string;
  images?: UploadedImageAttachment[];
  tables?: UploadedTableAttachment[];
}) {
  const textRef = React.useRef<HTMLParagraphElement | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [hasOverflow, setHasOverflow] = React.useState(false);
  const hasAttachments = images.length > 0 || tables.length > 0;

  React.useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const maxHeight = 200;
    setHasOverflow(el.scrollHeight > maxHeight + 1);
  }, [content]);

  return (
    <div
      className={`user-bubble ${hasOverflow ? 'has-overflow' : ''} ${expanded ? 'expanded' : 'collapsed'} ${hasAttachments ? 'has-attachments' : ''}`}
    >
      <div className="user-bubble-content">
        <div className="user-bubble-text-wrap">
          <p ref={textRef} className="user-bubble-text">
            {normalizeDisplayText(content)}
          </p>
          {hasOverflow && !expanded && <div className="user-bubble-fade" />}
        </div>
        {hasOverflow && (
          <button
            type="button"
            className="user-bubble-expand"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <ChevronUpIcon className={`user-bubble-expand-icon ${expanded ? 'expanded' : ''}`} />
            <span className="user-bubble-expand-text">{expanded ? '收起' : '展开'}</span>
          </button>
        )}
      </div>
      {hasAttachments && (
        <div className="user-bubble-attachments">
          <div className="user-attachment-title">附件</div>
          <div className="user-attachment-grid">
            {images.map((image) => (
              <div key={image.id} className="user-attachment-card image">
                <img className="user-attachment-thumb" src={image.dataUrl} alt={image.name} />
                <div className="user-attachment-name">{image.name}</div>
              </div>
            ))}
            {tables.map((table) => (
              <div key={table.id} className={`user-attachment-card table ${table.parseError ? 'error' : ''}`}>
                <span className="user-attachment-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="4" fill="#E8F5E9"/>
                    <path d="M8 8H16" stroke="#2E7D32" strokeWidth="1.6" strokeLinecap="round"/>
                    <path d="M8 12H16" stroke="#2E7D32" strokeWidth="1.6" strokeLinecap="round"/>
                    <path d="M8 16H14" stroke="#2E7D32" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </span>
                <div className="user-attachment-meta">
                  <div className="user-attachment-name">{table.name}</div>
                  <div className={`user-attachment-subtle ${table.parseError ? 'user-attachment-error' : ''}`}>
                    {table.parseError ? table.parseError : formatTableKind(table.kind)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function buildAiDisplayItems(value: string): AiDisplayItem[] {
  const text = normalizeDisplayText(value);
  const lines = text.split('\n');
  const items: AiDisplayItem[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim() === '') continue;
    const trimmedStart = line.trimStart();
    if (trimmedStart.startsWith('[JSON]:')) continue;
    if (trimmedStart.startsWith('[Raw]:')) continue;
    if (trimmedStart.startsWith('[Streaming]:')) continue;

    let kind: AiDisplayItem['kind'] = 'text';
    let displayLine = line;
    if (trimmedStart.startsWith('[AI]:')) {
      kind = 'thought';
      displayLine = trimmedStart.replace('[AI]:', '').trimStart();
    } else if (trimmedStart.startsWith('[System]:')) {
      displayLine = trimmedStart.replace('[System]:', '系统：').trimStart();
    }

    const normalized = displayLine.trim();
    const normalizeExampleLine = (raw: string) => {
      const matched = String(raw || '')
        .trim()
        .match(/^(生成|创建|画)\s*示例\s*(.+?)\s*[。.!！…]*$/);
      if (!matched) return raw;
      const subject = String(matched[2] || '').replace(/[。.!！…]+$/g, '').trim();
      return subject ? `绘制 ${subject}` : raw;
    };
    const normalizeDrawLine = (raw: string) => {
      const matched = String(raw || '')
        .trim()
        .match(/^画\s*(.+?)\s*[。.!！…]*$/);
      if (!matched) return raw;
      const subject = String(matched[1] || '').replace(/[。.!！…]+$/g, '').trim();
      return subject ? `绘制 ${subject}` : raw;
    };
    const specNormalized = normalizeComponentSpecLine(normalized);
    if (specNormalized !== normalized) displayLine = specNormalized;
    displayLine = normalizeExampleLine(displayLine);
    displayLine = normalizeDrawLine(displayLine);

    const nextItem: AiDisplayItem = { kind, text: displayLine };
    const last = items[items.length - 1];
    const nextSeries = parseSeriesSpecLine(nextItem.text);
    const lastSeries = last ? parseSeriesSpecLine(last.text) : null;
    if (nextSeries && lastSeries && nextSeries.kind === lastSeries.kind) {
      last.text = formatSeriesSpecLine(lastSeries.kind, true);
      nextItem.text = formatSeriesSpecLine(nextSeries.kind, true);
    }
    if (last && last.text === nextItem.text) {
      if (last.kind === 'thought') continue;
      const lastSeriesAfter = parseSeriesSpecLine(last.text);
      const nextSeriesAfter = parseSeriesSpecLine(nextItem.text);
      if (!lastSeriesAfter || !nextSeriesAfter || lastSeriesAfter.kind !== nextSeriesAfter.kind) {
        items[items.length - 1] = nextItem;
        continue;
      }
    }
    items.push(nextItem);
  }

  return items;
}

function formatAiDisplayText(value: string): string {
  const text = normalizeDisplayText(value);
  const lines = text.split('\n');
  const processed = lines
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '')
    .filter((line) => !line.trimStart().startsWith('[JSON]:'))
    .filter((line) => !line.trimStart().startsWith('[Raw]:'))
    .filter((line) => !line.trimStart().startsWith('[Streaming]:'))
    .map((line) => {
      const trimmedStart = line.trimStart();
      let displayLine = line;
      if (trimmedStart.startsWith('[AI]:')) displayLine = trimmedStart.replace('[AI]:', '').trimStart();
      if (trimmedStart.startsWith('[System]:')) displayLine = trimmedStart.replace('[System]:', '系统：').trimStart();
      const normalized = displayLine.trim();
      const exampleMatch = normalized.match(/^(生成|创建|画)\s*示例\s*(.+?)\s*[。.!！…]*$/);
      if (exampleMatch) {
        const subject = String(exampleMatch[2] || '').replace(/[。.!！…]+$/g, '').trim();
        if (subject) return `绘制 ${subject}`;
      }
      const drawMatch = normalized.match(/^画\s*(.+?)\s*[。.!！…]*$/);
      if (drawMatch) {
        const subject = String(drawMatch[1] || '').replace(/[。.!！…]+$/g, '').trim();
        if (subject) return `绘制 ${subject}`;
      }
      const specNormalized = normalizeComponentSpecLine(normalized);
      if (specNormalized !== normalized) return specNormalized;
      return displayLine;
    });
  const deduped: string[] = [];
  for (const line of processed) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== line) {
      deduped.push(line);
    }
  }
  return deduped.join('\n');
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThinkingIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <g clipPath="url(#clip0_thinking)">
        <path
          d="M8 12V3.33333"
          stroke="#A1A1AA"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 8.66667C9.4232 8.49806 8.91656 8.14708 8.556 7.66633C8.19544 7.18558 8.00036 6.60094 8 6C7.99964 6.60094 7.80456 7.18558 7.444 7.66633C7.08344 8.14708 6.5768 8.49806 6 8.66667"
          stroke="#A1A1AA"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11.732 4.33342C11.8854 4.06774 11.9756 3.77034 11.9957 3.46421C12.0158 3.15809 11.9652 2.85145 11.8478 2.56801C11.7304 2.28458 11.5494 2.03195 11.3187 1.82967C11.0881 1.62739 10.814 1.48088 10.5176 1.40148C10.2213 1.32208 9.91069 1.31191 9.6098 1.37176C9.30891 1.43161 9.02583 1.55988 8.78244 1.74665C8.53906 1.93341 8.3419 2.17366 8.20623 2.44881C8.07055 2.72396 7.99999 3.02663 8 3.33342C8.00001 3.02663 7.92945 2.72396 7.79377 2.44881C7.6581 2.17366 7.46094 1.93341 7.21756 1.74665C6.97417 1.55988 6.69109 1.43161 6.3902 1.37176C6.08931 1.31191 5.77868 1.32208 5.48236 1.40148C5.18603 1.48088 4.91193 1.62739 4.68129 1.82967C4.45064 2.03195 4.26961 2.28458 4.15222 2.56801C4.03483 2.85145 3.98421 3.15809 4.00429 3.46421C4.02436 3.77034 4.11459 4.06774 4.268 4.33342"
          stroke="#A1A1AA"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11.998 3.41667C12.3899 3.51743 12.7537 3.70604 13.0619 3.96821C13.3701 4.23039 13.6146 4.55925 13.7768 4.9299C13.9391 5.30055 14.0149 5.70327 13.9985 6.10755C13.982 6.51183 13.8738 6.90707 13.682 7.26334"
          stroke="#A1A1AA"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 11.9994C12.587 11.9994 13.1576 11.8057 13.6233 11.4483C14.089 11.091 14.4238 10.59 14.5757 10.023C14.7276 9.45596 14.6882 8.85467 14.4636 8.31235C14.239 7.77002 13.8417 7.31696 13.3333 7.02344"
          stroke="#A1A1AA"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.3114 11.655C13.3581 12.0164 13.3303 12.3837 13.2295 12.734C13.1287 13.0843 12.9572 13.4102 12.7256 13.6916C12.4939 13.973 12.207 14.2039 11.8826 14.3701C11.5582 14.5363 11.2032 14.6342 10.8394 14.6578C10.4757 14.6814 10.111 14.6302 9.76782 14.5074C9.42466 14.3845 9.11033 14.1926 8.84424 13.9435C8.57815 13.6943 8.36596 13.3933 8.22077 13.059C8.07558 12.7247 8.00047 12.3641 8.00008 11.9996C7.99969 12.3641 7.92458 12.7247 7.77939 13.059C7.6342 13.3933 7.42201 13.6943 7.15592 13.9435C6.88983 14.1926 6.5755 14.3845 6.23234 14.5074C5.88917 14.6302 5.52446 14.6814 5.16073 14.6578C4.797 14.6342 4.44197 14.5363 4.11756 14.3701C3.79315 14.2039 3.50626 13.973 3.2746 13.6916C3.04294 13.4102 2.87144 13.0843 2.77067 12.734C2.66991 12.3837 2.64202 12.0164 2.68875 11.655"
          stroke="#A1A1AA"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3.9998 11.9994C3.4128 11.9994 2.84221 11.8057 2.37651 11.4483C1.91082 11.091 1.57605 10.59 1.42412 10.023C1.27219 9.45596 1.31159 8.85467 1.53621 8.31235C1.76083 7.77002 2.15812 7.31696 2.66647 7.02344"
          stroke="#A1A1AA"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4.00187 3.41667C3.61001 3.51743 3.24621 3.70604 2.93803 3.96821C2.62985 4.23039 2.38536 4.55925 2.2231 4.9299C2.06084 5.30055 1.98504 5.70327 2.00146 6.10755C2.01788 6.51183 2.12608 6.90707 2.31787 7.26334"
          stroke="#A1A1AA"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_thinking">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 7C3.5 5.067 5.067 3.5 7 3.5C8.933 3.5 10.5 5.067 10.5 7C10.5 7.88461 10.1718 8.69256 9.63058 9.30876L9.30876 9.63058C8.69256 10.1718 7.88461 10.5 7 10.5C5.067 10.5 3.5 8.933 3.5 7ZM9.96544 11.0261C9.13578 11.6382 8.11014 12 7 12C4.23858 12 2 9.76142 2 7C2 4.23858 4.23858 2 7 2C9.76142 2 12 4.23858 12 7C12 8.11014 11.6382 9.13578 11.0261 9.96544L14.0303 12.9697L14.5607 13.5L13.5 14.5607L12.9697 14.0303L9.96544 11.0261Z"
        fill="#A1A1AA"
      />
    </svg>
  );
}

function DrawIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <g clipPath="url(#clip0_draw)">
        <path
          d="M14.6666 4H1.33325"
          stroke="#A1A1AA"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.6666 12H1.33325"
          stroke="#A1A1AA"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 1.33333V14.6667"
          stroke="#A1A1AA"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 1.33333V14.6667"
          stroke="#A1A1AA"
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_draw">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const display = value >= 10 || index === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${display}${units[index]}`;
}

function formatTableKind(kind: UploadedTableAttachment['kind']): string {
  if (kind === 'csv') return 'CSV';
  if (kind === 'tsv') return 'TSV';
  if (kind === 'xlsx' || kind === 'xls') return 'Excel';
  return 'Table';
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

function getFileExtension(fileName: string): UploadedTableAttachment['kind'] {
  const normalized = String(fileName || '').trim().toLowerCase();
  if (normalized.endsWith('.csv')) return 'csv';
  if (normalized.endsWith('.tsv')) return 'tsv';
  if (normalized.endsWith('.xlsx')) return 'xlsx';
  if (normalized.endsWith('.xls')) return 'xls';
  return 'unknown';
}

function splitCsvLine(line: string, delimiter: string): string[] {
  if (delimiter !== ',') {
    return line.split(delimiter).map((cell) => cell.trim());
  }

  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function detectTableDelimiter(lines: string[]): string {
  const candidates = [',', '\t', ';', '|'];
  let bestDelimiter = ',';
  let bestScore = 0;

  candidates.forEach((delimiter) => {
    const score = lines
      .slice(0, 5)
      .map((line) => splitCsvLine(line, delimiter).length)
      .reduce((sum, count) => sum + count, 0);

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  });

  return bestDelimiter;
}

function parseTextTableContent(text: string): { headers: string[]; rows: string[][]; delimiter: string } {
  const normalized = String(text || '').replace(/^\uFEFF/, '');
  const lines = normalized
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { headers: [], rows: [], delimiter: ',' };
  }

  const delimiter = detectTableDelimiter(lines);
  const matrix = lines.map((line) => splitCsvLine(line, delimiter));
  const headers = matrix[0] || [];
  const rows = matrix.slice(1);
  return { headers, rows, delimiter };
}

function formatTablePreviewLines(headers: string[], rows: string[][]): string[] {
  const lines: string[] = [];
  if (headers.length > 0) {
    lines.push(`表头：${clampPreview(headers.join(', '))}`);
  }
  if (rows.length > 0) {
    lines.push('数据预览(前3行)：');
    rows.slice(0, 3).forEach((row) => {
      lines.push(clampPreview(row.join(' | ')));
    });
  }
  return lines;
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return await file.text();
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('读取表格失败'));
    reader.readAsText(file);
  });
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error('读取表格失败'));
    reader.readAsArrayBuffer(file);
  });
}

function injectInlineScript(source: string): void {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.text = source;
  document.head.appendChild(script);
  script.remove();
}

function getInjectedXlsxParser(): XlsxParser | null {
  if (typeof window === 'undefined') return null;
  const parser = window.XLSX;
  if (!parser) return null;

  if (window.cptable) {
    try {
      if (typeof parser.set_cptable === 'function') {
        parser.set_cptable(window.cptable);
      } else {
        parser.cptable = window.cptable;
      }
    } catch (_error) {
      return null;
    }
  }

  return parser;
}

let xlsxParserReadyPromise: Promise<XlsxParser | null> | null = null;

async function ensureXlsxParserReady(): Promise<XlsxParser | null> {
  const existing = getInjectedXlsxParser();
  if (existing) return existing;

  if (!xlsxParserReadyPromise) {
    xlsxParserReadyPromise = Promise.resolve()
      .then(() => {
        injectInlineScript(CP_EXCEL_BUNDLE_SOURCE);
        injectInlineScript(XLSX_BUNDLE_SOURCE);
        return getInjectedXlsxParser();
      })
      .catch(() => null);
  }

  return await xlsxParserReadyPromise;
}

function normalizeTableMatrix(rows: unknown[]): string[][] {
  return rows
    .map((row) =>
      Array.isArray(row)
        ? row.map((cell) => (cell == null ? '' : String(cell).trim()))
        : []
    )
    .filter((row) => row.some((cell) => cell !== ''));
}

async function parseSpreadsheetTableContent(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const parser = await ensureXlsxParserReady();
  if (!parser) {
    throw new Error('当前版本未安装 XLSX 解析器，暂仅支持 CSV/TSV。');
  }

  const arrayBuffer = await readFileAsArrayBuffer(file);
  const workbook = parser.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) {
    throw new Error('表格内容为空或无法识别。');
  }

  const sheet = workbook.Sheets?.[firstSheetName];
  const matrix = normalizeTableMatrix(
    parser.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
  );

  if (matrix.length === 0) {
    throw new Error('表格内容为空或无法识别。');
  }

  return {
    headers: matrix[0] || [],
    rows: matrix.slice(1)
  };
}

async function parseUploadedTable(file: File): Promise<UploadedTableAttachment> {
  const kind = getFileExtension(file.name);
  if (kind === 'xlsx' || kind === 'xls') {
    try {
      const parsed = await parseSpreadsheetTableContent(file);
      const previewLines = formatTablePreviewLines(parsed.headers, parsed.rows);
      return {
        id: createLocalAttachmentId(),
        name: file.name,
        kind,
        headers: parsed.headers,
        rows: parsed.rows,
        previewLines,
        summary: previewLines.join('\n'),
        size: file.size
      };
    } catch (error) {
      const message = toErrorMessage(error, '表格解析失败。');
      return {
        id: createLocalAttachmentId(),
        name: file.name,
        kind,
        headers: [],
        rows: [],
        previewLines: [],
        summary: message,
        size: file.size,
        parseError: message
      };
    }
  }

  const text = await readFileAsText(file);
  const parsed = parseTextTableContent(text);

  if (parsed.headers.length === 0 && parsed.rows.length === 0) {
    return {
      id: createLocalAttachmentId(),
      name: file.name,
      kind,
      headers: [],
      rows: [],
      previewLines: [],
      summary: '表格内容为空或无法识别。',
      size: file.size,
      parseError: '表格内容为空或无法识别。'
    };
  }

  const previewLines = formatTablePreviewLines(parsed.headers, parsed.rows);
  return {
    id: createLocalAttachmentId(),
    name: file.name,
    kind,
    headers: parsed.headers,
    rows: parsed.rows,
    previewLines,
    summary: previewLines.join('\n'),
    size: file.size
  };
}

function buildUserSummary(
  input: string,
  images: UploadedImageAttachment[],
  tables: UploadedTableAttachment[]
): string {
  const trimmedInput = String(input || '').trim();
  if (trimmedInput.length === 0 && tables.length === 0 && images.length > 0) {
    return '用户上传图片';
  }
  if (trimmedInput.length === 0 && images.length === 0 && tables.length > 0) {
    return '用户上传表格';
  }
  if (trimmedInput.length === 0 && images.length > 0 && tables.length > 0) {
    return '用户上传图片和表格';
  }
  const lines: string[] = [];
  lines.push(`需求文本长度：${trimmedInput.length}`);
  if (tables.length > 0) {
    lines.push(`表格附件：${tables.length} 个`);
    tables.forEach((table, index) => {
      lines.push(`表格 ${index + 1}：${table.name}`);
      if (table.parseError) {
        lines.push(`表格解析失败：${table.parseError}`);
      } else {
        lines.push('表格解析成功：');
        table.previewLines.forEach((line) => lines.push(line));
      }
    });
  }

  lines.push(`图片附件：${images.length} 个`);
  if (images.length > 0) {
    lines.push(`图片名称：${images.map((image) => image.name).join(', ')}`);
  }

  return normalizeDisplayText(lines.join('\n'));
}

function buildTableContextText(tables: UploadedTableAttachment[]): string {
  const validTables = tables.filter((table) => !table.parseError && (table.headers.length > 0 || table.rows.length > 0));
  if (validTables.length === 0) return '';

  const payload = validTables.map((table) => ({
    name: table.name,
    headers: table.headers,
    rows: table.rows.slice(0, MAX_TABLE_CONTEXT_ROWS)
  }));

  return `表格结构(JSON):\n${JSON.stringify(payload)}`;
}

function buildCurrentTurnText(input: string, images: UploadedImageAttachment[], tables: UploadedTableAttachment[]): string {
  const trimmed = String(input || '').trim();
  const summary = buildUserSummary(input, images, tables);
  const sections = trimmed
    ? [
        `用户需求：\n${trimmed}`,
        `用户提供内容：\n${summary}`
      ]
    : [summary];

  const tableContext = buildTableContextText(tables);
  if (tableContext) {
    sections.push(tableContext);
    sections.push('提示：请直接使用 draw_table 工具根据上述 JSON 结构绘制表格，无需读取 spec。');
  }

  return sections.join('\n\n');
}

function buildRichUserContent(
  input: string,
  images: UploadedImageAttachment[],
  tables: UploadedTableAttachment[]
): string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> {
  const text = buildCurrentTurnText(input, images, tables);
  if (images.length === 0) return text;

  return [
    { type: 'text' as const, text },
    ...images.slice(0, MAX_ATTACHMENT_IMAGES_PER_TURN).map((image) => ({
      type: 'image_url' as const,
      image_url: { url: image.dataUrl }
    }))
  ];
}

function replaceLastUserMessageContent(messages: Array<{ role: string; content: any }>, content: any) {
  const nextMessages = [...messages];
  for (let index = nextMessages.length - 1; index >= 0; index -= 1) {
    if (nextMessages[index]?.role === 'user') {
      nextMessages[index] = { ...nextMessages[index], content };
      break;
    }
  }
  return nextMessages;
}

function pruneCompactValue(value: any): any {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    return value.trim() ? value : undefined;
  }
  if (Array.isArray(value)) {
    const next = value
      .map((item) => pruneCompactValue(item))
      .filter((item) => item !== undefined);
    return next.length > 0 ? next : undefined;
  }
  if (typeof value === 'object') {
    const nextEntries = Object.entries(value)
      .map(([key, item]) => [key, pruneCompactValue(item)] as const)
      .filter(([, item]) => item !== undefined);
    return nextEntries.length > 0 ? Object.fromEntries(nextEntries) : undefined;
  }
  return value;
}

function stripFigmaRuntimeSuffix(value: string): string {
  const normalized = String(value || '').trim();
  if (!normalized) return normalized;
  const hashIndex = normalized.lastIndexOf('#');
  return hashIndex > 0 ? normalized.slice(0, hashIndex) : normalized;
}

function compactVariableReference(variable: any): string | number | boolean | undefined {
  const name = typeof variable?.name === 'string' ? variable.name.trim() : '';
  if (name) return name;
  if (
    typeof variable?.resolvedValue === 'string' ||
    typeof variable?.resolvedValue === 'number' ||
    typeof variable?.resolvedValue === 'boolean'
  ) {
    return variable.resolvedValue;
  }
  return undefined;
}

function compactPropertyMap(value: any): Record<string, any> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const output = Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [stripFigmaRuntimeSuffix(key), item] as const)
      .filter(([, item]) => item !== undefined)
  );
  return Object.keys(output).length > 0 ? output : undefined;
}

function collectStyleRefs(node: any): string[] | undefined {
  const refs = new Set<string>();

  const pushRef = (value: unknown) => {
    const normalized = String(value || '').trim();
    if (normalized) refs.add(normalized);
  };

  const boundVariables = node?.boundVariables && typeof node.boundVariables === 'object'
    ? Object.entries(node.boundVariables)
    : [];
  boundVariables.forEach(([field, rawValue]) => {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    values.forEach((item) => {
      const variable = compactVariableReference(item);
      if (!variable) return;
      pushRef(`${stripFigmaRuntimeSuffix(field)}:${String(variable)}`);
    });
  });

  (['fills', 'strokes'] as const).forEach((paintType) => {
    const paints = Array.isArray(node?.[paintType]) ? node[paintType] : [];
    paints.forEach((paint: any) => {
      if (paint?.visible === false) return;
      const bound = Array.isArray(paint?.boundVariables) ? paint.boundVariables : [];
      if (bound.length > 0) {
        bound.forEach((binding: any) => {
          const variable = compactVariableReference(binding?.variable);
          if (!variable) return;
          pushRef(`${paintType}:${String(variable)}`);
        });
        return;
      }
      if (typeof paint?.color === 'string') {
        pushRef(`${paintType}:${paint.color}`);
      }
    });
  });

  return refs.size > 0 ? Array.from(refs).slice(0, 8) : undefined;
}

function compactLayout(node: any): any {
  const hasPadding = [node?.paddingTop, node?.paddingRight, node?.paddingBottom, node?.paddingLeft]
    .some((value) => typeof value === 'number' && value !== 0);
  return pruneCompactValue(
    typeof node?.layoutMode === 'string'
      ? {
          mode: node.layoutMode,
          gap: typeof node?.itemSpacing === 'number' && node.itemSpacing !== 0 ? node.itemSpacing : undefined,
          padding: hasPadding
            ? [
                Number(node?.paddingTop || 0),
                Number(node?.paddingRight || 0),
                Number(node?.paddingBottom || 0),
                Number(node?.paddingLeft || 0)
              ]
            : undefined
        }
      : undefined
  );
}

function buildCompactChildKey(node: any): string {
  return JSON.stringify({
    type: node?.nodeType,
    name: node?.name,
    componentName: node?.componentName,
    componentSetName: node?.componentSetName,
    componentProperties: compactPropertyMap(
      node?.componentProperties && typeof node.componentProperties === 'object'
        ? Object.fromEntries(
            Object.entries(node.componentProperties).map(([key, definition]: [string, any]) => [key, definition?.value])
          )
        : undefined
    ),
    text: node?.characters,
    layoutMode: node?.layoutMode,
    visible: node?.visible === false ? false : undefined
  });
}

function groupCompactChildren(children: any[]): Array<{ node: any; count: number }> {
  const grouped: Array<{ node: any; count: number }> = [];
  const indexByKey = new Map<string, number>();
  children.forEach((child) => {
    const key = buildCompactChildKey(child);
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, grouped.length);
      grouped.push({ node: child, count: 1 });
      return;
    }
    grouped[existingIndex].count += 1;
  });
  return grouped;
}

function summarizeCollapsedChildren(children: any[]): any[] | undefined {
  if (!Array.isArray(children) || children.length === 0) return undefined;
  return groupCompactChildren(children)
    .slice(0, MAX_CHILD_SUMMARY_ITEMS)
    .map(({ node, count }) =>
      pruneCompactValue({
        type: node?.nodeType,
        name: node?.componentSetName || node?.componentName || node?.name,
        text: node?.nodeType === 'TEXT' ? node?.characters : undefined,
        count: count > 1 ? count : undefined
      })
    );
}

function compactStructureNode(node: any, depth = 0): any {
  if (!node || typeof node !== 'object') return undefined;

  const componentProperties =
    node?.componentProperties && typeof node.componentProperties === 'object'
      ? compactPropertyMap(
          Object.fromEntries(
            Object.entries(node.componentProperties).map(([key, definition]: [string, any]) => [key, definition?.value])
          )
        )
      : undefined;
  const groupedChildren = Array.isArray(node?.children) ? groupCompactChildren(node.children) : [];
  const canExpandChildren = groupedChildren.length > 0 && depth < MAX_EXPAND_DEPTH_IN_STRUCTURE_JSON;

  return pruneCompactValue({
    type: node?.nodeType,
    name: node?.name,
    component:
      node?.componentName || node?.componentSetName
        ? pruneCompactValue({
            setName: node?.componentSetName,
            name: node?.componentName
          })
        : undefined,
    componentProperties,
    size:
      depth <= 1 && (typeof node?.width === 'number' || typeof node?.height === 'number')
        ? [Number(node?.width || 0), Number(node?.height || 0)]
        : undefined,
    visible: node?.visible === false ? false : undefined,
    text: node?.characters,
    variantProperties: depth === 0 ? node?.variantProperties : undefined,
    layout: compactLayout(node),
    styles: collectStyleRefs(node),
    children: canExpandChildren
      ? groupedChildren.map(({ node: child, count }) =>
          pruneCompactValue({
            count: count > 1 ? count : undefined,
            ...compactStructureNode(child, depth + 1)
          })
        )
      : undefined,
    childSummary: !canExpandChildren ? summarizeCollapsedChildren(node?.children) : undefined,
    truncatedChildren:
      typeof node?.truncatedChildren === 'number' && node.truncatedChildren > 0
        ? node.truncatedChildren
        : undefined
  });
}

function compactStructureProperty(property: any): any {
  const options = Array.isArray(property?.variantOptions)
    ? property.variantOptions.map((value: any) => String(value)).filter(Boolean)
    : [];

  return pruneCompactValue({
    name: stripFigmaRuntimeSuffix(property?.propertyName),
    type: property?.type,
    default: property?.defaultValue,
    options
  });
}

function compactStructureResult(item: any): any {
  const rawVariants = Array.isArray(item?.variantStructures)
    ? item.variantStructures
    : item?.structure
      ? [
          {
            name: item?.componentName,
            variantProperties: item?.sampleVariantProperties,
            structure: item?.structure
          }
        ]
      : [];

  const sampledVariants = rawVariants
    .slice(0, MAX_VARIANTS_IN_STRUCTURE_JSON)
    .map((variant: any) =>
        pruneCompactValue({
          name: variant?.name,
          variantProperties: variant?.variantProperties,
          tree: compactStructureNode(variant?.structure)
        })
      );

  return pruneCompactValue({
    status: item?.status,
    token: item?.token,
    componentKey: item?.componentKey,
    componentName: item?.componentSetName ? undefined : item?.componentName,
    componentSetName: item?.componentSetName,
    nodeType: item?.nodeType,
    variantCount: typeof item?.variantCount === 'number' ? item.variantCount : undefined,
    properties: Array.isArray(item?.properties)
      ? item.properties.map((property: any) => compactStructureProperty(property))
      : undefined,
    sampledVariants,
    moreVariants:
      rawVariants.length > MAX_VARIANTS_IN_STRUCTURE_JSON
        ? rawVariants.length - MAX_VARIANTS_IN_STRUCTURE_JSON
        : undefined,
    sampledVariantsTruncated: item?.variantStructuresTruncated ? true : undefined,
    error: item?.error
  });
}

function App() {
  const [userInput, setUserInput] = React.useState('');
  const composerTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [chartPromptMode, setChartPromptMode] = React.useState(false);
  const [chartOverlayOpen, setChartOverlayOpen] = React.useState(false);
  const [chartShortcutActive, setChartShortcutActive] = React.useState<string | null>(null);
  const [chartMenuOpen, setChartMenuOpen] = React.useState(false);
  const [quickComponentMenuOpen, setQuickComponentMenuOpen] = React.useState(false);
  const chartUiHtml = React.useMemo(
    () =>
      AI_CHART_UI_HTML.replace(
        '<script src="lib/echarts.min.js"></script>',
        `<script>${ECHARTS_BUNDLE_SOURCE}</script>`
      ),
    []
  );
  const [loading, setLoading] = React.useState(false);
  const [response, setResponse] = React.useState<string | null>(null);
  const [chatHistory, setChatHistory] = React.useState<{role: string, content: string}[]>([]);
  const [uploadedImages, setUploadedImages] = React.useState<UploadedImageAttachment[]>([]);
  const [uploadedTables, setUploadedTables] = React.useState<UploadedTableAttachment[]>([]);
  const [attachmentError, setAttachmentError] = React.useState<string | null>(null);
  const [agentPlan, setAgentPlan] = React.useState<AgentPlanState | null>(null);
  const [manualTaskRunner, setManualTaskRunner] = React.useState(false);
  const [planIslandOpen, setPlanIslandOpen] = React.useState(false);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const tableInputRef = React.useRef<HTMLInputElement | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = React.useState(false);
  const composerAttachRef = React.useRef<HTMLDivElement | null>(null);
  const chartDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const quickComponentDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const quickComponentMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [quickComponentActiveCategory, setQuickComponentActiveCategory] = React.useState<string | null>(null);
  const [quickComponentSubmenuStyle, setQuickComponentSubmenuStyle] = React.useState<React.CSSProperties>({});
  const composerBoxRef = React.useRef<HTMLDivElement | null>(null);
  const streamTableStateRef = React.useRef<StreamTableState | null>(null);
  const streamTableQueueRef = React.useRef(Promise.resolve());
  const streamTableRunIdRef = React.useRef(0);
  const chatScrollRef = React.useRef<HTMLDivElement | null>(null);
  const [lastUserMessage, setLastUserMessage] = React.useState<string | null>(null);
  const [uiMessages, setUiMessages] = React.useState<UiMessage[]>([]);
  
  // State for selected AI component
  const [selectionCount, setSelectionCount] = React.useState(0);
  const [canvasHint, setCanvasHint] = React.useState<'table' | 'form' | 'chart' | 'mixed'>('mixed');
  const llmAbortRef = React.useRef<AbortController | null>(null);
  const mockSelectionEnabled = React.useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('mockSelection') === '1';
    } catch {
      return false;
    }
  }, []);

  React.useLayoutEffect(() => {
    const box = composerBoxRef.current;
    if (!box) return;
    const updateWidth = () => {
      const width = chartDropdownRef.current?.getBoundingClientRect().width ?? 0;
      box.style.setProperty('--chart-tag-width', `${width}px`);
    };
    updateWidth();
    const target = chartDropdownRef.current;
    const observer = target ? new ResizeObserver(updateWidth) : null;
    if (target && observer) {
      observer.observe(target);
    }
    window.addEventListener('resize', updateWidth);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [chartShortcutActive]);

  React.useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (composerAttachRef.current && !composerAttachRef.current.contains(target)) {
        setAttachmentMenuOpen(false);
      }
      if (chartDropdownRef.current && !chartDropdownRef.current.contains(target)) {
        setChartMenuOpen(false);
      }
      if (quickComponentDropdownRef.current && !quickComponentDropdownRef.current.contains(target)) {
        setQuickComponentMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  React.useEffect(() => {
    if (!quickComponentMenuOpen) {
      setQuickComponentActiveCategory(null);
    }
  }, [quickComponentMenuOpen]);
  const stopRequestedRef = React.useRef(false);
  const thinkingStartedAtRef = React.useRef<number | null>(null);
  const readSpecsCacheRef = React.useRef<Set<string>>(new Set());
  const [thinkingActive, setThinkingActive] = React.useState(false);
  const [thinkingSeconds, setThinkingSeconds] = React.useState<number | null>(null);
  const [thoughtDetailsExpanded, setThoughtDetailsExpanded] = React.useState(true);
  const [selectedComponent, setSelectedComponent] = React.useState<{ 
    componentId: string; 
    params: any;
    childComponentId?: string; // For columns, this stores the type of cells inside
    nodeName?: string;
  } | null>(null);
  const [selectionVersion, setSelectionVersion] = React.useState(0);
  const [formFieldTextMode, setFormFieldTextMode] = React.useState<'value' | 'placeholder'>('placeholder');

  // Tab state
  const [activeTab, setActiveTab] = React.useState<'chat' | 'docs' | 'selection'>('chat');
  const [showInheritedParams, setShowInheritedParams] = React.useState(false);
  const [componentInspectionRunning, setComponentInspectionRunning] = React.useState(false);
  const [componentInspectionSummary, setComponentInspectionSummary] = React.useState<string | null>(null);
  const [componentInspectTokenInput, setComponentInspectTokenInput] = React.useState('lib-data-input-form');
  const [componentInspectJson, setComponentInspectJson] = React.useState('');
  const [figmaComponentPropsCache, setFigmaComponentPropsCache] = React.useState<Record<string, any>>({});
  const figmaComponentPropsLoadingRef = React.useRef<Set<string>>(new Set());
  const ADVANCED_PARAM_KEYS_BY_COMPONENT: Record<string, Set<string>> = {
    form: new Set(['showColon']),
    'form-field': new Set([
      'showColon',
      'size',
      'showPrefix',
      'showSuffix',
      'prefixText',
      'suffixText'
    ])
  };

  React.useEffect(() => {
    if (!mockSelectionEnabled) return;
    setActiveTab('selection');
    setSelectionCount(1);
    setCanvasHint('mixed');
    setSelectedComponent({
      componentId: 'figma-component',
      params: { componentToken: 'library.navigation.header' },
      nodeName: 'Mock Selection'
    });
  }, [
    mockSelectionEnabled,
    setActiveTab,
    setSelectionCount,
    setCanvasHint,
    setSelectedComponent
  ]);

  const userSummary = buildUserSummary(userInput, uploadedImages, uploadedTables);
  const canSend = Boolean(
    userInput.trim() ||
      chartShortcutActive ||
      uploadedImages.length > 0 ||
      uploadedTables.length > 0
  );

  React.useEffect(() => {
    // Listen for messages from the plugin code
    window.onmessage = (event) => {
      const pluginMessage = event?.data?.pluginMessage;
      if (!pluginMessage || typeof pluginMessage !== 'object') return;
      const { type, message, data } = pluginMessage as any;
      // #region debug-point A:ui-onmessage
      fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"20260319-tn-init",runId:"pre-fix",hypothesisId:"A",location:"App.tsx:1436",msg:"[DEBUG] ui onmessage",data:{type,message,hasData:typeof data !== 'undefined'}})}).catch(()=>{});
      // #endregion
      if (type === 'action-done') {
        if (message === 'Updated properties') return;
        setResponse((prev) => (prev ? prev + '\n\n' + `[System]: ${message}` : `[System]: ${message}`));
      }
      
      if (type === 'selection-update') {
        setUserInput('');
        setSelectionCount(data?.selectionCount ?? 1);
        setCanvasHint(data?.canvasHint ?? 'mixed');
        setActiveTab('selection');
        if (data.componentId) {
          setSelectedComponent(data);
          setSelectionVersion((prev) => prev + 1);
        }
        setChartOverlayOpen(Boolean(data?.componentId && data.componentId.startsWith('chart')));
      }

      if (type === 'selection-multi-update') {
        setSelectionCount(data?.count ?? 0);
        setCanvasHint(data?.canvasHint ?? 'mixed');
        setActiveTab('selection');
        setSelectedComponent(null);
        setChartOverlayOpen(false);
      }
      
      if (type === 'selection-cleared') {
        setSelectionCount(0);
        setCanvasHint(data?.canvasHint ?? 'mixed');
        setActiveTab('chat');
        setSelectedComponent(null);
        setChartOverlayOpen(false);
      }

    };
  }, [activeTab]);

  React.useEffect(() => {
    if (!selectedComponent || selectedComponent.componentId !== 'form-field') return;
    const params = selectedComponent.params || {};
    const hasValue = String(params.value ?? '').trim().length > 0;
    const hasPlaceholder = String(params.placeholder ?? '').trim().length > 0;
    if (hasValue) {
      setFormFieldTextMode('value');
      return;
    }
    if (hasPlaceholder) {
      setFormFieldTextMode('placeholder');
      return;
    }
    setFormFieldTextMode('placeholder');
  }, [selectionVersion, selectedComponent?.params?.controlType]);

  const resolveFigmaComponentPropsCacheKey = (token: string, componentKey: string) => {
    const normalizedToken = String(token || '').trim();
    const normalizedKey = String(componentKey || '').trim();
    if (normalizedToken) return `token:${normalizedToken}`;
    if (normalizedKey) return `key:${normalizedKey}`;
    return '';
  };

  const requestFigmaComponentProps = async (
    token: string,
    componentKey: string,
    cacheKey: string,
    force = false
  ) => {
    if (!cacheKey) return;
    if (!force && figmaComponentPropsCache[cacheKey]) return;
    if (figmaComponentPropsLoadingRef.current.has(cacheKey)) return;
    figmaComponentPropsLoadingRef.current.add(cacheKey);
    try {
      const payload = token
        ? { tokens: [token], maxCount: 1 }
        : { keys: [componentKey], maxCount: 1 };
      const result = await inspectFigmaComponentProps(payload);
      const item = Array.isArray(result?.results) ? result.results[0] : null;
      const fallback = {
        status: 'error',
        token,
        componentKey,
        error: 'no results'
      };
      setFigmaComponentPropsCache((prev) => ({
        ...prev,
        [cacheKey]: item || fallback
      }));
    } catch (error) {
      setFigmaComponentPropsCache((prev) => ({
        ...prev,
        [cacheKey]: {
          status: 'error',
          token,
          componentKey,
          error: String(error)
        }
      }));
    } finally {
      figmaComponentPropsLoadingRef.current.delete(cacheKey);
    }
  };

  React.useEffect(() => {
    if (!selectedComponent || selectedComponent.componentId !== 'figma-component') return;
    const token = String(selectedComponent.params?.componentToken || '').trim();
    const componentKey = String(selectedComponent.params?.componentKey || '').trim();
    const cacheKey = resolveFigmaComponentPropsCacheKey(token, componentKey);
    if (!cacheKey) return;
    if (figmaComponentPropsCache[cacheKey]) return;
    requestFigmaComponentProps(token, componentKey, cacheKey);
  }, [selectedComponent, figmaComponentPropsCache]);

  const manualTooltipText = React.useMemo(() => {
    if (canvasHint === 'table') {
      return '请在画布中选择一个表格、行、列或具体的单元格，即可激\n活精细化调试面板。';
    }
    if (canvasHint === 'form') {
      return '请在画布中选择一个表单、字段、具体的Label或者输入项，即可激活精细化调试面板。';
    }
    if (canvasHint === 'chart') {
      return '请在画布中选择一个图表，即可激活精细化调试面板。';
    }
    return '请在画布中选择任意一个元素，即可激活精细化调试面板。';
  }, [canvasHint]);

  React.useEffect(() => {
    parent.postMessage({ pluginMessage: { type: 'ui-ready' } }, '*');
  }, []);

  React.useEffect(() => {
    if (!agentPlan) {
      setPlanIslandOpen(false);
      return;
    }
    const hasAttentionTask = agentPlan.tasks.some(
      (task) => task.status === 'failed' || task.status === 'blocked'
    );
    if (hasAttentionTask) {
      setPlanIslandOpen(true);
    }
  }, [agentPlan]);

  React.useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [response, lastUserMessage, loading, uiMessages]);

  React.useEffect(() => {
    if (!attachmentMenuOpen) return;
    const handleDocumentClick = (event: MouseEvent) => {
      if (!composerAttachRef.current) return;
      if (composerAttachRef.current.contains(event.target as Node)) return;
      setAttachmentMenuOpen(false);
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [attachmentMenuOpen]);

  const updateParams = (next: Record<string, any>) => {
    if (!selectedComponent) return;
    const newParams = { ...selectedComponent.params, ...next };
    setSelectedComponent({ ...selectedComponent, params: newParams });
    parent.postMessage({ pluginMessage: { type: 'update-component', params: newParams } }, '*');
  };

  const updateParam = (key: string, value: any) => {
    if (!selectedComponent) return;
    updateParams({ [key]: value });
  };

  const updateComponentType = (newType: string) => {
    if (!selectedComponent) return;
    parent.postMessage({ 
        pluginMessage: { 
            type: 'swap-component', 
            componentId: newType 
        } 
    }, '*');
  };

  const applyColumnSettings = () => {
    if (!selectedComponent) return;
    const params = selectedComponent.params || {};
    const cellType = selectedComponent.componentId === 'table-column'
      ? (selectedComponent.childComponentId || 'table-cell')
      : selectedComponent.componentId;
    parent.postMessage({
      pluginMessage: {
        type: 'apply-column-settings',
        componentId: cellType,
        textAlign: params.textAlign,
        textDisplay: params.textDisplay,
        columnWidthMode: params.columnWidthMode,
        width: typeof params.width === 'number' ? params.width : undefined
      }
    }, '*');
  };

  const setGenerationLock = (enabled: boolean) => {
    window.parent.postMessage({
      pluginMessage: {
        type: 'set-generation-lock',
        enabled
      }
    }, '*');
  };

  const handleImageFiles = React.useCallback(async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setAttachmentError(null);

    const nextImages: UploadedImageAttachment[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        nextImages.push({
          id: createLocalAttachmentId(),
          name: file.name || `image-${nextImages.length + 1}.png`,
          dataUrl,
          source: 'upload',
          size: file.size
        });
      } catch (e) {
        setAttachmentError(`图片读取失败：${file.name || '未命名图片'} (${String(e)})`);
      }
    }

    if (nextImages.length > 0) {
      setUploadedImages((prev) => [...prev, ...nextImages]);
    }
  }, []);

  const handleTableFiles = React.useCallback(async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setAttachmentError(null);

    const nextTables: UploadedTableAttachment[] = [];
    for (const file of Array.from(files)) {
      try {
        nextTables.push(await parseUploadedTable(file));
      } catch (e) {
        nextTables.push({
          id: createLocalAttachmentId(),
          name: file.name || '未命名表格',
          kind: getFileExtension(file.name),
          headers: [],
          rows: [],
          previewLines: [],
          summary: `表格解析失败：${String(e)}`,
          size: file.size,
          parseError: `表格解析失败：${String(e)}`
        });
      }
    }

    if (nextTables.length > 0) {
      setUploadedTables((prev) => [...prev, ...nextTables]);
    }
  }, []);

  const handlePaste = React.useCallback(async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(event.clipboardData?.items || []);
    const imageFiles = items
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (imageFiles.length === 0) return;

    event.preventDefault();
    setAttachmentError(null);

    const nextImages: UploadedImageAttachment[] = [];
    for (const file of imageFiles) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        nextImages.push({
          id: createLocalAttachmentId(),
          name: file.name || `pasted-image-${nextImages.length + 1}.png`,
          dataUrl,
          source: 'paste',
          size: file.size
        });
      } catch (e) {
        setAttachmentError(`粘贴图片失败：${String(e)}`);
      }
    }

    if (nextImages.length > 0) {
      setUploadedImages((prev) => [...prev, ...nextImages]);
    }
  }, []);

  const removeImageAttachment = React.useCallback((id: string) => {
    setUploadedImages((prev) => prev.filter((image) => image.id !== id));
  }, []);

  const removeTableAttachment = React.useCallback((id: string) => {
    setUploadedTables((prev) => prev.filter((table) => table.id !== id));
  }, []);

  const stopGeneration = React.useCallback(() => {
    stopRequestedRef.current = true;
    llmAbortRef.current?.abort();
    setGenerationLock(false);
  }, []);

  const applyQuickPrompt = React.useCallback((prompt: string) => {
    setUserInput((prev) => (prev.trim() ? `${prev}\n${prompt}` : prompt));
  }, []);
  const replaceQuickPrompt = React.useCallback((prompt: string) => {
    setUserInput(prompt);
  }, []);

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      const pluginMessage = event.data?.pluginMessage;
      if (!pluginMessage || pluginMessage.type !== 'generate-chart') return;
      window.parent.postMessage({ pluginMessage }, '*');
    };
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, []);

  const updateLastAiMessage = React.useCallback((content: string) => {
    setUiMessages((prev) => {
      if (prev.length === 0) {
        return [{ role: 'ai', content }];
      }
      const next = [...prev];
      const lastIndex = next.length - 1;
      if (next[lastIndex].role !== 'ai') {
        next.push({ role: 'ai', content });
      } else {
        next[lastIndex] = { ...next[lastIndex], content };
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    if (!thinkingActive) return;
    const last = uiMessages[uiMessages.length - 1];
    if (!last || last.role !== 'ai') return;
    if (!last.content.trim()) return;
    if (thinkingSeconds !== null) return;
    if (thinkingStartedAtRef.current === null) return;
    const ms = Date.now() - thinkingStartedAtRef.current;
    const secs = Math.max(1, Math.ceil(ms / 1000));
    setThinkingSeconds(secs);
    setThinkingActive(false);
  }, [thinkingActive, thinkingSeconds, uiMessages]);

  React.useEffect(() => {
    if (response === null) return;
    updateLastAiMessage(response);
  }, [response, updateLastAiMessage]);

  const extractStreamTableEvents = React.useCallback((rawChunk: string): StreamTableEvent[] => {
    const events: StreamTableEvent[] = [];
    const text = String(rawChunk || '');
    if (!text) return events;
    const segments = text.split(STREAM_TABLE_PREFIX);
    if (segments.length <= 1) return events;
    segments.shift();
    for (const seg of segments) {
      const start = seg.indexOf('{');
      const end = seg.lastIndexOf('}');
      if (start < 0 || end <= start) continue;
      const jsonText = seg.slice(start, end + 1);
      try {
        const parsed = JSON.parse(jsonText);
        if (!parsed || typeof parsed !== 'object') continue;
        const event = String((parsed as any).event || '');
        if (event === 'table_start' && Array.isArray((parsed as any).headers)) {
          events.push(parsed as StreamTableEvent);
        } else if (event === 'table_row' && Array.isArray((parsed as any).row)) {
          events.push(parsed as StreamTableEvent);
        } else if (event === 'table_done') {
          events.push({ event: 'table_done' });
        }
      } catch {
        continue;
      }
    }
    return events;
  }, []);

  const stripStreamTableLines = React.useCallback((text: string): string => {
    const lines = String(text || '').split('\n');
    return lines.filter((line) => !line.trimStart().startsWith(STREAM_TABLE_PREFIX)).join('\n');
  }, []);

  const enqueueStreamTableTask = React.useCallback((task: () => Promise<void>) => {
    streamTableQueueRef.current = streamTableQueueRef.current.then(task).catch(() => undefined);
  }, []);

  const isSameParamDefinition = React.useCallback((a: ComponentDefinition['params'][string], b: ComponentDefinition['params'][string]) => {
    if (!a || !b) return false;
    const uiA = a.ui || {};
    const uiB = b.ui || {};
    const enumA = a.enumValues || [];
    const enumB = b.enumValues || [];
    return (
      a.type === b.type &&
      a.default === b.default &&
      a.description === b.description &&
      Boolean(a.required) === Boolean(b.required) &&
      a.min === b.min &&
      a.max === b.max &&
      a.step === b.step &&
      a.pattern === b.pattern &&
      uiA.control === uiB.control &&
      uiA.group === uiB.group &&
      uiA.order === uiB.order &&
      enumA.length === enumB.length &&
      enumA.every((value, index) => value === enumB[index])
    );
  }, []);

  const generateMasterPrompt = () => {
    const enabledDefs = Object.values(COMPONENT_DEFS || {}).filter(isEnabledComponent);
    const enabledIds = enabledDefs.map((def) => def.id);
    const noCustomComponents =
      enabledIds.length === 0 || (enabledIds.length === 1 && enabledIds[0] === 'figma-component');
    let prompt = `你是一个高级 Figma 助手 (Agent)。你的任务是根据用户需求，逐步构建 Figma 组件树。
    
由于组件库很大，你不能一次性获取所有组件的详细文档。你需要通过“工具调用”的方式来获取所需组件的详细信息，然后逐步创建组件。

可用组件列表 (Component Index):
`;
    for (const def of enabledDefs) {
      prompt += `- ${def.id}: ${def.description}\n`;
    }

    if (noCustomComponents) {
      prompt += `\n当前没有可用的自定义组件注册表（仅 figma-component）。你只能使用 figma-component 构建界面；当需要设置 variantCriteria 或了解可选属性时，必须先 discover_component_props 实时探测，再根据返回结果设置参数。不要输出 width/height，除非用户明确要求尺寸。\n`;
    }

    prompt += `
工作流 (Workflow):
1. 若用户输入包含“表单 / 筛选 / 图表”等明确组件关键词，直接调用 read_specs 获取对应组件信息。**注意：创建表格（Table）时，请直接使用 draw_table，无需读取 spec。**
2. 其他情况先分析用户需求，**必须**从 Component Index 里选择可用组件，再决定需要使用哪些组件。
3. 当存在自定义组件注册表时，**必须**调用 read_specs([id1, id2...]) 获取组件的详细参数定义和结构要求。
   - ⚠️ **例外：表格组件（table/table-column等）无需读取 spec，直接使用 draw_table 即可。**
   - 禁止在未读取 spec 的情况下直接猜测组件参数（表格除外）。
   - read_specs 会返回组件的 params 定义和使用示例。
   - 已读取过的组件 spec 不要重复调用 read_specs，直接复用已有上下文。
   - 当要复用 Figma 设计系统组件时，先 read_specs([\"figma-component\"]) 获取 ComponentTokenCatalog，再使用 params.componentToken 调用。
   - 若需要给 figma-component 传 variantCriteria，先调用 discover_component_props 探测目标 token 的真实可设置属性。
   - 如果未探测到属性，先只摆放组件本体（componentToken），不要猜测属性名。
   - 禁止臆造 componentKey；只有 token 不可用时再回退 componentKey。
   - 对于 boolean 参数，不要显式输出默认值；仅当用户强行指定时才写入 true/false，未指定则使用默认值。
   - 对于 figma-component，不要输出 width/height，除非用户明确要求尺寸。
3. **表格创建优先走 draw_table(payload)**（不要输出冗长 table 子树）。
   - 当目标是创建新表格时，**直接调用 draw_table**，**无需读取 table 系列 spec**。
   - 如果是“新建表格”，禁止输出 apply_scene(table-root)。
   - draw_table 与 draw_tabl 等价；为兼容旧接口，优先使用 draw_tabl。
   - draw_table payload 必须是紧凑数据结构，禁止包含 nodeId/componentId/props/children。
   - **支持直接定义表格工具栏与分页**：
     - 若需标签页，请在 payload 中添加 "tabs": ["全部", "进行中"] 或 "hasTabs": true。
     - 若需筛选器，请在 payload 中添加 "filters": ["状态", "城市", "关键词"] 或字符串。
     - 若需按钮组，请在 payload 中添加 "buttonGroup": { "primaryText": "新建", "secondaryText": "导出" } 或 "hasButtonGroup": true。
     - 分页器默认启用；若需关闭，请显式设置 "pagination": false。
     - **不要**为此拆分任务，直接在一个 draw_table 动作中完成。
   - payload 使用紧凑结构即可，例如：
     {
       "headers": ["姓名", "年龄", "城市"],
       "rows": [
         ["张三", "28", "北京"],
         ["李四", "32", "上海"]
       ],
       "columnTypes": ["Text", "Text", "Text"],
       "tabs": ["全部", "进行中"],
       "filters": ["状态", "城市", "关键词"],
       "buttonGroup": { "primaryText": "新建", "secondaryText": "导出" },
       "pagination": true,
       "rowHeight": { "header": 40, "body": 40 }
    }
   - 若表格存在“多选/勾选/选择列”（如左侧复选框列），在 payload 顶层加入 "rowAction": "multiple"。
   - 单选列请使用 "rowAction": "single"。
   - 不要把勾选列写进 headers/rows/columnTypes。
   - 标签列（Tag）请显式区分两类：
     - StatusTag：状态标签（默认使用状态标签的 L2 二级标签）。单元格建议用对象表示状态文案+颜色/主题，例如：
       { "text": "启用", "statusTheme": "Success 成功" } 或 { "statusText": "禁用", "statusColor": "red" }
     - TypeTag：类型/分类标签。单元格建议用对象表示文案+样式，例如：
       { "text": "企业", "tagType": "Outline 线型标签" }
     - 兼容：旧的 columnTypes "Tag" 视为 "StatusTag"。
   - 若表格包含操作列特征（表头为“操作/Action/Actions/Operation”，或单元格包含编辑/删除/查看/详情/更多/启用/禁用/配置/设置/授权/分配/下载/导出/复制/重置等动词），必须保留该列并将 headers 对应项写为“操作”，columnTypes 设为 "ActionText" 或 "ActionIcon"。
   - 当需要流式绘制表格时，先按行输出事件（每行一个 JSON），每行必须以 @@table_stream 开头：
    @@table_stream {"event":"table_start","headers":["姓名","年龄"],"rows":[["张三",28]],"columnTypes":["Text","Text"],"rowHeight":{"header":40,"body":40}}
     @@table_stream {"event":"table_row","row":["李四",32]}
     @@table_stream {"event":"table_done"}
   - 流式事件行不要出现在最终动作 JSON 中，但最终仍需输出标准 action JSON。
4. **标准表单/筛选表单创建优先走 draw_form(payload)**。
   - 当目标是创建查询表单、筛选区或编辑表单时，**直接调用 draw_form**，**无需读取 spec**。
   - 注意：如果用户明确要“筛选器组(filter-group)”或“筛选条”，优先使用 create_node 创建 "filter-group"（它是独立组件，不要用 draw_form 代替）。
   - rows 内 componentId 可使用 input / select / checkbox-group / radio-group / button，也可继续挂 figma-component。
   - **默认优先每行一个字段（单列）**：除非用户明确要求“双列/多列/紧凑排布”，否则 rows 的每个子数组只放 1 个字段/控件，不要把多个字段并排放在同一行。
   - draw_form payload 使用紧凑结构，例如：
     {
       "align": "top",
       "labelWidthPreset": "fill",
       "rows": [
         [
           { "componentId": "checkbox-group", "label": "偏好", "props": { "options": ["选项一", "选项二"], "checkedValues": "选项一" } }
         ],
         [
           { "componentId": "radio-group", "label": "类型", "props": { "options": ["选项一", "选项二"], "value": "选项一" } }
         ],
         [
           { "componentId": "input", "label": "姓名", "props": { "placeholder": "请输入姓名" } }
         ],
         [
           { "componentId": "select", "label": "城市", "props": { "value": "请选择" } }
         ]
       ]
     }
   - 若参考图里出现标准复选框/单选框/开关/勾选列表，不要手工画 vector/svg/path/text 勾号。
   - 多选项优先使用 checkbox-group；若是零散多选项行，也可以直接组合多个 checkbox。
   - 这类视觉敏感控件优先复用真实 Figma component（checkbox / checkbox-group / radio-group / figma-component + library.data-input.checkbox*）。
5. 当需要复刻设计系统组件内部结构时，先调用 inspect_component_structure / discover_component_structure 获取内部层级、文本、颜色/变量绑定和嵌套控件。
6. 对于非表格复杂结构或增量编辑，优先调用 apply_scene(payload)。
   - payload 建议是 Scene Envelope：
     {
       "version": "1.0",
       "intent": "create" | "edit",
       "scene"?: { "root": SceneNode },
       "patch"?: { "operations": SceneOperation[] }
     }
7. 当你只需要创建一个简单节点时，也可以调用 create_node(componentId, params, parentId?, children?)。
8. 只有当必须依赖父节点 ID 且无法一次性构建时，才分步执行。
9. 当任务包含多区块下钻（如：页面 + 表格区 + 图表区 + 表单区），必须先建立外部计划队列：
   - set_plan(payload): 初始化任务清单（pending/in_progress/done/failed）。
   - plan_next(payload): 让系统返回下一个可执行任务（考虑 dependsOn）。
   - update_plan(payload): 更新任务状态，可追加新下钻任务。
     - 状态更新：payload.updates=[{taskId,status,notes?}] 或 payload.{taskId,status,notes?}
     - 追加任务：payload.addTasks=[...]（兼容 appendTasks / tasks）
   - 执行中的动作尽量带 taskId（action.taskId 或 action.payload.taskId），便于系统自动回写状态。
10. 不要依赖你自己的记忆来追踪待办，下钻待办以系统计划队列为准。
11. 系统在复杂请求时可能自动初始化计划队列（auto plan）。你应基于最新 PlanState 执行，而不是重新创建冲突计划。
12. 对于已知任务类型，优先调用 execute_task(payload)（或 run_task）让系统按 task.type 执行，减少自由 JSON 拼装错误。
    - 仅支持 task.type: create_shell / expand_table_block / expand_form_block / expand_chart_block / expand_tabs_block。
    - 禁止使用未实现类型（如 expand_header_block / expand_actions_block），否则会直接失败。
    - 若任务已完成，系统会默认跳过；如需重跑请传 payload.force=true。
    - **表格+筛选器/分页器请求（单区块）不要 set_plan**，直接 draw_tabl 并带上 filters/pagination 参数。
    - 建议统一 payload 形态：payload.block.container/header/body/footer（旧字段继续兼容）。
    - expand_table_block 支持 header.tabs/actions + body.filters.items + body.table + footer.pagination。
    - expand_chart_block 支持 header.tabs/actions + body.charts[] + footer.notes。
    - expand_form_block 支持 body.rows[][] / body.fields[] + footer.actions。
    - expand_tabs_block 支持 body.tabs[] + header.actions + footer.actions/notes。
13. 用户当前轮消息可能包含“用户提供内容”摘要、表格结构(JSON)和图片附件。
    - 若当前 user.content 是图文数组，说明同轮附带了图片；你必须结合图片和文本一起判断。
    - 若消息里出现 "表格结构(JSON)"，优先使用其中的 headers/rows 生成表格，不要忽略已上传表格。
    - 若用户目标是“根据上传图片/表格生成”，直接 draw_tabl / draw_form / create_node 落地（表格/表单无需读取 spec）。

回复格式 (Response Format):
只回复一个 JSON 对象，包含 "thought" 和 "action"。
- "thought" 必须极短，优先 4-12 个汉字或等价短语。
- 不要复述用户需求，不要写“首先/现在/已获取/成功/需要”等空话。
- 用动作短语即可，例如：读input spec / 建基础input / 结束。
- 优先输出紧凑 JSON；不要使用 Markdown code block，不要输出 JSON 之外的解释。

示例 (Example):
{"thought":"读button spec","action":{"type":"read_specs","payload":{"ids":["button"]}}}

表格专用示例（固定链路）:
Step1:
{"thought":"画表格","action":{"type":"draw_tabl","payload":{"headers":["姓名","年龄","城市"],"rows":[["张三","28","北京"],["李四","32","上海"]],"columnTypes":["Text","Text","Text"]}}}
Step2:
{"thought":"结束","action":{"type":"finish"}}

Figma组件属性探测示例:
StepA:
{"thought":"探测Header属性","action":{"type":"discover_component_props","payload":{"tokens":["library.navigation.header"],"maxCount":1}}}
StepB:
{"thought":"先摆组件本体","action":{"type":"create_node","payload":{"componentId":"figma-component","params":{"componentToken":"library.navigation.header","width":1440}}}}

计划队列示例:
StepA:
{"thought":"建计划","action":{"type":"set_plan","payload":{"rootGoal":"生成客户管理页","tasks":[{"taskId":"t_shell","title":"创建页面外壳","type":"create_shell","status":"pending"},{"taskId":"t_list","title":"下钻客户列表区","type":"expand_table_block","dependsOn":["t_shell"],"status":"pending"}]}}}
StepB:
{"thought":"取下一任务","action":{"type":"plan_next","payload":{}}}
StepC:
{"thought":"回写状态","action":{"type":"update_plan","payload":{"taskId":"t_shell","status":"done"}}}
StepD:
{"thought":"执行任务","action":{"type":"execute_task","payload":{"taskId":"t_shell"}}}

重要:
- 创建新表格时优先 draw_table，避免输出冗长 table 子树。
- 新建表格时不要使用 apply_scene，直接 draw_table/draw_tabl。
- 多区块复杂任务必须先 set_plan，并通过 plan_next / update_plan 驱动执行。
- 若系统已自动创建 plan，优先 plan_next 并按 taskId 执行动作。
- 已知 task.type 尽量用 execute_task / run_task，让系统执行器落地。
- 仅允许 task.type: create_shell / expand_table_block / expand_form_block / expand_chart_block / expand_tabs_block。
- 不要使用未实现 task.type（如 expand_header_block / expand_actions_block）。
- 复杂结构优先用 apply_scene，一次提交完整 scene 或 patch。
- 简单创建可用 create_node。
- 每次只执行一个动作。
- "thought" 只保留当前动作意图，越短越好。
- 如果所有步骤都已完成，调用 { "type": "finish" }。
- 示例文字中的时间格式统一为 2019-10-12 00:00:00。
`;
    return prompt;
  };

  const buildSpecsInfo = (ids: string[], cache?: Set<string>, forceRead = false) => {
    const uniqueIds = Array.from(new Set(ids.map((id) => String(id)).filter((id) => id.trim())));
    const idsToLoad = forceRead || !cache ? uniqueIds : uniqueIds.filter((id) => !cache.has(id));
    let specsInfo = '';
    const registry = loadRegistry();
    idsToLoad.forEach((id: string) => {
      const def = registry.components[id];

      if (def && !isEnabledComponent(def)) {
        specsInfo += `[Component: ${id}] DISABLED. Use figma-component with dynamic properties.\n`;
      } else if (def) {
        specsInfo += `[Component: ${def.id}]\n`;
        specsInfo += `Description: ${def.description}\n`;
        specsInfo += `SchemaVersion: ${def.schemaVersion}\n`;
        specsInfo += `Selection Prompt: ${def.prompts?.description || def.description}\n`;
        specsInfo += `Usage Prompt: ${def.prompts?.usage || ''}\n`;
        specsInfo += `Params: ${JSON.stringify(def.params, null, 2)}\n`;
        const editableParams = Object.keys(def.params || {}).filter((key) =>
          isParamEditable(def, key, def.params[key])
        );
        const autoHiddenParams = Object.keys(def.params || {}).filter((key) =>
          !isParamEditable(def, key, def.params[key])
        );
        specsInfo += `EditableParams: ${JSON.stringify(editableParams)}\n`;
        if (autoHiddenParams.length > 0) {
          specsInfo += `AutoHiddenParams: ${JSON.stringify(autoHiddenParams)}\n`;
        }
        specsInfo += `Slots: ${JSON.stringify(def.slots || {}, null, 2)}\n`;
        specsInfo += `Capabilities: ${JSON.stringify(def.capabilities || {}, null, 2)}\n`;
        specsInfo += `FigmaBinding: ${JSON.stringify(def.figmaBinding || {}, null, 2)}\n`;
        if (def.figmaPropertySnapshot) {
          const snapshot = def.figmaPropertySnapshot;
          specsInfo += `FigmaPropertySnapshotMeta: ${JSON.stringify({
            token: snapshot.token,
            componentKey: snapshot.componentKey,
            inspectedAt: snapshot.inspectedAt,
            source: snapshot.source,
            propertyCount: Array.isArray(snapshot.properties) ? snapshot.properties.length : 0
          }, null, 2)}\n`;
          specsInfo += `FigmaPropertySnapshotProperties: ${JSON.stringify(snapshot.properties, null, 2)}\n`;
        }
        const examples = def.prompts?.examples || [];
        if (examples.length > 0) {
          specsInfo += `Examples:\n${examples.map(ex => `- ${ex}`).join('\n')}\n`;
        }
        if (id === 'figma-component') {
          const tokenRows = Object.entries(SEMANTIC_COMPONENT_TOKEN_PACK)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([token, semantic]) => {
              const base = BASE_COMPONENT_TOKEN_PACK[semantic.baseToken];
              return {
                token,
                baseToken: semantic.baseToken,
                componentKey: base?.componentKey || '',
                displayName: base?.displayName || semantic.baseToken,
                category: base?.category || '-'
              };
            });
          specsInfo += `ComponentTokenCatalog(count=${tokenRows.length}):\n`;
          specsInfo += tokenRows
            .map((row) => `- ${row.token} | name: ${row.displayName} | category: ${row.category} | componentKey: ${row.componentKey}`)
            .join('\n');
          specsInfo += `\nTokenHint: For figma-component, prefer params.componentToken (componentKey is fallback).\n`;
          specsInfo += `ActionHint: Before setting variantCriteria, call discover_component_props with payload { tokens: ["library.xxx.yyy"] } to get real properties.\n`;
          specsInfo += `FallbackRule: If property discovery fails, create figma-component with componentToken only, do not guess property names.\n`;
          specsInfo += `ActionHint: Do not output width/height for figma-component unless user explicitly requests size.\n`;
        }
        if (id === 'table' || id.startsWith('table-')) {
          specsInfo += `ActionHint: New table creation must use draw_table payload { headers, rows, columnTypes?, columnWidths? }. Avoid apply_scene table subtree.\n`;
        }
        if (id === 'form' || id.startsWith('form-')) {
          specsInfo += `ActionHint: New form creation can use draw_form payload { rows?: any[][], fields?: any[], sections?: { title?: string; rows?: any[][]; fields?: any[]; groups?: any[] }[], groups?: any[], groupLabelMode?: "all"|"first", layout?: "horizontal"|"vertical", align?: "top"|"left"|"right", labelWidthPreset?: "fill"|"default-80"|"medium-120"|"large-160"|"custom", footer?: { actions?: any[] } }. Default: prefer one field per row unless user requests multi-column/compact layout.\n`;
        }
        if (id === 'filter-group') {
          specsInfo += `ActionHint: 筛选器组(filter-group)是独立组件；创建它请使用 create_node(componentId="filter-group")，不要用 draw_form 代替（除非用户明确要“带字段标签的表单布局”）。\n`;
          specsInfo += `ParamHint: itemsText 格式为 逗号/换行分隔的 label:type；type 支持 select/input/search（search 会将下拉 icon 替换为 search icon）。\n`;
        }
        if (id === 'checkbox' || id === 'checkbox-group' || id === 'radio-group') {
          specsInfo += `ActionHint: Checkbox/radio visuals are sensitive. Prefer real Figma components; do not draw checkmarks or circles with vector/svg/path/text when checkbox/checkbox-group/radio-group or figma-component tokens are available.\n`;
          specsInfo += `ActionHint: For multi-select option rows, prefer checkbox-group or compose multiple checkbox components instead of custom icon + text.\n`;
        }
        specsInfo += `\n----------------\n`;
      } else {
        specsInfo += `[Component: ${id}] NOT FOUND.\n`;
      }
      if (cache) {
        cache.add(id);
      }
    });

    if (!specsInfo.trim()) {
      specsInfo =
        uniqueIds.length > 0
          ? `System: Specs already loaded for ${uniqueIds.join(', ')}.`
          : "System: No valid component IDs provided for read_specs. Please check COMPONENT_DEFS index.";
    }

    return { specsInfo, uniqueIds, idsToLoad };
  };

  const buildSpecsSystemMessage = (promptHintText: string, ids: string[], isCachedRead: boolean) => {
    const promptKinds = new Set<string>();
    if (/(表格|table)/i.test(promptHintText)) promptKinds.add('表格');
    if (/(表单|form)/i.test(promptHintText)) promptKinds.add('表单');
    if (/(图表|chart)/i.test(promptHintText)) promptKinds.add('图表');
    const inferredFromPrompt = promptKinds.size === 1 ? Array.from(promptKinds)[0] : null;
    const inferredFromIds = ids.some((id) => id === 'table' || id.startsWith('table-'))
      ? '表格'
      : ids.some((id) => id === 'form' || id.startsWith('form-'))
        ? '表单'
        : ids.some((id) => id === 'chart' || id.startsWith('chart-'))
          ? '图表'
          : null;
    const inferredKind = inferredFromPrompt || inferredFromIds;
    if (inferredKind) {
      return isCachedRead
        ? `[AI]: 已加载${normalizeSpecKind(inferredKind)}规范，跳过重复读取`
        : `[AI]: ${toSeriesSpecText(inferredKind)}`;
    }
    if (ids.length === 0) {
      return `[System]: read_specs received empty ids.`;
    }
    return isCachedRead
      ? `[System]: Specs already loaded for ${ids.join(', ')}`
      : `[System]: Loaded specs for ${ids.join(', ')}`;
  };

  const normalizeSpecIdsFromPayload = (payload: any) => {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.ids)) {
      return payload.ids;
    }
    if (payload && Array.isArray(payload.componentIds)) {
      return payload.componentIds;
    }
    if (typeof payload === 'string') {
      return [payload];
    }
    return [];
  };

  const isObject = (value: unknown): value is Record<string, any> =>
    typeof value === 'object' && value !== null;

  const toCellString = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const extractCellText = (value: unknown): string => {
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
        normalized.includes('编辑') ||
        normalized.includes('删除') ||
        normalized.includes('查看') ||
        normalized.includes('详情') ||
        normalized.includes('更多') ||
        normalized.includes('配置') ||
        normalized.includes('设置') ||
        normalized.includes('启用') ||
        normalized.includes('禁用') ||
        normalized.includes('重置') ||
        normalized.includes('下载') ||
        normalized.includes('导出') ||
        normalized.includes('复制') ||
        normalized.includes('更新') ||
        normalized.includes('保存') ||
        normalized.includes('发布') ||
        normalized.includes('撤回') ||
        normalized.includes('审核') ||
        normalized.includes('通过') ||
        normalized.includes('驳回') ||
        normalized.includes('拒绝') ||
        normalized.includes('分配') ||
        normalized.includes('授权') ||
        normalized.includes('解绑') ||
        normalized.includes('绑定') ||
        normalized.includes('打开') ||
        normalized.includes('关闭') ||
        normalized.includes('暂停') ||
        normalized.includes('恢复') ||
        normalized.includes('edit') ||
        normalized.includes('delete') ||
        normalized.includes('view') ||
        normalized.includes('detail') ||
        normalized.includes('more') ||
        normalized.includes('config') ||
        normalized.includes('setting') ||
        normalized.includes('enable') ||
        normalized.includes('disable') ||
        normalized.includes('reset') ||
        normalized.includes('download') ||
        normalized.includes('export') ||
        normalized.includes('copy') ||
        normalized.includes('update') ||
        normalized.includes('save') ||
        normalized.includes('publish') ||
        normalized.includes('revoke') ||
        normalized.includes('approve') ||
        normalized.includes('reject') ||
        normalized.includes('assign') ||
        normalized.includes('authorize') ||
        normalized.includes('unbind') ||
        normalized.includes('bind') ||
        normalized.includes('open') ||
        normalized.includes('close') ||
        normalized.includes('pause') ||
        normalized.includes('resume') ||
        normalized.includes('action') ||
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
        normalized.includes('成功') ||
        normalized.includes('失败') ||
        normalized.includes('告警') ||
        normalized.includes('启用') ||
        normalized.includes('禁用') ||
        normalized.includes('停止') ||
        normalized.includes('处理中') ||
        normalized.includes('等待') ||
        normalized.includes('success') ||
        normalized.includes('error') ||
        normalized.includes('warning') ||
        normalized.includes('pending') ||
        normalized.includes('processing') ||
        normalized.includes('disabled') ||
        normalized.includes('enabled')
      );
    });
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

    return 'Text';
  };

  const inferColumnTypesFromRows = (
    headers: string[],
    rows: unknown[][],
    currentTypes?: string[]
  ): string[] => {
    const normalizedTypes = Array.isArray(currentTypes)
      ? currentTypes.map((t) => String(t || '').trim())
      : [];
    const hasExplicitNonText = normalizedTypes.some((t) => t && t.toLowerCase() !== 'text');
    const allTextOrEmpty = normalizedTypes.every((t) => !t || t.toLowerCase() === 'text');
    const shouldInferAll = !hasExplicitNonText && allTextOrEmpty;

    return headers.map((header, index) => {
      const explicit = normalizedTypes[index];
      if (explicit && explicit.toLowerCase() !== 'text') return explicit;
      if (!shouldInferAll && explicit && explicit.toLowerCase() === 'text') return explicit;
      const columnValues = rows.map((row) => row?.[index]);
      const inferred = inferColumnType(header, columnValues);
      return inferred || explicit || 'Text';
    });
  };

  type TagColumnKind = 'status' | 'type';

  const resolveTagColumnKind = (columnType: unknown, headerText: string): TagColumnKind => {
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

  const resolveStatusThemeFromColor = (value: unknown): string | null => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return null;
    if (normalized.includes('green') || normalized.includes('success') || normalized.includes('成功') || normalized.includes('启用')) {
      return 'Success 成功';
    }
    if (normalized.includes('orange') || normalized.includes('yellow') || normalized.includes('warning') || normalized.includes('告警') || normalized.includes('警告')) {
      return 'Warning 告警';
    }
    if (normalized.includes('red') || normalized.includes('error') || normalized.includes('错误') || normalized.includes('失败') || normalized.includes('禁用')) {
      return 'Error 错误';
    }
    if (normalized.includes('gray') || normalized.includes('grey') || normalized.includes('stop') || normalized.includes('停止') || normalized.includes('终止')) {
      return 'Stop 停止';
    }
    if (normalized.includes('loading') || normalized.includes('加载')) return 'Loading 加载中';
    if (normalized.includes('waiting') || normalized.includes('待启用')) return 'Waiting 待启用';
    if (normalized.includes('processing') || normalized.includes('pending') || normalized.includes('等待') || normalized.includes('进行中') || normalized.includes('blue')) {
      return 'Processing 等待中';
    }
    return null;
  };

  const extractTagCellPayload = (
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
      return {
        text: extractCellText(value),
        kind: fallbackKind,
        tagColor: fallbackKind === 'status' ? 'green' : undefined
      };
    }

    const obj = value as any;
    const text = extractCellText(obj);

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
    const statusTheme =
      typeof statusThemeRaw === 'string' && statusThemeRaw.trim()
        ? statusThemeRaw.trim()
        : resolveStatusThemeFromColor(tagColorRaw) || undefined;

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

    return {
      text,
      kind,
      componentToken,
      statusTheme,
      statusType,
      statusState,
      tagType,
      tagColor
    };
  };

  const tableTypeToComponentId = (type?: string): string => {
    const normalized = (type || 'Text').toLowerCase();
    if (
      normalized.includes('actionicon') ||
      normalized.includes('action-icon') ||
      normalized.includes('action_icon') ||
      normalized.includes('操作图标')
    ) {
      return 'table-cell-action-icon';
    }
    if (
      normalized.includes('actiontext') ||
      normalized.includes('action-text') ||
      normalized.includes('action_text') ||
      normalized.includes('操作文字') ||
      normalized.includes('operation') ||
      normalized.includes('action') ||
      normalized.includes('操作')
    ) {
      return 'table-cell-action-text';
    }
    if (normalized.includes('avatar') || normalized.includes('user') || normalized.includes('owner')) {
      return 'table-cell-avatar';
    }
    if (normalized.includes('input') || normalized.includes('edit')) {
      return 'table-cell-input';
    }
    if (
      normalized.includes('tag') ||
      normalized.includes('state') ||
      normalized.includes('badge') ||
      normalized.includes('status')
    ) {
      return 'table-cell-tag';
    }
    return 'table-cell';
  };

  const parseAgentActionJson = (rawContent: string): any => {
    let cleanContent = String(rawContent || '').trim();

    const jsonBlockMatch = cleanContent.match(/```json\n([\s\S]*?)\n```/);
    if (jsonBlockMatch) {
      cleanContent = jsonBlockMatch[1];
    } else {
      cleanContent = cleanContent.replace(/```json\n?|\n?```/g, '').trim();
    }

    const repairJsonDelimiters = (candidate: string): string => {
      let result = '';
      const stack: string[] = [];
      let inString = false;
      let escaping = false;

      for (const char of candidate) {
        if (escaping) {
          result += char;
          escaping = false;
          continue;
        }
        if (char === '\\') {
          result += char;
          if (inString) escaping = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          result += char;
          continue;
        }
        if (!inString && (char === '{' || char === '[')) {
          stack.push(char);
          result += char;
          continue;
        }
        if (!inString && (char === '}' || char === ']')) {
          const expectedOpen = char === '}' ? '{' : '[';
          if (stack.length > 0 && stack[stack.length - 1] === expectedOpen) {
            stack.pop();
            result += char;
          }
          continue;
        }
        result += char;
      }

      while (stack.length > 0) {
        const open = stack.pop();
        result += open === '{' ? '}' : ']';
      }
      return result;
    };

    const firstBrace = cleanContent.indexOf('{');
    const lastBrace = cleanContent.lastIndexOf('}');
    if (firstBrace === -1) {
      return JSON.parse(cleanContent);
    }
    if (lastBrace === -1 || lastBrace < firstBrace) {
      return JSON.parse(repairJsonDelimiters(cleanContent.substring(firstBrace)));
    }

    let endIndex = lastBrace;
    while (endIndex >= firstBrace) {
      const candidate = cleanContent.substring(firstBrace, endIndex + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        try {
          return JSON.parse(repairJsonDelimiters(candidate));
        } catch {
          // continue trimming trailing closers/text
        }
        endIndex = cleanContent.lastIndexOf('}', endIndex - 1);
      }
    }

    return JSON.parse(repairJsonDelimiters(cleanContent.substring(firstBrace, lastBrace + 1)));
  };

  const tableComponentIdToType = (componentId?: string, props?: unknown): string => {
    if (componentId === 'table-cell-tag') {
      const obj = isObject(props) ? (props as any) : {};
      const kind = String(obj.tagKind ?? obj.kind ?? '').trim().toLowerCase();
      if (kind.includes('type')) return 'TypeTag';
      if (kind.includes('status')) return 'StatusTag';

      const token = String(obj.componentToken || '').trim().toLowerCase();
      if (token.includes('status-tag') || token.includes('status_tag') || token.includes('status.tag')) return 'StatusTag';
      if (token.includes('other-tag') || token.includes('other_tag') || token.includes('other.tag')) return 'TypeTag';
      if (token.includes('data-display-tag') || token.endsWith('tag')) return 'TypeTag';
      return 'Tag';
    }
    if (componentId === 'table-cell-avatar') return 'Avatar';
    if (componentId === 'table-cell-input') return 'Input';
    if (componentId === 'table-cell-action-text') return 'ActionText';
    if (componentId === 'table-cell-action-icon') return 'ActionIcon';
    return 'Text';
  };

  const normalizeRowsByHeaders = (
    rawRows: unknown,
    headers: string[]
  ): unknown[][] => {
    if (!Array.isArray(rawRows)) return [];

    return rawRows.map((row) => {
      if (Array.isArray(row)) {
        return headers.map((_, i) => row[i]);
      }
      if (isObject(row)) {
        return headers.map((key) => row[key]);
      }
      return headers.map(() => row);
    });
  };

  const getPositiveNumber = (value: unknown): number | null => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const buildTableComponentFromPayload = (
    payload: any,
    options?: { minRowCount?: number }
  ): any | null => {
    const source = isObject(payload?.schema) ? payload.schema : payload;
    if (!isObject(source)) return null;

    const rawColumns = Array.isArray(source.columns) ? source.columns : null;
    const rawHeaders =
      Array.isArray(source.headers) ? source.headers :
      (rawColumns ? rawColumns.map((c: any, i: number) => c?.title || c?.header || c?.name || `列${i + 1}`) : null);

    let headers = (rawHeaders || []).map((h: any, i: number) => String(h || `列${i + 1}`));

    let rows = normalizeRowsByHeaders(source.rows ?? source.data ?? [], headers);

    if ((!headers || headers.length === 0) && rows.length > 0) {
      const first = rows[0];
      if (Array.isArray(first)) {
        headers = first.map((_, i) => `列${i + 1}`);
      }
    }

    if (!headers || headers.length === 0) return null;
    const minRowCount = typeof options?.minRowCount === 'number' ? options.minRowCount : 10;
    const targetRowCount = minRowCount > 0 ? Math.max(rows.length, minRowCount) : rows.length;
    if (rows.length < targetRowCount) {
      if (rows.length === 0) {
        rows = Array.from({ length: targetRowCount }).map(() => headers.map(() => ''));
      } else {
        rows = Array.from({ length: targetRowCount }).map((_, index) =>
          Array.isArray(rows[index % rows.length])
            ? [...(rows[index % rows.length] as any[])]
            : headers.map(() => '')
        );
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
    const columnTypes = inferColumnTypesFromRows(headers, rows, columnTypesBase);
    const columnWidths: number[] =
      Array.isArray(source.columnWidths) ? source.columnWidths.map((w: any) => Number(w)) :
      (rawColumns ? rawColumns.map((c: any) => Number(c?.width || 0)) : headers.map(() => 0));

    const hasPagination = source.pagination === undefined ? true : Boolean(source.pagination);
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
      source.rowAction ??
      source.rowSelection ??
      source.selection ??
      source.selectionMode;
    const rowActionText =
      rowActionRaw === undefined || rowActionRaw === null ? '' : String(rowActionRaw).trim();
    const rowAction = rowActionText ? rowActionText : undefined;

    const children = headers.map((header, colIndex) => {
      const type = columnTypes[colIndex] || 'Text';
      const cellComponentId = tableTypeToComponentId(type);
      const isActionColumn = cellComponentId === 'table-cell-action-text' || cellComponentId === 'table-cell-action-icon';
      const widthRaw = Number(columnWidths[colIndex]);
      const hasWidth = Number.isFinite(widthRaw) && widthRaw > 0;
      const width = hasWidth ? widthRaw : undefined;
      const tagColumnKind: TagColumnKind | null =
        cellComponentId === 'table-cell-tag' ? resolveTagColumnKind(type, header) : null;
      const headerText = isActionColumn ? '操作' : header;

      const columnChildren: any[] = [
        {
          componentId: 'table-header-cell',
          params: {
            text: headerText,
            ...(hasWidth && !isActionColumn ? { width } : {}),
            height: headerHeight
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
          } else {
            baseParams.tagType = tagPayload.tagType || 'Outline 线型标签';
          }

          columnChildren.push({
            componentId: 'table-cell-tag',
            params: baseParams
          });
          return;
        }
        if (cellComponentId === 'table-cell-avatar') {
          columnChildren.push({
            componentId: 'table-cell-avatar',
            params: {
              height: bodyHeight,
              text: value || 'User',
              ...(hasWidth && !isActionColumn ? { width } : {})
            }
          });
          return;
        }
        if (cellComponentId === 'table-cell-input') {
          columnChildren.push({
            componentId: 'table-cell-input',
            params: {
              height: bodyHeight,
              value,
              ...(hasWidth && !isActionColumn ? { width } : {})
            }
          });
          return;
        }
        if (cellComponentId === 'table-cell-action-text') {
          columnChildren.push({
            componentId: 'table-cell-action-text',
            params: {
              height: bodyHeight,
              text: value || '编辑 删除 …'
            }
          });
          return;
        }
        if (cellComponentId === 'table-cell-action-icon') {
          columnChildren.push({
            componentId: 'table-cell-action-icon',
            params: {
              height: bodyHeight,
              text: value
            }
          });
          return;
        }
        columnChildren.push({
          componentId: 'table-cell',
          params: {
            height: bodyHeight,
            text: value,
            ...(hasWidth && !isActionColumn ? { width } : {})
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

  const buildTableRowCellsFromPayload = (
    headers: string[],
    row: any[],
    columnTypes: string[],
    columnWidths: number[],
    rowHeight?: { header?: number; body?: number }
  ): any[] => {
    const rowComponent = buildTableComponentFromPayload(
      {
        headers,
        rows: [row],
        columnTypes,
        columnWidths,
        rowHeight
      },
      { minRowCount: 1 }
    );
    if (!rowComponent || !Array.isArray(rowComponent.children)) return [];
    return rowComponent.children.map((col: any) => (Array.isArray(col.children) ? col.children[1] : null)).filter(Boolean);
  };

  const buildStreamTableScene = (
    payload: any,
    tableId: string
  ): { root: any; columnNodeIds: string[] } | null => {
    const tableComponent = buildTableComponentFromPayload(payload, { minRowCount: 1 });
    if (!tableComponent || !Array.isArray(tableComponent.children)) return null;
    const columnNodeIds: string[] = [];
    const columns = tableComponent.children.map((col: any, colIndex: number) => {
      const columnNodeId = `${tableId}_col_${colIndex + 1}`;
      columnNodeIds.push(columnNodeId);
      const cells = Array.isArray(col.children)
        ? col.children.map((cell: any, rowIndex: number) => ({
            nodeId: `${tableId}_col_${colIndex + 1}_cell_${rowIndex}`,
            componentId: cell.componentId,
            props: cell.params || {}
          }))
        : [];
      return {
        nodeId: columnNodeId,
        componentId: col.componentId,
        props: col.params || {},
        children: cells
      };
    });
    return {
      root: {
        nodeId: tableId,
        componentId: tableComponent.componentId,
        props: tableComponent.params || {},
        children: columns
      },
      columnNodeIds
    };
  };

  const normalizeStreamTablePayload = (event: StreamTableEvent): {
    headers: string[];
    rows: any[][];
    columnTypes: string[];
    columnWidths: number[];
    rowHeight: { header?: number; body?: number };
  } | null => {
    if (event.event !== 'table_start') return null;
    const headers = (event.headers || []).map((h: any) => String(h));
    if (headers.length === 0) return null;
    const rows = Array.isArray(event.rows) ? event.rows : [];
    const normalizedRows = normalizeRowsByHeaders(rows, headers);
    const columnTypesBase = Array.isArray(event.columnTypes)
      ? event.columnTypes.map((t: any) => String(t))
      : headers.map(() => 'Text');
    const columnTypes = inferColumnTypesFromRows(headers, normalizedRows, columnTypesBase);
    const columnWidths = Array.isArray(event.columnWidths)
      ? event.columnWidths.map((w: any) => Number(w))
      : headers.map(() => 0);
    const rowHeight = isObject(event.rowHeight) ? (event.rowHeight as any) : {};
    return { headers, rows: normalizedRows, columnTypes, columnWidths, rowHeight };
  };

  const getBlockSource = (payload: any): any | null => {
    const source = isObject(payload?.block) ? payload.block : payload;
    return isObject(source) ? source : null;
  };

  const getBlockBody = (source: any): any => {
    return isObject(source?.body) ? source.body : source;
  };

  const resolveBlockContainerMeta = (
    source: any,
    fallbackTitle: string,
    defaultWidth: number
  ): { title: string; width: number } => {
    const container = isObject(source?.container) ? source.container : {};
    const title = String(container.title || source.title || fallbackTitle || '区块');
    const widthRaw = Number(container.width ?? source.width);
    const width = Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : defaultWidth;
    return { title, width };
  };

  const toButtonFromItem = (
    item: any,
    fallbackLabel: string,
    defaultVariant: string
  ): any => {
    const actionObj = isObject(item) ? item : {};
    const props = isObject(actionObj.props) ? actionObj.props : {};
    return {
      componentId: 'button',
      params: {
        label: String(props.label || actionObj.label || actionObj.name || fallbackLabel),
        variant: String(props.variant || actionObj.variant || defaultVariant)
      }
    };
  };

  const buildHeaderSectionChildren = (header: any): any[] => {
    const headerObj = isObject(header) ? header : {};
    const tabs = Array.isArray(headerObj.tabs) ? headerObj.tabs : [];
    const actions = Array.isArray(headerObj.actions) ? headerObj.actions : [];
    const children: any[] = [];

    if (tabs.length > 0) {
      children.push({
        componentId: 'layout',
        params: {
          direction: 'horizontal',
          spacing: 6
        },
        children: tabs.map((tab: any, index: number) => {
          const tabObj = isObject(tab) ? tab : {};
          return {
            componentId: 'button',
            params: {
              label: String(tabObj.label || tabObj.name || `Tab ${index + 1}`),
              variant: tabObj.active ? 'primary' : 'secondary'
            }
          };
        })
      });
    }

    if (actions.length > 0) {
      children.push({
        componentId: 'layout',
        params: {
          direction: 'horizontal',
          spacing: 6
        },
        children: actions.map((item: any, index: number) =>
          toButtonFromItem(item, `Action ${index + 1}`, 'secondary')
        )
      });
    }

    return children;
  };

  const toControlNodeFromItem = (
    item: any,
    index: number,
    options?: {
      inputPlaceholder?: string;
      selectValue?: string;
      buttonLabelPrefix?: string;
      buttonVariant?: string;
      fallbackTextPrefix?: string;
      includeFallbackText?: boolean;
    }
  ): any | null => {
    const opts = options || {};
    const itemObj = isObject(item) ? item : {};
    const props = isObject(itemObj.props) ? itemObj.props : {};
    const cid = String(itemObj.componentId || itemObj.type || '').toLowerCase();

    if (cid.includes('input') || cid.includes('search')) {
      return {
        componentId: 'input',
        params: {
          placeholder: String(props.placeholder || itemObj.placeholder || opts.inputPlaceholder || '请输入')
        }
      };
    }

    if (cid.includes('select') || cid.includes('dropdown')) {
      return {
        componentId: 'select',
        params: {
          value: String(props.value || itemObj.value || opts.selectValue || '请选择')
        }
      };
    }

    if (cid.includes('button') || cid.includes('btn')) {
      const labelPrefix = opts.buttonLabelPrefix || '按钮';
      return {
        componentId: 'button',
        params: {
          label: String(props.label || itemObj.label || `${labelPrefix}${index + 1}`),
          variant: String(props.variant || itemObj.variant || opts.buttonVariant || 'secondary')
        }
      };
    }

    if (opts.includeFallbackText) {
      const textPrefix = opts.fallbackTextPrefix || '项';
      return {
        componentId: 'text',
        params: {
          text: String(itemObj.label || itemObj.text || itemObj.name || `${textPrefix}${index + 1}`)
        }
      };
    }

    return null;
  };

  const buildTableBlockComponentFromPayload = (payload: any, fallbackTitle: string): any | null => {
    const source = getBlockSource(payload);
    if (!source) return null;

    const body = getBlockBody(source);
    const tablePayload = isObject(body?.table)
      ? body.table
      : isObject(source.table)
        ? source.table
        : body;
    const tableComponent = buildTableComponentFromPayload(tablePayload);
    if (!tableComponent) return null;

    const blockChildren: any[] = [];

    const rowChildren = buildHeaderSectionChildren(source.header);
    if (rowChildren.length > 0) {
      blockChildren.push({
        componentId: 'layout',
        params: {
          direction: 'horizontal',
          spacing: 12,
          paddingBottom: 8
        },
        children: rowChildren
      });
    }

    const filters = isObject(body?.filters)
      ? body.filters
      : isObject(source.filters)
        ? source.filters
        : {};
    const rawFilterItems = Array.isArray(filters.items) ? filters.items : null;
    const filterChildren: any[] = [];

    if (rawFilterItems && rawFilterItems.length > 0) {
      rawFilterItems.forEach((item: any, index: number) => {
        const node = toControlNodeFromItem(item, index, {
          inputPlaceholder: '搜索...',
          selectValue: '全部',
          buttonLabelPrefix: '按钮',
          buttonVariant: 'primary',
          includeFallbackText: false
        });
        if (node) filterChildren.push(node);
      });
    } else if ((body as any)?.includeDefaultFilters === true || source.includeDefaultFilters === true) {
      filterChildren.push(
        { componentId: 'input', params: { placeholder: '搜索...' } },
        { componentId: 'select', params: { value: '全部' } },
        { componentId: 'button', params: { label: '查询', variant: 'primary' } }
      );
    }

    if (filterChildren.length > 0) {
      blockChildren.push({
        componentId: 'layout',
        params: {
          direction: 'horizontal',
          spacing: 8,
          paddingBottom: 8
        },
        children: filterChildren
      });
    }

    blockChildren.push(tableComponent);

    const footer = isObject(source.footer) ? source.footer : {};
    const pagination = isObject(footer.pagination) ? footer.pagination : null;
    if (pagination) {
      const page = Number(pagination.page);
      const total = Number(pagination.total);
      const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
      const safeTotal = Number.isFinite(total) && total >= 0 ? Math.floor(total) : 0;
      blockChildren.push({
        componentId: 'layout',
        params: {
          direction: 'horizontal',
          spacing: 8,
          paddingTop: 8
        },
        children: [
          { componentId: 'text', params: { text: `第 ${safePage} 页 / 共 ${safeTotal} 条` } },
          { componentId: 'button', params: { label: '上一页', variant: 'secondary' } },
          { componentId: 'button', params: { label: '下一页', variant: 'secondary' } }
        ]
      });
    }

    const container = isObject(source?.container) ? source.container : {};
    const titleRaw =
      typeof container.title === 'string' && container.title.trim()
        ? container.title
        : typeof source.title === 'string' && source.title.trim()
          ? source.title
          : fallbackTitle || '';
    const title = String(titleRaw || '').trim();
    const widthRaw = Number(container.width ?? source.width);
    const width = Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : 980;

    return {
      componentId: 'card',
      params: title ? { title, width } : { width },
      children: blockChildren
    };
  };

  const normalizeFormAlignValue = (value: unknown): 'top' | 'left' | 'right' => {
    const normalized = String(value || '').trim().toLowerCase();
    if (
      normalized.includes('top') ||
      normalized.includes('顶部') ||
      normalized.includes('vertical') ||
      normalized.includes('纵向')
    ) {
      return 'top';
    }
    if (normalized.includes('right') || normalized.includes('右')) return 'right';
    return 'left';
  };

  const normalizeFormLabelWidthPresetValue = (
    value: unknown
  ): 'fill' | 'default-80' | 'medium-120' | 'large-160' | 'custom' => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized || normalized === 'custom') return 'custom';
    if (normalized.includes('fill') || normalized.includes('跟随')) return 'fill';
    if (normalized.includes('160') || normalized.includes('large')) return 'large-160';
    if (normalized.includes('120') || normalized.includes('medium')) return 'medium-120';
    if (normalized.includes('80') || normalized.includes('default')) return 'default-80';
    return 'custom';
  };

  const resolveFormLabelWidthValue = (preset: unknown, labelWidth: unknown, fallback: number): number => {
    const explicit = Number(labelWidth);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    switch (normalizeFormLabelWidthPresetValue(preset)) {
      case 'default-80':
        return 80;
      case 'medium-120':
        return 120;
      case 'large-160':
        return 160;
      default:
        return fallback;
    }
  };

  const SECTION_TITLE_COMPONENT_KEY = 'f02c3053469b8fadc3b6113a508e1b7b98330d95';
  const SEGMENTED_PICKER_COMPONENT_KEY = '94125fa758354931512313d1bb6ce37aae02b8c7';
  const DELETE_ICON_COMPONENT_TOKEN = 'table.cell.icon.delete';

  const resolveGroupLabelMode = (value: unknown): 'all' | 'first' => {
    if (value === false) return 'first';
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return 'all';
    if (normalized === 'first' || normalized === 'first-only' || normalized === 'firstonly') return 'first';
    if (normalized.includes('仅首') || normalized.includes('首行') || normalized.includes('只展示首')) return 'first';
    return 'all';
  };

  const buildOptionsTextFromValue = (value: unknown, fallback = '选项一,选项二'): string => {
    if (Array.isArray(value)) {
      const items = value.map((item) => String(item || '').trim()).filter(Boolean);
      return items.length > 0 ? items.join(',') : fallback;
    }
    const text = String(value || '').trim();
    return text || fallback;
  };

  const buildInputParamsFromSource = (props: Record<string, any>, itemObj: Record<string, any>) => ({
    placeholder: String(props.placeholder || itemObj.placeholder || '请输入'),
    value: String(props.value || itemObj.value || ''),
    size: String(props.size || itemObj.size || 'Default 32'),
    state: String(props.state || itemObj.state || 'Default 默认'),
    filled: Boolean(props.filled ?? itemObj.filled),
    error: Boolean(props.error ?? itemObj.error),
    disabled: Boolean(props.disabled ?? itemObj.disabled),
    showPrefix: Boolean(props.showPrefix ?? props.prefix ?? itemObj.showPrefix ?? itemObj.prefix),
    prefixText: String(props.prefixText || itemObj.prefixText || ''),
    showSuffix: Boolean(props.showSuffix ?? props.suffix ?? itemObj.showSuffix ?? itemObj.suffix),
    suffixText: String(props.suffixText || itemObj.suffixText || '')
  });

  const extractExplicitItemTopLevelParams = (itemObj: Record<string, any>): Record<string, any> => {
    const topLevelParams = { ...itemObj };
    delete topLevelParams.componentId;
    delete topLevelParams.props;
    delete topLevelParams.params;
    delete topLevelParams.children;
    return topLevelParams;
  };

  const buildExplicitComponentParams = (itemObj: Record<string, any>): Record<string, any> => {
    const props = isObject(itemObj.props) ? itemObj.props as Record<string, any> : {};
    const nestedParams = isObject(itemObj.params) ? itemObj.params as Record<string, any> : {};
    const topLevelParams = extractExplicitItemTopLevelParams(itemObj);
    return {
      ...props,
      ...nestedParams,
      ...topLevelParams
    };
  };

  const buildExplicitFormFieldParams = (
    itemObj: Record<string, any>,
    index: number,
    sharedFieldParams: Record<string, any>
  ): Record<string, any> => {
    const props = isObject(itemObj.props) ? itemObj.props as Record<string, any> : {};
    const nestedParams = isObject(itemObj.params) ? itemObj.params as Record<string, any> : {};
    const topLevelParams = extractExplicitItemTopLevelParams(itemObj);
    delete topLevelParams.label;
    delete topLevelParams.title;
    delete topLevelParams.name;

    const mergedParams: Record<string, any> = {
      ...props,
      ...nestedParams,
      ...topLevelParams
    };

    const fieldLabel = String(
      nestedParams.label ??
      itemObj.label ??
      itemObj.title ??
      itemObj.name ??
      `字段${index + 1}`
    );

    const controlType = String(mergedParams.controlType || '').trim().toLowerCase();
    if (controlType === 'button') {
      if (!mergedParams.buttonLabel) {
        mergedParams.buttonLabel = String(
          props.label ??
          nestedParams.buttonLabel ??
          topLevelParams.buttonLabel ??
          itemObj.value ??
          '按钮'
        );
      }
      if (!mergedParams.buttonVariant) {
        mergedParams.buttonVariant = String(
          props.variant ??
          nestedParams.buttonVariant ??
          topLevelParams.buttonVariant ??
          topLevelParams.variant ??
          'secondary'
        );
      }
    }

    return {
      ...sharedFieldParams,
      ...mergedParams,
      label: fieldLabel
    };
  };

  const buildFormBlockComponentFromPayload = (payload: any, fallbackTitle: string): any | null => {
    const resolveLibraryFormControlToken = (rawType: string): string | null => {
      const normalized = String(rawType || '').trim().toLowerCase();
      if (!normalized) return null;

      const rules: Array<[string, string]> = [
        ['timepicker-menu', 'library.data-input.timepicker-menu'],
        ['checkbox-group', 'library.data-input.checkbox-group'],
        ['radio-group', 'library.data-input.radio-group'],
        ['tree-select', 'library.data-input.treeselect'],
        ['treeselect', 'library.data-input.treeselect'],
        ['input-number', 'library.data-input.inputnumber'],
        ['inputnumber', 'library.data-input.inputnumber'],
        ['datetime', 'library.data-input.datetimepicker-segemented'],
        ['datepicker', 'library.data-input.datepicker'],
        ['datepick', 'library.data-input.datepicker'],
        ['autocomplete', 'library.data-input.autocomplete'],
        ['cascader', 'library.data-input.cascader'],
        ['checkbox', 'library.data-input.checkbox'],
        ['drag', 'library.data-input.drag'],
        ['image', 'library.data-input.image'],
        ['radio', 'library.data-input.radio'],
        ['search', 'library.data-input.search'],
        ['segmented', 'library.data-input.segmented-picker'],
        ['slider', 'library.data-input.slider'],
        ['switch', 'library.data-input.switch'],
        ['textarea', 'library.data-input.textarea'],
        ['timepicker', 'library.data-input.timepicker'],
        ['transfer', 'library.data-input.transfer']
      ];

      const matched = rules.find(([keyword]) => normalized.includes(keyword));
      return matched ? matched[1] : null;
    };

    const isSegmentedPickerItem = (item: any): boolean => {
      const itemObj = isObject(item) ? item : {};
      const props = isObject(itemObj.props) ? itemObj.props : {};
      const rawType = String(itemObj.componentId || itemObj.type || '').trim().toLowerCase();
      if (rawType.includes('segmented')) return true;
      const componentKey = String(props.componentKey || itemObj.componentKey || '');
      const componentToken = String(props.componentToken || itemObj.componentToken || itemObj.token || '');
      return componentKey === SEGMENTED_PICKER_COMPONENT_KEY || componentToken.includes('segmented');
    };

    const buildControlComponentFromItem = (item: any, index: number): any | null => {
      const itemObj = isObject(item) ? item : { componentId: 'input', props: { value: String(item ?? '') } };
      const explicitComponentId = String(itemObj.componentId || '').trim();
      if (explicitComponentId) {
        if (explicitComponentId === 'figma-component') {
          return { componentId: 'figma-component', params: buildExplicitComponentParams(itemObj) };
        }
        if (explicitComponentId === 'button' || explicitComponentId === 'text' || explicitComponentId === 'input' || explicitComponentId === 'select' || explicitComponentId === 'checkbox-group' || explicitComponentId === 'radio-group') {
          return { componentId: explicitComponentId, params: buildExplicitComponentParams(itemObj) };
        }
      }
      const props = isObject(itemObj.props) ? itemObj.props : {};
      const rawType = String(itemObj.componentId || itemObj.type || '').trim().toLowerCase();
      if (rawType.includes('segmented')) {
        return {
          componentId: 'figma-component',
          params: {
            ...buildExplicitComponentParams(itemObj),
            componentToken: 'library.data-input.segmented-picker',
            componentKey: String(props.componentKey || itemObj.componentKey || SEGMENTED_PICKER_COMPONENT_KEY)
          }
        };
      }
      if (rawType.includes('select')) {
        return { componentId: 'select', params: buildExplicitComponentParams(itemObj) };
      }
      if (rawType.includes('checkbox')) {
        return { componentId: 'checkbox-group', params: buildExplicitComponentParams(itemObj) };
      }
      if (rawType.includes('radio')) {
        return { componentId: 'radio-group', params: buildExplicitComponentParams(itemObj) };
      }
      if (rawType.includes('button') || rawType.includes('btn')) {
        return toButtonFromItem(itemObj, `操作${index + 1}`, 'secondary');
      }
      return { componentId: 'input', params: buildExplicitComponentParams(itemObj) };
    };

    const buildFormComponentFromSource = (formSource: any): any | null => {
      const formObj = isObject(formSource) ? formSource : {};
      const body = getBlockBody(formObj);
      const align = normalizeFormAlignValue(body.align ?? formObj.align ?? body.layout ?? formObj.layout ?? 'top');
      const labelWidthPreset = normalizeFormLabelWidthPresetValue(body.labelWidthPreset ?? formObj.labelWidthPreset);
      const layout = String(body.layout || formObj.layout || (align === 'top' ? 'vertical' : 'horizontal'));
      const rowSpacingRaw = Number(body.rowSpacing ?? formObj.rowSpacing);
      const columnSpacingRaw = Number(body.columnSpacing ?? body.spacing ?? formObj.columnSpacing ?? formObj.spacing);
      const labelWidthRaw = resolveFormLabelWidthValue(labelWidthPreset, body.labelWidth ?? formObj.labelWidth, 96);
      const controlWidthRaw = Number(body.controlWidth ?? formObj.controlWidth);
      const showColon = body.showColon ?? formObj.showColon ?? false;

      const sharedFieldParams = {
        align,
        layout,
        labelAlign: align === 'right' ? 'right' : 'left',
        labelWidthPreset,
        labelWidth: align === 'top' ? 0 : labelWidthRaw,
        controlWidth: Number.isFinite(controlWidthRaw) && controlWidthRaw > 0 ? controlWidthRaw : 240,
        showColon: Boolean(showColon)
      };

      const rows = Array.isArray(body.rows)
        ? body.rows
        : Array.isArray(body.fields)
          ? [body.fields]
          : isObject(body.filters) && Array.isArray((body.filters as any).items)
            ? [(body.filters as any).items]
            : Array.isArray(formObj.rows)
              ? formObj.rows
              : Array.isArray(formObj.fields)
                ? [formObj.fields]
                : isObject(formObj.filters) && Array.isArray((formObj.filters as any).items)
                  ? [(formObj.filters as any).items]
                  : [];

      const buildRowChildFromItem = (item: any, index: number): any | null => {
        const itemObj = isObject(item) ? item : { label: String(item || '') };
        const props = isObject(itemObj.props) ? itemObj.props : {};
        const explicitComponentId = String(itemObj.componentId || '').trim();
        if (explicitComponentId === 'form-field') {
          return {
            componentId: 'form-field',
            params: buildExplicitFormFieldParams(itemObj, index, sharedFieldParams)
          };
        }
        if (explicitComponentId === 'button' || explicitComponentId === 'text') {
          return {
            componentId: explicitComponentId,
            params: buildExplicitComponentParams(itemObj)
          };
        }

        const rawType = String(itemObj.componentId || itemObj.type || '').trim().toLowerCase();
        if (rawType.includes('button') || rawType.includes('btn')) {
          return toButtonFromItem(itemObj, `操作${index + 1}`, 'secondary');
        }

        if (rawType === 'text') {
          return {
            componentId: 'text',
            params: {
              text: String(props.text || itemObj.text || itemObj.label || itemObj.name || `文本${index + 1}`)
            }
          };
        }

        const label = String(
          props.label ||
          itemObj.label ||
          itemObj.title ||
          itemObj.name ||
          `字段${index + 1}`
        );
        const fieldBaseParams = {
          ...sharedFieldParams,
          label,
          required: Boolean(props.required ?? itemObj.required),
          helpText: String(props.helpText || itemObj.helpText || ''),
          descriptionText: typeof (props.descriptionText ?? props.description ?? itemObj.descriptionText ?? itemObj.description) === 'string'
            ? String(props.descriptionText ?? props.description ?? itemObj.descriptionText ?? itemObj.description)
            : '',
          errorText: typeof (props.errorText ?? itemObj.errorText) === 'string'
            ? String(props.errorText ?? itemObj.errorText)
            : ''
        };

        const optionsText = buildOptionsTextFromValue(
          props.optionsText ?? props.options ?? itemObj.optionsText ?? itemObj.options
        );

        const inputs = Array.isArray(props.inputs ?? itemObj.inputs)
          ? (props.inputs ?? itemObj.inputs)
          : [];
        const inputChildren = inputs.map((inputItem: any, inputIndex: number) =>
          buildControlComponentFromItem(inputItem, inputIndex)
        ).filter(Boolean);
        const inputLayout = inputChildren.length > 0
          ? {
            componentId: 'layout',
            params: { direction: 'horizontal', spacing: 12 },
            children: inputChildren
          }
          : null;

        if (rawType.includes('checkbox')) {
          return {
            componentId: 'form-field',
            params: {
              ...fieldBaseParams,
              controlType: 'checkbox-group',
              optionsText,
              checkedValues: String(props.checkedValues || itemObj.checkedValues || props.value || itemObj.value || '选项一'),
              direction: String(props.direction || itemObj.direction || 'horizontal')
            },
            children: inputLayout ? [inputLayout] : undefined
          };
        }

        if (rawType.includes('radio')) {
          return {
            componentId: 'form-field',
            params: {
              ...fieldBaseParams,
              controlType: 'radio-group',
              optionsText,
              value: String(props.value || itemObj.value || '选项一'),
              direction: String(props.direction || itemObj.direction || 'horizontal')
            },
            children: inputLayout ? [inputLayout] : undefined
          };
        }

        if (rawType.includes('select') || rawType.includes('dropdown')) {
          return {
            componentId: 'form-field',
            params: {
              ...fieldBaseParams,
              controlType: 'select',
              value: String(props.value || itemObj.value || '请选择')
            },
            children: inputLayout ? [inputLayout] : undefined
          };
        }

        if (rawType.includes('input') || rawType.includes('search')) {
          return {
            componentId: 'form-field',
            params: {
              ...fieldBaseParams,
              controlType: 'input',
              ...buildInputParamsFromSource(props, itemObj)
            },
            children: inputLayout ? [inputLayout] : undefined
          };
        }

        const explicitToken = String(
          props.componentToken ||
          itemObj.componentToken ||
          itemObj.token ||
          ''
        ).trim();
        const componentToken = explicitToken || resolveLibraryFormControlToken(rawType);
        if (componentToken) {
          const segmentedKey = rawType.includes('segmented') ? SEGMENTED_PICKER_COMPONENT_KEY : '';
          return {
            componentId: 'form-field',
            params: {
              ...fieldBaseParams,
              controlType: 'figma-component',
              componentToken,
              componentKey: String(props.componentKey || itemObj.componentKey || segmentedKey),
              variantCriteria: String(props.variantCriteria || itemObj.variantCriteria || '')
            },
            children: inputLayout ? [inputLayout] : undefined
          };
        }

        return {
          componentId: 'form-field',
          params: {
            ...fieldBaseParams,
            controlType: 'input',
            placeholder: String(props.placeholder || itemObj.placeholder || '请输入'),
            value: String(props.value || itemObj.value || '')
          },
          children: inputLayout ? [inputLayout] : undefined
        };
      };
      const footer = isObject(formObj.footer) ? formObj.footer : {};
      const footerActions = Array.isArray(footer.actions) ? footer.actions : [];
      const footerRow = footerActions.length > 0
        ? (footerActions.length === 1
          ? toButtonFromItem(footerActions[0], '操作1', 'secondary')
          : {
            componentId: 'form-row',
            params: {
              spacing: 8,
              align: String(footer.align || formObj.actionAlign || 'end')
            },
            children: footerActions.map((item: any, index: number) =>
              toButtonFromItem(item, `操作${index + 1}`, 'secondary')
            )
          })
        : null;

      const baseRowSpacing = Number.isFinite(rowSpacingRaw) && rowSpacingRaw > 0 ? rowSpacingRaw : (align === 'top' ? 24 : 12);
      const baseColumnSpacing = Number.isFinite(columnSpacingRaw) && columnSpacingRaw > 0 ? columnSpacingRaw : 16;
      const groupLabelMode = resolveGroupLabelMode(body.groupLabelMode ?? body.showGroupLabel ?? formObj.groupLabelMode ?? formObj.showGroupLabel);

      const buildFormRowFromItems = (
        row: any[],
        options?: { spacing?: number; forceVertical?: boolean; hideLabels?: boolean; showDelete?: boolean }
      ): any | null => {
        if (!Array.isArray(row)) return null;
        const rowChildren = row.map((item: any, index: number) => buildRowChildFromItem(item, index)).filter(Boolean);
        if (rowChildren.length === 0) return null;
        rowChildren.forEach((child: any) => {
          if (child?.componentId !== 'form-field' || !child.params) return;
          if (options?.forceVertical) {
            child.params.layout = 'vertical';
            child.params.align = 'top';
            child.params.labelWidth = 0;
          }
          if (options?.hideLabels) {
            child.params.label = '';
          }
        });
        if (options?.showDelete) {
          rowChildren.push({
            componentId: 'figma-component',
            params: { componentToken: DELETE_ICON_COMPONENT_TOKEN }
          });
        }
        if (rowChildren.length === 1 && rowChildren[0]?.componentId === 'button') {
          return rowChildren[0];
        }
        const segmentedCount = row.filter((item: any) => isSegmentedPickerItem(item)).length;
        const isSegmentedRow = segmentedCount > 1 && segmentedCount === row.length;
        const spacing = Number.isFinite(options?.spacing)
          ? Number(options?.spacing)
          : (isSegmentedRow ? 8 : baseColumnSpacing);
        return {
          componentId: 'form-row',
          params: {
            spacing,
            align: 'start'
          },
          children: rowChildren
        };
      };

      const buildRowsFromArray = (rowsArray: any[], options?: { spacing?: number; forceVertical?: boolean; hideLabels?: boolean; showDelete?: boolean }): any[] => {
        const result: any[] = [];
        rowsArray.forEach((row: any) => {
          const rowNode = buildFormRowFromItems(row, options);
          if (rowNode) result.push(rowNode);
        });
        return result;
      };

      const buildGroupLayoutFromGroups = (groups: any[]): any | null => {
        const groupRows = groups.map((group: any, groupIndex: number) => {
          const groupObj = isObject(group) ? group : {};
          const groupFields = Array.isArray(group)
            ? group
            : Array.isArray(groupObj.fields)
              ? groupObj.fields
              : Array.isArray(groupObj.items)
                ? groupObj.items
                : [];
          if (!Array.isArray(groupFields) || groupFields.length === 0) return null;
          const showDelete = Boolean(groupObj.deletable ?? groupObj.allowDelete ?? groupObj.canDelete ?? groupObj.showDelete);
          const hideLabels = groupLabelMode === 'first' && groupIndex > 0;
          return buildFormRowFromItems(groupFields, {
            spacing: 12,
            forceVertical: true,
            hideLabels,
            showDelete
          });
        }).filter(Boolean);
        if (groupRows.length === 0) return null;
        return {
          componentId: 'layout',
          params: { direction: 'vertical', spacing: 12 },
          children: groupRows
        };
      };

      const sections = Array.isArray(body.sections)
        ? body.sections
        : Array.isArray(formObj.sections)
          ? formObj.sections
          : [];
      const groupSource = Array.isArray(body.groups)
        ? body.groups
        : Array.isArray(body.fieldGroups)
          ? body.fieldGroups
          : Array.isArray(formObj.groups)
            ? formObj.groups
            : Array.isArray(formObj.fieldGroups)
              ? formObj.fieldGroups
              : [];

      const children: any[] = [];
      if (sections.length > 0) {
        sections.forEach((section: any) => {
          const sectionObj = isObject(section) ? section : { title: String(section ?? '') };
          const sectionTitle = String(sectionObj.title || '').trim();
          const sectionRows = Array.isArray(sectionObj.rows)
            ? sectionObj.rows
            : Array.isArray(sectionObj.fields)
              ? [sectionObj.fields]
              : [];
          const sectionGroups = Array.isArray(sectionObj.groups)
            ? sectionObj.groups
            : Array.isArray(sectionObj.fieldGroups)
              ? sectionObj.fieldGroups
              : [];
          const groupLayout = sectionGroups.length > 0 ? buildGroupLayoutFromGroups(sectionGroups) : null;
          const sectionContent = groupLayout ? [groupLayout] : buildRowsFromArray(sectionRows);
          if (sectionContent.length === 0) return;
          const sectionBody = sectionContent.length === 1
            ? sectionContent[0]
            : {
              componentId: 'layout',
              params: { direction: 'vertical', spacing: baseRowSpacing },
              children: sectionContent
            };
          const sectionChildren: any[] = [];
          if (sectionTitle) {
            sectionChildren.push({
              componentId: 'figma-component',
              params: {
                componentKey: SECTION_TITLE_COMPONENT_KEY,
                text: sectionTitle,
                fallbackName: 'Section Title'
              }
            });
          }
          sectionChildren.push(sectionBody);
          children.push({
            componentId: 'layout',
            params: {
              direction: 'vertical',
              spacing: sectionTitle ? (layout === 'vertical' ? 12 : 24) : baseRowSpacing
            },
            children: sectionChildren
          });
        });
      } else if (groupSource.length > 0) {
        const groupLayout = buildGroupLayoutFromGroups(groupSource);
        if (groupLayout) {
          if (footerRow) {
            children.push({
              componentId: 'layout',
              params: { direction: 'vertical', spacing: 4 },
              children: [groupLayout, footerRow]
            });
          } else {
            children.push(groupLayout);
          }
        }
      } else {
        children.push(...buildRowsFromArray(rows));
        if (footerRow) children.push(footerRow);
      }

      if (children.length === 0) {
        const fallbackRow = buildFormRowFromItems([
          { componentId: 'input', label: '关键词', props: { placeholder: '请输入关键词' } },
          { componentId: 'select', label: '状态', props: { value: '全部状态' } },
          { componentId: 'button', props: { label: '查询', variant: 'primary' } },
          { componentId: 'button', props: { label: '重置', variant: 'secondary' } }
        ]);
        if (fallbackRow) children.push(fallbackRow);
      }

      return {
        componentId: 'form',
        params: {
          title: '',
          align,
          layout,
          labelWidthPreset,
          width: 0,
          rowSpacing: sections.length > 0 ? 40 : baseRowSpacing,
          columnSpacing: baseColumnSpacing,
          labelWidth: sharedFieldParams.labelWidth,
          controlWidth: sharedFieldParams.controlWidth,
          showColon: sharedFieldParams.showColon,
          labelWidthAuto: layout !== 'vertical',
          requiredMark: true
        },
        children
      };
    };

    const source = getBlockSource(payload);
    if (!source) return null;

    const blockChildren: any[] = [];

    const rowChildren = buildHeaderSectionChildren(source.header);
    if (rowChildren.length > 0) {
      blockChildren.push({
        componentId: 'layout',
        params: {
          direction: 'horizontal',
          spacing: 12,
          paddingBottom: 8
        },
        children: rowChildren
      });
    }

    const formComponent =
      buildFormComponentFromSource(source) ||
      buildFormComponentFromSource({
        layout: 'vertical',
        align: 'top',
        labelWidthPreset: 'fill',
        rows: [[
          { componentId: 'input', label: '关键词', props: { placeholder: '请输入关键词' } },
          { componentId: 'select', label: '状态', props: { value: '全部状态' } },
          { componentId: 'button', props: { label: '查询', variant: 'primary' } },
          { componentId: 'button', props: { label: '重置', variant: 'secondary' } }
        ]]
      });

    if (!formComponent) return null;
    blockChildren.push(formComponent);

    const { title, width } = resolveBlockContainerMeta(source, fallbackTitle || '表单区块', 980);

    return {
      componentId: 'card',
      params: {
        title,
        width
      },
      children: blockChildren
    };
  };

  const buildFormComponentFromPayload = (payload: any): any | null => {
    const source = getBlockSource(payload);
    if (!source) return null;
    const body = getBlockBody(source);

    const align = normalizeFormAlignValue(body.align ?? source.align ?? body.layout ?? source.layout ?? 'top');
    const labelWidthPreset = normalizeFormLabelWidthPresetValue(body.labelWidthPreset ?? source.labelWidthPreset);
    const layout = String(body.layout || source.layout || (align === 'top' ? 'vertical' : 'horizontal'));
    const rowSpacingRaw = Number(body.rowSpacing ?? source.rowSpacing);
    const columnSpacingRaw = Number(body.columnSpacing ?? body.spacing ?? source.columnSpacing ?? source.spacing);
    const labelWidthRaw = resolveFormLabelWidthValue(labelWidthPreset, body.labelWidth ?? source.labelWidth, 96);
    const controlWidthRaw = Number(body.controlWidth ?? source.controlWidth);
    const widthRaw = Number(body.width ?? source.width);
    const showColon = body.showColon ?? source.showColon ?? false;

    const sharedFieldParams = {
      align,
      layout,
      labelAlign: align === 'right' ? 'right' : 'left',
      labelWidthPreset,
      labelWidth: align === 'top' ? 0 : labelWidthRaw,
      controlWidth: Number.isFinite(controlWidthRaw) && controlWidthRaw > 0 ? controlWidthRaw : 240,
      showColon: Boolean(showColon)
    };

    const resolveLibraryToken = (rawType: string): string | null => {
      const normalized = String(rawType || '').trim().toLowerCase();
      if (!normalized) return null;
      const rules: Array<[string, string]> = [
        ['timepicker-menu', 'library.data-input.timepicker-menu'],
        ['checkbox-group', 'library.data-input.checkbox-group'],
        ['radio-group', 'library.data-input.radio-group'],
        ['tree-select', 'library.data-input.treeselect'],
        ['treeselect', 'library.data-input.treeselect'],
        ['input-number', 'library.data-input.inputnumber'],
        ['inputnumber', 'library.data-input.inputnumber'],
        ['datetime', 'library.data-input.datetimepicker-segemented'],
        ['datepicker', 'library.data-input.datepicker'],
        ['datepick', 'library.data-input.datepicker'],
        ['autocomplete', 'library.data-input.autocomplete'],
        ['cascader', 'library.data-input.cascader'],
        ['checkbox', 'library.data-input.checkbox'],
        ['drag', 'library.data-input.drag'],
        ['image', 'library.data-input.image'],
        ['radio', 'library.data-input.radio'],
        ['search', 'library.data-input.search'],
        ['segmented', 'library.data-input.segmented-picker'],
        ['slider', 'library.data-input.slider'],
        ['switch', 'library.data-input.switch'],
        ['textarea', 'library.data-input.textarea'],
        ['timepicker', 'library.data-input.timepicker'],
        ['transfer', 'library.data-input.transfer']
      ];
      const matched = rules.find(([keyword]) => normalized.includes(keyword));
      return matched ? matched[1] : null;
    };

    const isSegmentedPickerItem = (item: any): boolean => {
      const itemObj = isObject(item) ? item : {};
      const props = isObject(itemObj.props) ? itemObj.props : {};
      const rawType = String(itemObj.componentId || itemObj.type || '').trim().toLowerCase();
      if (rawType.includes('segmented')) return true;
      const componentKey = String(props.componentKey || itemObj.componentKey || '');
      const componentToken = String(props.componentToken || itemObj.componentToken || itemObj.token || '');
      return componentKey === SEGMENTED_PICKER_COMPONENT_KEY || componentToken.includes('segmented');
    };

    const buildControlComponentFromItem = (item: any, index: number): any | null => {
      const itemObj = isObject(item) ? item : { componentId: 'input', props: { value: String(item ?? '') } };
      const explicitComponentId = String(itemObj.componentId || '').trim();
      if (explicitComponentId) {
        if (explicitComponentId === 'figma-component') {
          return { componentId: 'figma-component', params: buildExplicitComponentParams(itemObj) };
        }
        if (explicitComponentId === 'button' || explicitComponentId === 'text' || explicitComponentId === 'input' || explicitComponentId === 'select' || explicitComponentId === 'checkbox-group' || explicitComponentId === 'radio-group') {
          return { componentId: explicitComponentId, params: buildExplicitComponentParams(itemObj) };
        }
      }
      const props = isObject(itemObj.props) ? itemObj.props : {};
      const rawType = String(itemObj.componentId || itemObj.type || '').trim().toLowerCase();
      if (rawType.includes('segmented')) {
        return {
          componentId: 'figma-component',
          params: {
            ...buildExplicitComponentParams(itemObj),
            componentToken: 'library.data-input.segmented-picker',
            componentKey: String(props.componentKey || itemObj.componentKey || SEGMENTED_PICKER_COMPONENT_KEY)
          }
        };
      }
      if (rawType.includes('select')) {
        return { componentId: 'select', params: buildExplicitComponentParams(itemObj) };
      }
      if (rawType.includes('checkbox')) {
        return { componentId: 'checkbox-group', params: buildExplicitComponentParams(itemObj) };
      }
      if (rawType.includes('radio')) {
        return { componentId: 'radio-group', params: buildExplicitComponentParams(itemObj) };
      }
      if (rawType.includes('button') || rawType.includes('btn')) {
        return toButtonFromItem(itemObj, `操作${index + 1}`, 'secondary');
      }
      return { componentId: 'input', params: buildExplicitComponentParams(itemObj) };
    };

    const buildRowChild = (item: any, index: number): any | null => {
      const itemObj = isObject(item) ? item : { label: String(item || '') };
      const props = isObject(itemObj.props) ? itemObj.props : {};
      const explicitComponentId = String(itemObj.componentId || '').trim();
      if (explicitComponentId === 'form-field') {
        return {
          componentId: 'form-field',
          params: buildExplicitFormFieldParams(itemObj, index, sharedFieldParams)
        };
      }
      if (explicitComponentId === 'button' || explicitComponentId === 'text') {
        return {
          componentId: explicitComponentId,
          params: buildExplicitComponentParams(itemObj)
        };
      }
      const rawType = String(itemObj.componentId || itemObj.type || '').trim().toLowerCase();

      if (rawType.includes('button') || rawType.includes('btn')) {
        return toButtonFromItem(itemObj, `操作${index + 1}`, 'secondary');
      }

      const label = String(props.label || itemObj.label || itemObj.title || itemObj.name || `字段${index + 1}`);
      const baseParams = {
        ...sharedFieldParams,
        label,
        required: Boolean(props.required ?? itemObj.required),
        helpText: String(props.helpText || itemObj.helpText || ''),
        descriptionText: typeof (props.descriptionText ?? props.description ?? itemObj.descriptionText ?? itemObj.description) === 'string'
          ? String(props.descriptionText ?? props.description ?? itemObj.descriptionText ?? itemObj.description)
          : '',
        errorText: typeof (props.errorText ?? itemObj.errorText) === 'string'
          ? String(props.errorText ?? itemObj.errorText)
          : ''
      };

      const optionsText = buildOptionsTextFromValue(
        props.optionsText ?? props.options ?? itemObj.optionsText ?? itemObj.options
      );

      const inputs = Array.isArray(props.inputs ?? itemObj.inputs)
        ? (props.inputs ?? itemObj.inputs)
        : [];
      const inputChildren = inputs.map((inputItem: any, inputIndex: number) =>
        buildControlComponentFromItem(inputItem, inputIndex)
      ).filter(Boolean);
      const inputLayout = inputChildren.length > 0
        ? {
          componentId: 'layout',
          params: { direction: 'horizontal', spacing: 12 },
          children: inputChildren
        }
        : null;

      if (rawType.includes('checkbox')) {
        return {
          componentId: 'form-field',
          params: {
            ...baseParams,
            controlType: 'checkbox-group',
            optionsText,
            checkedValues: String(props.checkedValues || itemObj.checkedValues || props.value || itemObj.value || '选项一'),
            direction: String(props.direction || itemObj.direction || 'horizontal')
          },
          children: inputLayout ? [inputLayout] : undefined
        };
      }

      if (rawType.includes('radio')) {
        return {
          componentId: 'form-field',
          params: {
            ...baseParams,
            controlType: 'radio-group',
            optionsText,
            value: String(props.value || itemObj.value || '选项一'),
            direction: String(props.direction || itemObj.direction || 'horizontal')
          },
          children: inputLayout ? [inputLayout] : undefined
        };
      }

      if (rawType.includes('select') || rawType.includes('dropdown')) {
        return {
          componentId: 'form-field',
          params: {
            ...baseParams,
            controlType: 'select',
            value: String(props.value || itemObj.value || '请选择')
          },
          children: inputLayout ? [inputLayout] : undefined
        };
      }

      if (rawType.includes('input') || rawType.includes('search')) {
        return {
          componentId: 'form-field',
          params: {
            ...baseParams,
            controlType: 'input',
            ...buildInputParamsFromSource(props, itemObj)
          },
          children: inputLayout ? [inputLayout] : undefined
        };
      }

      const explicitToken = String(props.componentToken || itemObj.componentToken || itemObj.token || '').trim();
      const componentToken = explicitToken || resolveLibraryToken(rawType);
      if (componentToken) {
        const segmentedKey = rawType.includes('segmented') ? SEGMENTED_PICKER_COMPONENT_KEY : '';
        return {
          componentId: 'form-field',
          params: {
            ...baseParams,
            controlType: 'figma-component',
            componentToken,
            componentKey: String(props.componentKey || itemObj.componentKey || segmentedKey),
            variantCriteria: String(props.variantCriteria || itemObj.variantCriteria || '')
          },
          children: inputLayout ? [inputLayout] : undefined
        };
      }

      return {
        componentId: 'form-field',
        params: {
          ...baseParams,
          controlType: 'input',
          placeholder: String(props.placeholder || itemObj.placeholder || '请输入'),
          value: String(props.value || itemObj.value || '')
        },
        children: inputLayout ? [inputLayout] : undefined
      };
    };

    const rows = Array.isArray(body.rows)
      ? body.rows
      : Array.isArray(body.fields)
        ? [body.fields]
        : Array.isArray(source.rows)
          ? source.rows
          : Array.isArray(source.fields)
            ? [source.fields]
            : [];

    const footer = isObject(source.footer) ? source.footer : {};
    const footerActions = Array.isArray(footer.actions)
      ? footer.actions
      : Array.isArray(source.actions)
        ? source.actions
        : [];
    const footerRow = footerActions.length > 0
      ? (footerActions.length === 1
        ? toButtonFromItem(footerActions[0], '操作1', 'secondary')
        : {
          componentId: 'form-row',
          params: {
            spacing: 8,
            align: String(footer.align || source.actionAlign || 'end')
          },
          children: footerActions.map((item: any, index: number) =>
            toButtonFromItem(item, `操作${index + 1}`, 'secondary')
          )
        })
      : null;

    const baseRowSpacing = Number.isFinite(rowSpacingRaw) && rowSpacingRaw > 0 ? rowSpacingRaw : (align === 'top' ? 24 : 12);
    const baseColumnSpacing = Number.isFinite(columnSpacingRaw) && columnSpacingRaw > 0 ? columnSpacingRaw : 16;
    const groupLabelMode = resolveGroupLabelMode(body.groupLabelMode ?? body.showGroupLabel ?? source.groupLabelMode ?? source.showGroupLabel);

    const buildFormRowFromItems = (
      row: any[],
      options?: { spacing?: number; forceVertical?: boolean; hideLabels?: boolean; showDelete?: boolean }
    ): any | null => {
      if (!Array.isArray(row)) return null;
      const rowChildren = row.map((item: any, index: number) => buildRowChild(item, index)).filter(Boolean);
      if (rowChildren.length === 0) return null;
      rowChildren.forEach((child: any) => {
        if (child?.componentId !== 'form-field' || !child.params) return;
        if (options?.forceVertical) {
          child.params.layout = 'vertical';
          child.params.align = 'top';
          child.params.labelWidth = 0;
        }
        if (options?.hideLabels) {
          child.params.label = '';
        }
      });
      if (options?.showDelete) {
        rowChildren.push({
          componentId: 'figma-component',
          params: { componentToken: DELETE_ICON_COMPONENT_TOKEN }
        });
      }
      if (rowChildren.length === 1 && rowChildren[0]?.componentId === 'button') {
        return rowChildren[0];
      }
      const segmentedCount = row.filter((item: any) => isSegmentedPickerItem(item)).length;
      const isSegmentedRow = segmentedCount > 1 && segmentedCount === row.length;
      const spacing = Number.isFinite(options?.spacing)
        ? Number(options?.spacing)
        : (isSegmentedRow ? 8 : baseColumnSpacing);
      return {
        componentId: 'form-row',
        params: {
          spacing,
          align: 'start'
        },
        children: rowChildren
      };
    };

    const buildRowsFromArray = (rowsArray: any[], options?: { spacing?: number; forceVertical?: boolean; hideLabels?: boolean; showDelete?: boolean }): any[] => {
      const result: any[] = [];
      rowsArray.forEach((row: any) => {
        const rowNode = buildFormRowFromItems(row, options);
        if (rowNode) result.push(rowNode);
      });
      return result;
    };

    const buildGroupLayoutFromGroups = (groups: any[]): any | null => {
      const groupRows = groups.map((group: any, groupIndex: number) => {
        const groupObj = isObject(group) ? group : {};
        const groupFields = Array.isArray(group)
          ? group
          : Array.isArray(groupObj.fields)
            ? groupObj.fields
            : Array.isArray(groupObj.items)
              ? groupObj.items
              : [];
        if (!Array.isArray(groupFields) || groupFields.length === 0) return null;
        const showDelete = Boolean(groupObj.deletable ?? groupObj.allowDelete ?? groupObj.canDelete ?? groupObj.showDelete);
        const hideLabels = groupLabelMode === 'first' && groupIndex > 0;
        return buildFormRowFromItems(groupFields, {
          spacing: 12,
          forceVertical: true,
          hideLabels,
          showDelete
        });
      }).filter(Boolean);
      if (groupRows.length === 0) return null;
      return {
        componentId: 'layout',
        params: { direction: 'vertical', spacing: 12 },
        children: groupRows
      };
    };

    const sections = Array.isArray(body.sections)
      ? body.sections
      : Array.isArray(source.sections)
        ? source.sections
        : [];
    const groupSource = Array.isArray(body.groups)
      ? body.groups
      : Array.isArray(body.fieldGroups)
        ? body.fieldGroups
        : Array.isArray(source.groups)
          ? source.groups
          : Array.isArray(source.fieldGroups)
            ? source.fieldGroups
            : [];

    const children: any[] = [];
    if (sections.length > 0) {
      sections.forEach((section: any) => {
        const sectionObj = isObject(section) ? section : { title: String(section ?? '') };
        const sectionTitle = String(sectionObj.title || '').trim();
        const sectionRows = Array.isArray(sectionObj.rows)
          ? sectionObj.rows
          : Array.isArray(sectionObj.fields)
            ? [sectionObj.fields]
            : [];
        const sectionGroups = Array.isArray(sectionObj.groups)
          ? sectionObj.groups
          : Array.isArray(sectionObj.fieldGroups)
            ? sectionObj.fieldGroups
            : [];
        const groupLayout = sectionGroups.length > 0 ? buildGroupLayoutFromGroups(sectionGroups) : null;
        const sectionContent = groupLayout ? [groupLayout] : buildRowsFromArray(sectionRows);
        if (sectionContent.length === 0) return;
        const sectionBody = sectionContent.length === 1
          ? sectionContent[0]
          : {
            componentId: 'layout',
            params: { direction: 'vertical', spacing: baseRowSpacing },
            children: sectionContent
          };
        const sectionChildren: any[] = [];
        if (sectionTitle) {
          sectionChildren.push({
            componentId: 'figma-component',
            params: {
              componentKey: SECTION_TITLE_COMPONENT_KEY,
              text: sectionTitle,
              fallbackName: 'Section Title'
            }
          });
        }
        sectionChildren.push(sectionBody);
        children.push({
          componentId: 'layout',
          params: {
            direction: 'vertical',
            spacing: sectionTitle ? (layout === 'vertical' ? 12 : 24) : baseRowSpacing
          },
          children: sectionChildren
        });
      });
    } else if (groupSource.length > 0) {
      const groupLayout = buildGroupLayoutFromGroups(groupSource);
      if (groupLayout) {
        if (footerRow) {
          children.push({
            componentId: 'layout',
            params: { direction: 'vertical', spacing: 4 },
            children: [groupLayout, footerRow]
          });
        } else {
          children.push(groupLayout);
        }
      }
    } else {
      children.push(...buildRowsFromArray(rows));
      if (footerRow) children.push(footerRow);
    }

    if (children.length === 0) {
      const fallbackRow = buildFormRowFromItems([
        { componentId: 'input', label: '关键词', props: { placeholder: '请输入关键词' } },
        { componentId: 'select', label: '状态', props: { value: '全部状态' } },
        { componentId: 'button', props: { label: '查询', variant: 'primary' } },
        { componentId: 'button', props: { label: '重置', variant: 'secondary' } }
      ]);
      if (fallbackRow) children.push(fallbackRow);
    }

    return {
      componentId: 'form',
      params: {
        title: String(body.title || source.title || ''),
        align,
        layout,
        labelWidthPreset,
        width: Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : 720,
        rowSpacing: sections.length > 0 ? 40 : baseRowSpacing,
        columnSpacing: baseColumnSpacing,
        labelWidth: sharedFieldParams.labelWidth,
        controlWidth: sharedFieldParams.controlWidth,
        showColon: sharedFieldParams.showColon,
        labelWidthAuto: layout !== 'vertical',
        requiredMark: true
      },
      children
    };
  };

  const getChartToken = (hint: string, fallbackToken = ''): string => {
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

  const buildChartBlockComponentFromPayload = (payload: any, fallbackTitle: string): any | null => {
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
      const tokenHint = String(props.type ?? chartObj.type ?? props.chartType ?? chartObj.chartType ?? '').trim();
      const token = getChartToken(tokenHint, 'lib-data-display-toplist');
      chartNodes.push({
        componentId: 'figma-component',
        params: {
          componentToken: token,
          fallbackName: `图表 ${index + 1}`,
          height: Number.isFinite(heightRaw) && heightRaw > 0 ? heightRaw : 220
        }
      });
    });

    if (chartNodes.length === 0) {
      chartNodes.push({
        componentId: 'figma-component',
        params: {
          componentToken: 'lib-data-display-toplist',
          fallbackName: String(source.chartTitle || '趋势'),
          height: Number(source.height) > 0 ? Number(source.height) : 220
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

  const buildTabsBlockComponentFromPayload = (payload: any, fallbackTitle: string): any | null => {
    const source = getBlockSource(payload);
    if (!source) return null;
    const body = getBlockBody(source);
    const header = isObject(source.header) ? source.header : {};

    const blockChildren: any[] = [];
    const headerChildren = buildHeaderSectionChildren({
      ...header,
      tabs: []
    });
    if (headerChildren.length > 0) {
      blockChildren.push({
        componentId: 'layout',
        params: {
          direction: 'horizontal',
          spacing: 12,
          paddingBottom: 8
        },
        children: headerChildren
      });
    }

    const tabs = Array.isArray(body.tabs)
      ? body.tabs
      : Array.isArray(source.tabs)
        ? source.tabs
        : Array.isArray(header.tabs)
          ? header.tabs
          : [];
    const tabButtons =
      tabs.length > 0
        ? tabs.map((tab: any, index: number) => {
            const tabObj = isObject(tab) ? tab : {};
            const props = isObject(tabObj.props) ? tabObj.props : {};
            const active = Boolean(props.active ?? tabObj.active);
            return {
              componentId: 'button',
              params: {
                label: String(props.label || tabObj.label || tabObj.name || `Tab ${index + 1}`),
                variant: String(props.variant || tabObj.variant || (active ? 'primary' : 'secondary'))
              }
            };
          })
        : [
            { componentId: 'button', params: { label: '全部', variant: 'primary' } },
            { componentId: 'button', params: { label: '我的', variant: 'secondary' } },
            { componentId: 'button', params: { label: '归档', variant: 'secondary' } }
          ];
    blockChildren.push({
      componentId: 'layout',
      params: {
        direction: 'horizontal',
        spacing: 8
      },
      children: tabButtons
    });

    const footer = isObject(source.footer) ? source.footer : {};
    const footerActions = Array.isArray(footer.actions) ? footer.actions : [];
    if (footerActions.length > 0) {
      blockChildren.push({
        componentId: 'layout',
        params: {
          direction: 'horizontal',
          spacing: 6,
          paddingTop: 8
        },
        children: footerActions.map((item: any, index: number) =>
          toButtonFromItem(item, `Action ${index + 1}`, 'secondary')
        )
      });
    }

    const notes = typeof footer.notes === 'string' ? footer.notes : '';
    if (notes) {
      blockChildren.push({
        componentId: 'text',
        params: {
          text: notes
        }
      });
    }

    const { title, width } = resolveBlockContainerMeta(source, fallbackTitle || '标签切换区块', 980);

    return {
      componentId: 'card',
      params: {
        title,
        width
      },
      children: blockChildren
    };
  };

  const extractTablePayloadFromSceneRoot = (root: any): any | null => {
    if (!isObject(root) || root.componentId !== 'table') return null;

    const columns = Array.isArray(root.children) ? root.children : [];
    if (columns.length === 0) return null;

    const headers: string[] = [];
    const columnWidths: number[] = [];
    const columnTypes: string[] = [];
    const columnsData: string[][] = [];

    let maxRowCount = 0;

    columns.forEach((col: any, colIndex: number) => {
      if (!isObject(col) || col.componentId !== 'table-column') return;

      const colProps = isObject(col.props)
        ? col.props
        : isObject(col.params)
          ? col.params
          : {};
      const colChildren = Array.isArray(col.children) ? col.children : [];
      const headerNode = colChildren.find((child: any) => child?.componentId === 'table-header-cell');
      const headerNodeProps = isObject((headerNode as any)?.props)
        ? (headerNode as any).props
        : isObject((headerNode as any)?.params)
          ? (headerNode as any).params
          : {};

      const dataNodes = colChildren.filter((child: any) => child?.componentId !== 'table-header-cell');
      const firstDataNode = dataNodes[0];
      const firstDataNodeProps = isObject(firstDataNode?.props)
        ? firstDataNode.props
        : isObject(firstDataNode?.params)
          ? firstDataNode.params
          : {};
      const columnType = tableComponentIdToType(firstDataNode?.componentId, firstDataNodeProps);
      columnTypes.push(columnType);
      const isActionColumn = columnType === 'ActionText' || columnType === 'ActionIcon';

      const headerText =
        isActionColumn
          ? '操作'
          : (
              toCellString(colProps.headerText || colProps.header || colProps.title) ||
              toCellString(headerNodeProps.text) ||
              `列${colIndex + 1}`
            );
      headers.push(headerText);

      const widthRaw = Number(colProps.width ?? headerNodeProps.width);
      columnWidths.push(Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : (isActionColumn ? 0 : 120));

      const values = dataNodes.map((node: any) => {
        const nodeProps = isObject(node?.props)
          ? node.props
          : isObject(node?.params)
            ? node.params
            : {};
        if (node.componentId === 'table-cell-tag') {
          return toCellString(nodeProps.tagText ?? nodeProps.text);
        }
        if (node.componentId === 'table-cell-input') {
          return toCellString(nodeProps.value ?? nodeProps.text);
        }
        return toCellString(nodeProps.text ?? nodeProps.value);
      });

      columnsData.push(values);
      maxRowCount = Math.max(maxRowCount, values.length);
    });

    if (headers.length === 0) return null;
    if (maxRowCount === 0) maxRowCount = 1;

    const rows: string[][] = Array.from({ length: maxRowCount }, (_, rowIndex) =>
      headers.map((_, colIndex) => columnsData[colIndex]?.[rowIndex] ?? '')
    );

    return {
      headers,
      rows,
      columnTypes,
      columnWidths
    };
  };

  const normalizeSceneEnvelopeForSend = (payload: any): any | null => {
    if (!isObject(payload)) return null;

    // legacy create schema for table
    if (String(payload.intent || '').toLowerCase() === 'create' && isObject(payload.schema)) {
      const tableTree = buildTableComponentFromPayload(payload);
      if (!tableTree) return null;
      return {
        version: '1.0',
        intent: 'create',
        scene: {
          root: {
            nodeId: 'table_root',
            componentId: tableTree.componentId,
            props: tableTree.params || {},
            children: (tableTree.children || []).map((col: any, colIndex: number) => ({
              nodeId: `table_col_${colIndex + 1}`,
              componentId: col.componentId,
              props: col.params || {},
              children: (col.children || []).map((cell: any, rowIndex: number) => ({
                nodeId: `table_col_${colIndex + 1}_cell_${rowIndex + 1}`,
                componentId: cell.componentId,
                props: cell.params || {}
              }))
            }))
          }
        }
      };
    }

    const withVersion: any = {
      ...payload,
      version: payload.version || '1.0'
    };

    let nodeCounter = 0;
    const normalizeNode = (node: any, prefix: string): any => {
      const componentId = typeof node?.componentId === 'string' ? node.componentId : 'layout';
      const props = isObject(node?.props)
        ? node.props
        : isObject(node?.params)
          ? node.params
          : {};
      const nodeId =
        typeof node?.nodeId === 'string' && node.nodeId
          ? node.nodeId
          : `${prefix}_${componentId}_${++nodeCounter}`;

      const normalized: any = {
        nodeId,
        componentId,
        props
      };

      if (node?.variant) normalized.variant = node.variant;
      if (isObject(node?.layout)) normalized.layout = node.layout;
      if (isObject(node?.style)) normalized.style = node.style;
      if (Array.isArray(node?.bindings)) normalized.bindings = node.bindings;

      if (Array.isArray(node?.children)) {
        normalized.children = node.children.map((child: any, index: number) =>
          normalizeNode(child, `${nodeId}_c${index + 1}`)
        );
      }

      if (isObject(node?.slots)) {
        normalized.slots = {};
        Object.entries(node.slots).forEach(([slotKey, slotNodes]) => {
          if (!Array.isArray(slotNodes)) return;
          normalized.slots[slotKey] = slotNodes.map((slotNode: any, index: number) =>
            normalizeNode(slotNode, `${nodeId}_${slotKey}_${index + 1}`)
          );
        });
      }

      return normalized;
    };

    if (withVersion.intent === 'create' && isObject(withVersion.scene) && isObject((withVersion.scene as any).root)) {
      return {
        ...withVersion,
        scene: {
          ...withVersion.scene,
          root: normalizeNode((withVersion.scene as any).root, 'root')
        }
      };
    }

    if (withVersion.intent === 'edit' && isObject(withVersion.patch) && Array.isArray((withVersion.patch as any).operations)) {
      const operations = (withVersion.patch as any).operations.map((op: any) => {
        if (!isObject(op)) return op;
        if (op.op === 'add_node' && isObject(op.node)) {
          return {
            ...op,
            node: normalizeNode(op.node, 'patch_add')
          };
        }
        if (op.op === 'set_props' && !isObject(op.props) && isObject(op.params)) {
          return {
            ...op,
            props: op.params
          };
        }
        return op;
      });
      return {
        ...withVersion,
        patch: {
          ...withVersion.patch,
          operations
        }
      };
    }

    return withVersion;
  };

  const nowIso = (): string => new Date().toISOString();

  const normalizeTaskStatus = (status: any): PlanTaskStatus => {
    const normalized = String(status || '').toLowerCase();
    if (
      normalized === 'pending' ||
      normalized === 'in_progress' ||
      normalized === 'done' ||
      normalized === 'failed' ||
      normalized === 'blocked'
    ) {
      return normalized;
    }
    return 'pending';
  };

  const normalizePlanTask = (task: any, index: number): PlanTask => {
    const taskId =
      typeof task?.taskId === 'string' && task.taskId.trim()
        ? task.taskId.trim()
        : `task_${index + 1}`;
    const titleRaw =
      typeof task?.title === 'string' && task.title.trim()
        ? task.title
        : typeof task?.name === 'string' && task.name.trim()
          ? task.name
          : taskId;
    const typeRaw =
      typeof task?.type === 'string' && task.type.trim()
        ? task.type
        : 'generic';
    const dependsOn = Array.isArray(task?.dependsOn)
      ? task.dependsOn.map((id: any) => String(id)).filter(Boolean)
      : [];
    const requiredSpecs = Array.isArray(task?.requiredSpecs)
      ? task.requiredSpecs.map((id: any) => String(id)).filter(Boolean)
      : [];
    const retriesRaw = Number(task?.retries);
    const retries = Number.isFinite(retriesRaw) && retriesRaw > 0 ? Math.floor(retriesRaw) : 0;

    return {
      taskId,
      title: String(titleRaw),
      type: String(typeRaw),
      targetNodeId:
        typeof task?.targetNodeId === 'string' && task.targetNodeId.trim()
          ? task.targetNodeId
          : undefined,
      dependsOn,
      requiredSpecs,
      status: normalizeTaskStatus(task?.status),
      retries,
      notes:
        typeof task?.notes === 'string' && task.notes.trim()
          ? task.notes
          : undefined
    };
  };

  const normalizePlanPayload = (payload: any, fallbackGoal: string): AgentPlanState | null => {
    const source = isObject(payload?.plan) ? payload.plan : payload;
    if (!isObject(source)) return null;

    const rawTasks = Array.isArray(source.tasks) ? source.tasks : [];
    if (rawTasks.length === 0) return null;

    const tasks = rawTasks.map((task: any, index: number) => normalizePlanTask(task, index));
    const createdAt =
      typeof source.createdAt === 'string' && source.createdAt
        ? source.createdAt
        : nowIso();

    return {
      planId:
        typeof source.planId === 'string' && source.planId.trim()
          ? source.planId
          : `plan_${Date.now()}`,
      rootGoal:
        typeof source.rootGoal === 'string' && source.rootGoal.trim()
          ? source.rootGoal
          : fallbackGoal,
      tasks,
      createdAt,
      updatedAt: nowIso()
    };
  };

  const summarizePlan = (plan: AgentPlanState): string => {
    const counts = plan.tasks.reduce(
      (acc, task) => {
        acc[task.status] += 1;
        return acc;
      },
      {
        pending: 0,
        in_progress: 0,
        done: 0,
        failed: 0,
        blocked: 0
      } as Record<PlanTaskStatus, number>
    );

    const lines = plan.tasks.slice(0, 8).map((task) => {
      const deps = task.dependsOn.length > 0 ? ` dependsOn=${task.dependsOn.join(',')}` : '';
      return `- [${task.status}] ${task.taskId}: ${task.title}${deps}`;
    });
    if (plan.tasks.length > 8) lines.push(`- ... +${plan.tasks.length - 8} more`);

    return [
      `Plan ${plan.planId} | goal=${plan.rootGoal}`,
      `Counts: pending=${counts.pending}, in_progress=${counts.in_progress}, done=${counts.done}, failed=${counts.failed}, blocked=${counts.blocked}`,
      ...lines
    ].join('\n');
  };

  const getUnfinishedTasks = (plan: AgentPlanState): PlanTask[] =>
    plan.tasks.filter((task) => task.status !== 'done');

  const isTaskDone = (plan: AgentPlanState, taskId: string): boolean => {
    const task = plan.tasks.find((t) => t.taskId === taskId);
    return Boolean(task && task.status === 'done');
  };

  const getNextExecutableTask = (plan: AgentPlanState): PlanTask | null => {
    for (const task of plan.tasks) {
      if (task.status !== 'pending' && task.status !== 'failed') continue;
      const depsDone = task.dependsOn.every((depId) => isTaskDone(plan, depId));
      if (depsDone) return task;
    }
    return null;
  };

  const updateTaskStatus = (
    plan: AgentPlanState,
    taskId: string,
    status: PlanTaskStatus,
    notes?: string
  ): AgentPlanState => {
    let changed = false;
    const tasks = plan.tasks.map((task) => {
      if (task.taskId !== taskId) return task;
      changed = true;
      const retries = status === 'failed' ? task.retries + 1 : task.retries;
      const finalStatus: PlanTaskStatus =
        status === 'failed' && retries >= TASK_MAX_RETRIES
          ? 'blocked'
          : status;
      const finalNotes =
        status === 'failed' && retries >= TASK_MAX_RETRIES
          ? notes
            ? `${notes}; auto-blocked after ${retries} retries`
            : `auto-blocked after ${retries} retries`
          : notes || task.notes;
      return {
        ...task,
        status: finalStatus,
        retries,
        notes: finalNotes
      };
    });
    if (!changed) return plan;
    return {
      ...plan,
      tasks,
      updatedAt: nowIso()
    };
  };

  const appendPlanTasks = (plan: AgentPlanState, rawTasks: any[]): AgentPlanState => {
    if (!Array.isArray(rawTasks) || rawTasks.length === 0) return plan;
    const existing = new Set(plan.tasks.map((t) => t.taskId));
    const additions: PlanTask[] = [];
    rawTasks.forEach((task, index) => {
      const normalized = normalizePlanTask(task, plan.tasks.length + index);
      if (existing.has(normalized.taskId)) return;
      additions.push(normalized);
      existing.add(normalized.taskId);
    });
    if (additions.length === 0) return plan;
    return {
      ...plan,
      tasks: [...plan.tasks, ...additions],
      updatedAt: nowIso()
    };
  };

  const findTaskById = (plan: AgentPlanState, taskId?: string): PlanTask | null => {
    if (!taskId) return null;
    return plan.tasks.find((task) => task.taskId === taskId) || null;
  };

  const resolveTaskParentNodeId = (
    plan: AgentPlanState | null,
    task: PlanTask,
    explicitParentId?: string
  ): string | undefined => {
    if (explicitParentId) return explicitParentId;
    if (!plan) return task.targetNodeId;
    if (task.targetNodeId) return task.targetNodeId;

    for (const depId of task.dependsOn) {
      const depTask = findTaskById(plan, depId);
      if (depTask?.targetNodeId) return depTask.targetNodeId;
    }

    const shellTask = plan.tasks.find((t) => t.type === 'create_shell' && t.targetNodeId);
    return shellTask?.targetNodeId;
  };

  const resolveDefaultParentForAction = (
    plan: AgentPlanState | null,
    actionTaskId?: string,
    explicitParentId?: string,
    componentId?: string
  ): string | undefined => {
    if (explicitParentId && explicitParentId.trim()) return explicitParentId.trim();
    // Keep page creation at canvas root unless caller explicitly sets a parent.
    if (componentId === 'page') return undefined;
    if (!plan) return undefined;

    if (actionTaskId) {
      const task = findTaskById(plan, actionTaskId);
      if (task) {
        const fromTask = resolveTaskParentNodeId(plan, task);
        if (fromTask) return fromTask;
      }
    }

    const shellTask = plan.tasks.find(
      (t) => t.type === 'create_shell' && t.status === 'done' && t.targetNodeId
    );
    return shellTask?.targetNodeId;
  };

  const updateTaskTargetNodeId = (
    plan: AgentPlanState,
    taskId: string,
    targetNodeId: string
  ): AgentPlanState => {
    let changed = false;
    const tasks = plan.tasks.map((task) => {
      if (task.taskId !== taskId) return task;
      changed = true;
      return {
        ...task,
        targetNodeId
      };
    });
    if (!changed) return plan;
    return {
      ...plan,
      tasks,
      updatedAt: nowIso()
    };
  };

  const buildPlanContextMessage = (plan: AgentPlanState): string => {
    const nextTask = getNextExecutableTask(plan);
    const snapshot = {
      planId: plan.planId,
      rootGoal: plan.rootGoal,
      updatedAt: plan.updatedAt,
      tasks: plan.tasks
    };
    return [
      'PlanState (system source of truth):',
      JSON.stringify(snapshot, null, 2),
      nextTask
        ? `NextExecutableTaskHint: ${JSON.stringify(nextTask)}`
        : 'NextExecutableTaskHint: null'
    ].join('\n');
  };

  const inferInitialPlanFromUserInput = (input: string): AgentPlanState | null => {
    // Disable auto plan for now as it is not mature enough.
    return null;
    const text = String(input || '').trim();
    if (!text) return null;
    const lower = text.toLowerCase();

    const hasPageIntent =
      /页面|page|dashboard|screen|界面|看板|workspace|画布/.test(text) ||
      /(page|dashboard|screen|workspace)/.test(lower);
    const blockCandidates: Array<{ id: string; title: string; type: string }> = [];
    const pushUnique = (item: { id: string; title: string; type: string }) => {
      if (blockCandidates.some((it) => it.id === item.id)) return;
      blockCandidates.push(item);
    };

    if (/表格|列表|table|grid|list/.test(text) || /\b(table|grid|list)\b/.test(lower)) {
      pushUnique({ id: 'list', title: '下钻列表/表格区', type: 'expand_table_block' });
    }
    if (/图表|趋势|chart|graph|bar|line|pie/.test(text) || /\b(chart|graph|bar|line|pie)\b/.test(lower)) {
      pushUnique({ id: 'chart', title: '下钻图表区', type: 'expand_chart_block' });
    }
    if (/表单|筛选|输入|form|filter|search/.test(text) || /\b(form|filter|search)\b/.test(lower)) {
      pushUnique({ id: 'form', title: '下钻表单/筛选区', type: 'expand_form_block' });
    }
    if (/tab|标签页|切换/.test(text) || /\btab\b/.test(lower)) {
      pushUnique({ id: 'tabs', title: '下钻标签切换区', type: 'expand_tabs_block' });
    }

    const shouldCreatePlan = hasPageIntent || blockCandidates.length >= 2;
    if (!shouldCreatePlan) return null;

    const tasks: PlanTask[] = [
      {
        taskId: 't_shell',
        title: hasPageIntent ? '创建页面外壳' : '创建外层容器',
        type: 'create_shell',
        dependsOn: [],
        requiredSpecs: ['page', 'layout'],
        status: 'pending',
        retries: 0
      }
    ];

    blockCandidates.forEach((candidate, index) => {
      tasks.push({
        taskId: `t_${candidate.id}_${index + 1}`,
        title: candidate.title,
        type: candidate.type,
        dependsOn: ['t_shell'],
        requiredSpecs:
          candidate.type === 'expand_table_block'
            ? ['table', 'table-column', 'table-header-cell', 'table-cell']
              : candidate.type === 'expand_chart_block'
                ? ['figma-component', 'card', 'layout']
              : candidate.type === 'expand_form_block'
                ? ['form', 'form-row', 'form-field', 'input', 'select', 'checkbox', 'checkbox-group', 'radio-group', 'button', 'figma-component']
                : ['button', 'card', 'layout'],
        status: 'pending',
        retries: 0
      });
    });

    return {
      planId: `plan_auto_${Date.now()}`,
      rootGoal: text,
      tasks,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
  };

  const readActionTaskId = (action: any): string | undefined => {
    if (typeof action?.taskId === 'string' && action.taskId.trim()) return action.taskId;
    if (typeof action?.payload?.taskId === 'string' && action.payload.taskId.trim()) {
      return action.payload.taskId;
    }
    return undefined;
  };

  const createComponentNode = (component: any, parentIdVal?: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const abortSignal = llmAbortRef.current?.signal;
      const handler = (event: MessageEvent) => {
        const data = event.data.pluginMessage || {};
        const { type, nodeId, message } = data;
        // #region debug-point B:create-component-recv
        fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"20260319-tn-init",runId:"pre-fix",hypothesisId:"B",location:"App.tsx:5069",msg:"[DEBUG] create-component recv",data:{type,hasNodeId:Boolean(nodeId),hasMessage:Boolean(message)}})}).catch(()=>{});
        // #endregion
        if (type === 'create-success') {
          window.removeEventListener('message', handler);
          abortSignal?.removeEventListener('abort', onAbort);
          resolve(nodeId);
        } else if (type === 'error') {
          window.removeEventListener('message', handler);
          abortSignal?.removeEventListener('abort', onAbort);
          reject(message);
        }
      };
      const onAbort = () => {
        window.removeEventListener('message', handler);
        abortSignal?.removeEventListener('abort', onAbort);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      window.addEventListener('message', handler);
      if (abortSignal) {
        if (abortSignal.aborted) {
          onAbort();
          return;
        }
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }

      window.parent.postMessage({
        pluginMessage: {
          type: 'create-component',
          component,
          parentId: parentIdVal
        }
      }, '*');
      // #region debug-point B:create-component-send
      fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"20260319-tn-init",runId:"pre-fix",hypothesisId:"B",location:"App.tsx:5096",msg:"[DEBUG] create-component send",data:{hasParentId:Boolean(parentIdVal)}})}).catch(()=>{});
      // #endregion
    });
  };

  const applySceneEnvelope = (
    env: any,
    applyMode: 'strict' | 'best_effort',
    parentId?: string
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const abortSignal = llmAbortRef.current?.signal;
      const handler = (event: MessageEvent) => {
        const data = event.data.pluginMessage || {};
        // #region debug-point C:apply-envelope-recv
        fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"20260319-tn-init",runId:"pre-fix",hypothesisId:"C",location:"App.tsx:5113",msg:"[DEBUG] apply-envelope recv",data:{type:data.type,hasResult:typeof data.result !== 'undefined',hasMessage:Boolean(data.message)}})}).catch(()=>{});
        // #endregion
        if (data.type === 'apply-result') {
          window.removeEventListener('message', handler);
          abortSignal?.removeEventListener('abort', onAbort);
          resolve(data.result);
        } else if (data.type === 'error') {
          window.removeEventListener('message', handler);
          abortSignal?.removeEventListener('abort', onAbort);
          reject(data.message || 'Unknown apply error');
        }
      };
      const onAbort = () => {
        window.removeEventListener('message', handler);
        abortSignal?.removeEventListener('abort', onAbort);
        reject(new DOMException('Aborted', 'AbortError'));
      };

      window.addEventListener('message', handler);
      if (abortSignal) {
        if (abortSignal.aborted) {
          onAbort();
          return;
        }
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }
      window.parent.postMessage({
        pluginMessage: {
          type: 'apply-envelope',
          envelope: env,
          mode: applyMode,
          parentId
        }
      }, '*');
      // #region debug-point C:apply-envelope-send
      fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"20260319-tn-init",runId:"pre-fix",hypothesisId:"C",location:"App.tsx:5139",msg:"[DEBUG] apply-envelope send",data:{mode:applyMode,hasParentId:Boolean(parentId)}})}).catch(()=>{});
      // #endregion
    });
  };

  const handleStreamTableEvent = async (event: StreamTableEvent, plan: AgentPlanState | null) => {
    if (event.event === 'table_start') {
      const normalized = normalizeStreamTablePayload(event);
      if (!normalized) return;
      streamTableRunIdRef.current += 1;
      const tableId = `stream_table_${streamTableRunIdRef.current}`;
      const parentId = resolveDefaultParentForAction(plan, undefined, undefined);
      const scene = buildStreamTableScene(
        {
          headers: normalized.headers,
          rows: normalized.rows,
          columnTypes: normalized.columnTypes,
          columnWidths: normalized.columnWidths,
          rowHeight: normalized.rowHeight
        },
        tableId
      );
      if (!scene) return;
      streamTableStateRef.current = {
        tableId,
        headers: normalized.headers,
        rows: [...normalized.rows],
        columnTypes: normalized.columnTypes,
        columnWidths: normalized.columnWidths,
        rowHeight: normalized.rowHeight,
        columnNodeIds: scene.columnNodeIds,
        rowCount: normalized.rows.length,
        parentId
      };
      const envelope = normalizeSceneEnvelopeForSend({
        version: '1.0',
        intent: 'create',
        scene: { root: scene.root }
      });
      if (!envelope) return;
      await applySceneEnvelope(envelope, 'best_effort', parentId);
      return;
    }

    if (event.event === 'table_row') {
      const state = streamTableStateRef.current;
      if (!state) return;
      const cells = buildTableRowCellsFromPayload(
        state.headers,
        event.row,
        state.columnTypes,
        state.columnWidths,
        state.rowHeight
      );
      if (cells.length === 0) return;
      const nextRowCount = state.rowCount + 1;
      const operations: any[] = [];
      cells.forEach((cell: any, colIndex: number) => {
        const parentId = state.columnNodeIds[colIndex];
        if (!parentId) return;
        operations.push({
          op: 'add_node',
          parentId,
          node: {
            nodeId: `${state.tableId}_col_${colIndex + 1}_cell_${nextRowCount}`,
            componentId: cell.componentId,
            props: cell.params || {}
          }
        });
      });
      state.columnNodeIds.forEach((columnId) => {
        operations.push({
          op: 'set_props',
          nodeId: columnId,
          props: { rowCount: nextRowCount }
        });
      });
      operations.push({
        op: 'set_props',
        nodeId: state.tableId,
        props: { rowCount: nextRowCount }
      });
      const envelope = normalizeSceneEnvelopeForSend({
        version: '1.0',
        intent: 'edit',
        patch: { operations }
      });
      if (!envelope) return;
      await applySceneEnvelope(envelope, 'best_effort', state.parentId);
      state.rowCount = nextRowCount;
      state.rows.push(event.row);
      return;
    }

    if (event.event === 'table_done') {
      streamTableStateRef.current = null;
    }
  };

  const inspectFigmaComponentProps = (payload: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const abortSignal = llmAbortRef.current?.signal;
      const handler = (event: MessageEvent) => {
        const data = event.data.pluginMessage || {};
        if (data.type === 'inspect-figma-component-props-result') {
          window.removeEventListener('message', handler);
          abortSignal?.removeEventListener('abort', onAbort);
          resolve(data.data || {});
        } else if (data.type === 'error') {
          window.removeEventListener('message', handler);
          abortSignal?.removeEventListener('abort', onAbort);
          reject(data.message || 'inspect failed');
        }
      };
      const onAbort = () => {
        window.removeEventListener('message', handler);
        abortSignal?.removeEventListener('abort', onAbort);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      window.addEventListener('message', handler);
      if (abortSignal) {
        if (abortSignal.aborted) {
          onAbort();
          return;
        }
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }

      window.parent.postMessage(
        {
          pluginMessage: {
            type: 'inspect-figma-component-props',
            payload
          }
        },
        '*'
      );
    });
  };

  const inspectFigmaComponentStructure = (payload: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const abortSignal = llmAbortRef.current?.signal;
      const handler = (event: MessageEvent) => {
        const data = event.data.pluginMessage || {};
        if (data.type === 'inspect-figma-component-structure-result') {
          window.removeEventListener('message', handler);
          abortSignal?.removeEventListener('abort', onAbort);
          resolve(data.data || {});
        } else if (data.type === 'error') {
          window.removeEventListener('message', handler);
          abortSignal?.removeEventListener('abort', onAbort);
          reject(data.message || 'inspect structure failed');
        }
      };
      const onAbort = () => {
        window.removeEventListener('message', handler);
        abortSignal?.removeEventListener('abort', onAbort);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      window.addEventListener('message', handler);
      if (abortSignal) {
        if (abortSignal.aborted) {
          onAbort();
          return;
        }
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }

      window.parent.postMessage(
        {
          pluginMessage: {
            type: 'inspect-figma-component-structure',
            payload
          }
        },
        '*'
      );
    });
  };

  const buildTokenToComponentIds = (): Record<string, string[]> => {
    const registry = loadRegistry();
    const tokenToComponentIds: Record<string, string[]> = {};
    const addTokenMapping = (token: string, componentId: string) => {
      const normalizedToken = String(token || '').trim();
      const normalizedComponentId = String(componentId || '').trim();
      if (!normalizedToken || !normalizedComponentId) return;
      if (!tokenToComponentIds[normalizedToken]) tokenToComponentIds[normalizedToken] = [];
      if (!tokenToComponentIds[normalizedToken].includes(normalizedComponentId)) {
        tokenToComponentIds[normalizedToken].push(normalizedComponentId);
      }
    };

    Object.entries(SPEC_COMPONENT_TOKEN_MAP).forEach(([token, componentIds]) => {
      componentIds.forEach((componentId) => addTokenMapping(token, componentId));
    });

    Object.values(registry.components).forEach((def) => {
      const param = (def.params || ({} as any)).componentToken as any;
      const token = typeof param?.default === 'string' ? param.default.trim() : '';
      if (token) {
        addTokenMapping(token, def.id);
        const semanticProfile = SEMANTIC_COMPONENT_TOKEN_PACK[token];
        if (semanticProfile?.baseToken) {
          addTokenMapping(semanticProfile.baseToken, def.id);
        }
      }

      const snapshotToken = typeof def.figmaPropertySnapshot?.token === 'string'
        ? def.figmaPropertySnapshot.token.trim()
        : '';
      if (snapshotToken) {
        addTokenMapping(snapshotToken, def.id);
      }
    });
    return tokenToComponentIds;
  };

  const buildDiscoveredPropertySnapshot = (item: any, inspectedAt: string) => ({
    token: typeof item?.token === 'string' && item.token.trim() ? item.token.trim() : undefined,
    componentKey: String(item?.componentKey || ''),
    inspectedAt,
    source: 'discover_component_props' as const,
    properties: Array.isArray(item?.properties)
      ? item.properties.map((prop: any) => ({
          propertyName: String(prop?.propertyName || ''),
          displayName: typeof prop?.displayName === 'string' ? prop.displayName : undefined,
          type: String(prop?.type || ''),
          defaultValue:
            typeof prop?.defaultValue === 'string' || typeof prop?.defaultValue === 'boolean'
              ? prop.defaultValue
              : undefined,
          options: Array.isArray(prop?.variantOptions)
            ? prop.variantOptions.map((x: any) => String(x))
            : undefined
        }))
      : []
  });

  const buildComponentStructurePayload = (inspectResult: any) => {
    const results = Array.isArray(inspectResult?.results) ? inspectResult.results : [];
    return pruneCompactValue({
      requested: Number(inspectResult?.requested || 0),
      processed: Number(inspectResult?.processed || 0),
      summary: inspectResult?.summary || {},
      results: results.map((item: any) => compactStructureResult(item))
    });
  };

  const buildComponentStructureJson = (inspectResult: any): string => {
    return JSON.stringify(buildComponentStructurePayload(inspectResult), null, 2);
  };

  const buildComponentSpecPatchPayload = (inspectResult: any, inspectedAt?: string) => {
    const now = inspectedAt || new Date().toISOString();
    const rawResults = Array.isArray(inspectResult?.results) ? inspectResult.results : [];
    const okResults = rawResults.filter((item: any) => item?.status === 'ok');

    const tokenToComponentIds = buildTokenToComponentIds();

    const patches: Array<{
      componentId?: string;
      token?: string;
      componentKey: string;
      figmaPropertySnapshot: {
        token?: string;
        componentKey: string;
        inspectedAt: string;
        source: 'discover_component_props';
        properties: Array<{
          propertyName: string;
          displayName?: string;
          type: string;
          defaultValue?: string | boolean;
          options?: string[];
        }>;
      };
      note?: string;
    }> = [];

    okResults.forEach((item: any) => {
      const token = typeof item?.token === 'string' ? item.token : '';
      const componentIds = token ? (tokenToComponentIds[token] || []) : [];
      const snapshot = buildDiscoveredPropertySnapshot(item, now);

      if (componentIds.length === 0) {
        patches.push({
          token: token || undefined,
          componentKey: snapshot.componentKey,
          figmaPropertySnapshot: snapshot,
          note: 'no token->componentId mapping found; add mapping in src/spec.component-token-map.ts'
        });
        return;
      }

      componentIds.forEach((componentId) => {
        patches.push({
          componentId,
          token: token || undefined,
          componentKey: snapshot.componentKey,
          figmaPropertySnapshot: snapshot
        });
      });
    });

    const payload = {
      generatedAt: now,
      source: 'discover_component_props',
      requested: Number(inspectResult?.requested || 0),
      processed: Number(inspectResult?.processed || 0),
      truncated: Boolean(inspectResult?.truncated),
      patchCount: patches.length,
      patches
    };
    return payload;
  };

  const buildComponentSpecPatchJson = (inspectResult: any): string => {
    return JSON.stringify(buildComponentSpecPatchPayload(inspectResult), null, 2);
  };

  const buildComponentInspectJson = (inspectResult: any): string => {
    const inspectedAt = new Date().toISOString();
    const structurePayload = buildComponentStructurePayload(inspectResult) as any;
    const specPayload = buildComponentSpecPatchPayload(inspectResult, inspectedAt) as any;
    const specIndex = new Map<string, {
      componentIds: string[];
      figmaPropertySnapshot?: any;
      note?: string;
    }>();

    const specPatches = Array.isArray(specPayload?.patches) ? specPayload.patches : [];
    specPatches.forEach((patch: any) => {
      const key = `${String(patch?.componentKey || '')}::${String(patch?.token || '')}`;
      const existing = specIndex.get(key);
      const nextComponentIds = new Set<string>(existing?.componentIds || []);
      if (typeof patch?.componentId === 'string' && patch.componentId.trim()) {
        nextComponentIds.add(patch.componentId.trim());
      }
      specIndex.set(key, {
        componentIds: Array.from(nextComponentIds),
        figmaPropertySnapshot: patch?.figmaPropertySnapshot || existing?.figmaPropertySnapshot,
        note: patch?.note || existing?.note
      });
    });

    const structureResults = Array.isArray(structurePayload?.results) ? structurePayload.results : [];
    const bundledResults = structureResults.map((result: any) => {
      const key = `${String(result?.componentKey || '')}::${String(result?.token || '')}`;
      const specMeta = specIndex.get(key);
      return pruneCompactValue({
        ...result,
        spec: specMeta
          ? {
              componentIds: specMeta.componentIds,
              figmaPropertySnapshot: specMeta.figmaPropertySnapshot,
              note: specMeta.note
            }
          : undefined
      });
    });

    return JSON.stringify(
      pruneCompactValue({
        generatedAt: inspectedAt,
        source: 'inspect_component_structure',
        requested: Number(inspectResult?.requested || 0),
        processed: Number(inspectResult?.processed || 0),
        summary: inspectResult?.summary || {},
        truncated: Boolean(inspectResult?.truncated),
        results: bundledResults
      }),
      null,
      2
    );
  };

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopyInspectJson = async () => {
    if (!componentInspectJson) return;
    const ok = await copyTextToClipboard(componentInspectJson);
    const msg = ok ? '已复制统一反查 JSON。' : '复制失败，请手动复制。';
    setResponse((prev) => (prev ? `${prev}\n\n[System]: ${msg}` : `[System]: ${msg}`));
  };

  const handleInspectStructureByTokenInput = async () => {
    if (componentInspectionRunning || loading) return;
    const tokens = String(componentInspectTokenInput || '')
      .split(/[,\n\r\t ]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length === 0) {
      setComponentInspectionSummary('请输入至少一个 token。');
      return;
    }
    setComponentInspectionRunning(true);
    try {
      const inspectResult = await inspectFigmaComponentStructure({
        tokens,
        includeErrors: true,
        maxDepth: 6,
        maxChildren: 24
      });
      const summary = inspectResult?.summary || {};
      const success = Number(summary.success || 0);
      const failed = Number(summary.failed || 0);
      const summaryText = `结构反查完成：success=${success}, failed=${failed}`;
      setComponentInspectionSummary(summaryText);
      setComponentInspectJson(buildComponentInspectJson(inspectResult));
      setResponse((prev) => (prev ? `${prev}\n\n[System]: ${summaryText}` : `[System]: ${summaryText}`));
    } catch (e) {
      const msg = `结构反查失败: ${String(e)}`;
      setComponentInspectionSummary(msg);
      setResponse((prev) => (prev ? `${prev}\n\n[System]: ${msg}` : `[System]: ${msg}`));
    } finally {
      setComponentInspectionRunning(false);
    }
  };

  const executeTaskByType = async (
    task: PlanTask,
    payload: any,
    planContext: AgentPlanState | null
  ): Promise<{ ok: boolean; message: string; nodeId?: string }> => {
    const explicitParentId = typeof payload?.parentId === 'string' && payload.parentId
      ? payload.parentId
      : undefined;
    const parentId = resolveTaskParentNodeId(planContext, task, explicitParentId);

    if (task.type === 'create_shell') {
      const titleRaw = typeof payload?.title === 'string' && payload.title.trim()
        ? payload.title
        : typeof payload?.pageTitle === 'string' && payload.pageTitle.trim()
          ? payload.pageTitle
          : '页面容器';
      const pageComponent = {
        componentId: 'page',
        params: {
          title: String(titleRaw).slice(0, 32)
        }
      };
      const nodeId = await createComponentNode(pageComponent, parentId);
      return {
        ok: true,
        nodeId,
        message: `[System]: execute_task ${task.taskId} success (create_shell, ID: ${nodeId}${parentId ? `, parent=${parentId}` : ''}).`
      };
    }

    if (task.type === 'expand_table_block') {
      const block =
        buildTableBlockComponentFromPayload(payload, '') ||
        buildTableBlockComponentFromPayload(
          {
            block: {
              container: {},
              body: {
                table: {
                  headers: ['列1', '列2', '列3'],
                  rows: [['', '', '']]
                }
              }
            }
          },
          ''
        );
      if (!block) {
        return {
          ok: false,
          message: `[System]: execute_task ${task.taskId} failed: invalid table block payload.`
        };
      }
      const nodeId = await createComponentNode(block, parentId);
      return {
        ok: true,
        nodeId,
        message: `[System]: execute_task ${task.taskId} success (expand_table_block, ID: ${nodeId}${parentId ? `, parent=${parentId}` : ''}).`
      };
    }

    if (task.type === 'expand_chart_block') {
      const block =
        buildChartBlockComponentFromPayload(payload, task.title || '图表区') ||
        buildChartBlockComponentFromPayload(
          {
            block: {
              container: { title: task.title || '图表区' },
              body: {
                charts: [{ title: '趋势', height: 220 }]
              }
            }
          },
          task.title || '图表区'
        );
      if (!block) {
        return {
          ok: false,
          message: `[System]: execute_task ${task.taskId} failed: invalid chart block payload.`
        };
      }
      const nodeId = await createComponentNode(block, parentId);
      return {
        ok: true,
        nodeId,
        message: `[System]: execute_task ${task.taskId} success (expand_chart_block, ID: ${nodeId}${parentId ? `, parent=${parentId}` : ''}).`
      };
    }

    if (task.type === 'expand_form_block') {
      const block =
        buildFormBlockComponentFromPayload(payload, task.title || '筛选区') ||
        buildFormBlockComponentFromPayload(
          {
            block: {
              container: { title: task.title || '筛选区' },
              body: {
                rows: [[
                  { componentId: 'input', props: { placeholder: '输入关键词' } },
                  { componentId: 'select', props: { value: '全部状态' } },
                  { componentId: 'button', props: { label: '搜索', variant: 'primary' } },
                  { componentId: 'button', props: { label: '重置', variant: 'secondary' } }
                ]]
              }
            }
          },
          task.title || '筛选区'
        );
      if (!block) {
        return {
          ok: false,
          message: `[System]: execute_task ${task.taskId} failed: invalid form block payload.`
        };
      }
      const nodeId = await createComponentNode(block, parentId);
      return {
        ok: true,
        nodeId,
        message: `[System]: execute_task ${task.taskId} success (expand_form_block, ID: ${nodeId}${parentId ? `, parent=${parentId}` : ''}).`
      };
    }

    if (task.type === 'expand_tabs_block') {
      const block =
        buildTabsBlockComponentFromPayload(payload, task.title || '标签切换区') ||
        buildTabsBlockComponentFromPayload(
          {
            block: {
              container: { title: task.title || '标签切换区' },
              body: {
                tabs: [
                  { label: '全部', active: true },
                  { label: '我的' },
                  { label: '归档' }
                ]
              }
            }
          },
          task.title || '标签切换区'
        );
      if (!block) {
        return {
          ok: false,
          message: `[System]: execute_task ${task.taskId} failed: invalid tabs block payload.`
        };
      }
      const nodeId = await createComponentNode(block, parentId);
      return {
        ok: true,
        nodeId,
        message: `[System]: execute_task ${task.taskId} success (expand_tabs_block, ID: ${nodeId}${parentId ? `, parent=${parentId}` : ''}).`
      };
    }

    return {
      ok: false,
      message: `[System]: execute_task ${task.taskId} failed: unsupported task type '${task.type}'.`
    };
  };

  const onSend = async () => {
    if (!canSend) return;

    stopRequestedRef.current = false;
    llmAbortRef.current?.abort();
    const abortController = new AbortController();
    llmAbortRef.current = abortController;
    thinkingStartedAtRef.current = Date.now();
    setThinkingSeconds(null);
    setThinkingActive(true);
    setThoughtDetailsExpanded(true);

    setGenerationLock(true);
    setLoading(true);
    setResponse(null); // Clear previous response
    setAttachmentError(null);

    const turnInput = userInput.trim()
      ? userInput
      : chartShortcutActive
        ? `生成一个${chartShortcutActive}`
        : userInput;
    const chartTokenOverride = getChartToken(turnInput, '');
    const turnImages = uploadedImages;
    const turnTables = uploadedTables;
    const currentTurnText = buildCurrentTurnText(turnInput, turnImages, turnTables);
    const displaySummary = buildUserSummary(turnInput, turnImages, turnTables);
    const currentTurnRichContent = buildRichUserContent(turnInput, turnImages, turnTables);

    // After sending, clear composer state for the next round.
    setLastUserMessage(currentTurnText);
    const displayInput = turnInput.trim() ? turnInput : displaySummary;
    setUiMessages((prev) => [
      ...prev,
      { role: 'user', content: displayInput, images: turnImages, tables: turnTables },
      { role: 'ai', content: '' }
    ]);
    setUserInput('');
    setChartPromptMode(false);
    setChartOverlayOpen(false);
    setChartShortcutActive(null);
    setChartMenuOpen(false);
    setUploadedImages([]);
    setUploadedTables([]);
    setAttachmentMenuOpen(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (tableInputRef.current) tableInputRef.current.value = '';
    
    // Initial message history
    let messages = [
      { role: "system", content: generateMasterPrompt() },
      ...chatHistory,
      { role: "user", content: currentTurnText }
    ];
    let runtimePlan: AgentPlanState | null = agentPlan
      ? {
          ...agentPlan,
          tasks: agentPlan.tasks.map((task) => ({
            ...task,
            dependsOn: [...task.dependsOn],
            requiredSpecs: [...task.requiredSpecs]
          }))
        }
      : null;

    const apiKey = '58347098-9b5b-4180-b539-95ea7c05e155';
    const url = 'https://ark-cn-beijing.bytedance.net/api/v3/chat/completions';

    // Helper to call LLM with streaming support
    const callLLM = async (msgs: any[], onStream?: (chunk: string) => void) => {
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const maxRetries = 10;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                if (abortController.signal.aborted) {
                    throw new DOMException('Aborted', 'AbortError');
                }
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({ 
                        model: "ep-20260129104027-mzlwg", 
                        messages: msgs,
                        stream: true 
                    }),
                    signal: abortController.signal
                });

                if (res.status === 429) {
                    // Try to parse error body for more info
                    let errorMsg = 'Rate Limited';
                    try {
                        const errorBody = await res.json();
                        errorMsg = errorBody.error?.message || errorBody.message || 'Rate Limited';
                    } catch (e) {
                        // ignore
                    }
                    if (abortController.signal.aborted) {
                        throw new DOMException('Aborted', 'AbortError');
                    }
                    
                    // Show error in UI immediately if it's the first attempt or if the user wants to see it
                    setResponse(prev => (prev ? prev + '\n' : '') + `[System]: Rate limited (429): ${errorMsg}. Retrying...`);

                    const retryAfter = res.headers.get('Retry-After');
                    const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000 * Math.pow(2, attempt); 
                    console.log(`Rate limited (429): ${errorMsg}. Attempt ${attempt + 1}/${maxRetries}. Retrying in ${waitTime}ms...`);
                    
                    // If the server says we exceeded quota/credits, no point retrying
                    if (errorMsg.includes('quota') || errorMsg.includes('insufficient_quota')) {
                        throw new Error(`API Error: ${errorMsg}`);
                    }

                    await sleep(waitTime);
                    attempt++;
                    continue;
                }

                if (!res.ok) {
                    throw new Error(`API Error: ${res.status} ${res.statusText}`);
                }

                const reader = res.body?.getReader();
                const decoder = new TextDecoder();
                let fullContent = '';
                let buffer = '';

                if (!reader) {
                    throw new Error('No reader available');
                }

                while (true) {
                    if (abortController.signal.aborted) {
                        throw new DOMException('Aborted', 'AbortError');
                    }
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;
                    const lines = buffer.split('\n');
                    
                    // The last element might be incomplete, keep it in buffer
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        if (line.trim() === 'data: [DONE]') continue;
                        if (line.startsWith('data: ')) {
                            try {
                                const json = JSON.parse(line.substring(6));
                                const content = json.choices[0]?.delta?.content || '';
                                if (content) {
                                    fullContent += content;
                                    if (onStream) onStream(content);
                                }
                            } catch (e) {
                                console.error('Error parsing stream:', e);
                            }
                        }
                    }
                }
                return fullContent;

            } catch (error) {
                if (abortController.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
                    throw error;
                }
                if (attempt === maxRetries - 1) throw error;
                attempt++;
                await sleep(1000 * Math.pow(2, attempt)); // Default backoff for other errors
            }
        }
        throw new Error('Max retries exceeded');
    };

    try {
        let loopCount = 0;
        const MAX_LOOPS = 20; // Increased loop limit for complex tasks

        let accumulatedLog = '';
        if (!runtimePlan) {
            const inferredPlan = inferInitialPlanFromUserInput(userInput);
            if (inferredPlan) {
                runtimePlan = inferredPlan;
                const summary = summarizePlan(runtimePlan);
                const autoMsg = `[System]: Auto plan initialized (${runtimePlan.tasks.length} tasks) for complex request.`;
                accumulatedLog += autoMsg + '\n' + summary;
                setResponse(accumulatedLog);
                messages.push({ role: "user", content: `System: Auto plan initialized.\n${summary}` });
            }
        }

        const executePlannedTask = async (task: PlanTask, payload: any) =>
          executeTaskByType(task, payload, runtimePlan);

        const trimmedTurnInput = String(turnInput || '').trim();
        const hasTablePrompt = TABLE_PROMPT_REGEX.test(trimmedTurnInput);
        const hasChartPrompt = /(图表|chart)/i.test(trimmedTurnInput);
        const hasTableAttachment = turnTables.some((table) => !table.parseError && table.headers.length > 0);
        const shouldPrefetchTableSpecs =
          (hasTablePrompt || hasTableAttachment) && !(hasChartPrompt && !hasTablePrompt);
        if (shouldPrefetchTableSpecs) {
            const { specsInfo, uniqueIds, idsToLoad } = buildSpecsInfo(
              TABLE_SPEC_IDS,
              readSpecsCacheRef.current,
              true
            );
            const sysMsg = buildSpecsSystemMessage(
              currentTurnText,
              uniqueIds,
              idsToLoad.length === 0 && uniqueIds.length > 0
            );
            accumulatedLog += (accumulatedLog ? '\n\n' : '') + sysMsg;
            setResponse(accumulatedLog);
            messages.push({ role: "user", content: `Here are the specs you requested:\n\n${specsInfo}` });
        }

        while (loopCount < MAX_LOOPS) {
            if (stopRequestedRef.current || abortController.signal.aborted) break;
            loopCount++;
            
            // 1. Get LLM response with streaming
            let currentStreamedResponse = '';
            let streamLineBuffer = '';
            const streamPlanSnapshot = runtimePlan;
            streamTableStateRef.current = null;
            const baseMessages = replaceLastUserMessageContent(messages, currentTurnRichContent);
            const messagesWithPlan = runtimePlan
              ? [...baseMessages, { role: "system", content: buildPlanContextMessage(runtimePlan) }]
              : baseMessages;
            const content = await callLLM(messagesWithPlan, (chunk) => {
                if (stopRequestedRef.current || abortController.signal.aborted) return;
                streamLineBuffer += chunk;
                const lines = streamLineBuffer.split('\n');
                streamLineBuffer = lines.pop() || '';
                let displayDelta = '';
                for (const line of lines) {
                    if (line.trimStart().startsWith(STREAM_TABLE_PREFIX)) {
                        const events = extractStreamTableEvents(line);
                        events.forEach((event) => {
                            enqueueStreamTableTask(() => handleStreamTableEvent(event, streamPlanSnapshot));
                        });
                    } else {
                        displayDelta += line + '\n';
                    }
                }
                if (displayDelta) {
                    currentStreamedResponse += displayDelta;
                    setResponse(accumulatedLog + (accumulatedLog ? '\n\n' : '') + `[Streaming]: ${currentStreamedResponse}`);
                }
            });
            if (streamLineBuffer.trim()) {
                if (streamLineBuffer.trimStart().startsWith(STREAM_TABLE_PREFIX)) {
                    const events = extractStreamTableEvents(streamLineBuffer);
                    events.forEach((event) => {
                        enqueueStreamTableTask(() => handleStreamTableEvent(event, streamPlanSnapshot));
                    });
                } else {
                    currentStreamedResponse += streamLineBuffer;
                    setResponse(accumulatedLog + (accumulatedLog ? '\n\n' : '') + `[Streaming]: ${currentStreamedResponse}`);
                }
                streamLineBuffer = '';
            }
            
            // Update UI with final thought for this turn
            let actionData: any;
            try {
                const sanitizedContent = stripStreamTableLines(content);
                actionData = parseAgentActionJson(sanitizedContent);
                
                // Build the log entry for this turn
                let turnLog = '';
                if (actionData.thought) {
                    turnLog += `[AI]: ${actionData.thought}`;
                }
                const compactActionJson = JSON.stringify(actionData);
                turnLog += (turnLog ? '\n' : '') + `[JSON]: ${compactActionJson}`;

                // Store a compact form in history to reduce future prompt tokens.
                messages.push({ role: "assistant", content: compactActionJson });
                
                // Commit to accumulated log
                accumulatedLog += (accumulatedLog ? '\n\n' : '') + turnLog;
                setResponse(accumulatedLog);
                
            } catch (e) {
                // If it's the last chunk and still not valid JSON, show raw
                // But during streaming, it might be incomplete JSON, so we just wait or show partial?
                // Actually, here we only parse AFTER full content is received for the turn.
                console.log("Failed to parse JSON", content);
                messages.push({ role: "assistant", content });
                accumulatedLog += (accumulatedLog ? '\n\n' : '') + `[Raw]: ${content}`;
                setResponse(accumulatedLog);
                break; 
            }

            if (!actionData || !actionData.action) {
                break;
            }

            const action = actionData.action;
            const actionTaskId = readActionTaskId(action);
            const isPlanControlAction =
              action.type === 'set_plan' ||
              action.type === 'init_plan' ||
              action.type === 'plan_next' ||
              action.type === 'next_task' ||
              action.type === 'update_plan' ||
              action.type === 'plan_update';

            if (runtimePlan && actionTaskId && !isPlanControlAction) {
                runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'in_progress');
            }

            if (action.type === 'set_plan' || action.type === 'init_plan') {
                const nextPlan = normalizePlanPayload(action.payload, userInput);
                if (!nextPlan) {
                    const invalidMsg = `[System]: Invalid set_plan payload.`;
                    accumulatedLog += '\n\n' + invalidMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: invalidMsg });
                } else {
                    runtimePlan = nextPlan;
                    const summary = summarizePlan(runtimePlan);
                    const okMsg = `[System]: Plan initialized (${runtimePlan.tasks.length} tasks).`;
                    accumulatedLog += '\n\n' + okMsg + '\n' + summary;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: `System: Plan initialized.\n${summary}` });
                }
                continue;
            }

            if (action.type === 'plan_next' || action.type === 'next_task') {
                if (!runtimePlan) {
                    const missingMsg = `[System]: plan_next failed: no active plan. Use set_plan first.`;
                    accumulatedLog += '\n\n' + missingMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: missingMsg });
                    continue;
                }

                const nextTask = getNextExecutableTask(runtimePlan);
                if (nextTask) {
                    runtimePlan = updateTaskStatus(runtimePlan, nextTask.taskId, 'in_progress');
                    const msg = `[System]: Next task -> ${nextTask.taskId} (${nextTask.title}).`;
                    accumulatedLog += '\n\n' + msg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: `System: Next task: ${JSON.stringify(nextTask)}` });
                } else {
                    const unfinished = getUnfinishedTasks(runtimePlan);
                    const msg = unfinished.length === 0
                      ? `[System]: Plan has no pending tasks.`
                      : `[System]: No executable task now (waiting dependencies).`;
                    accumulatedLog += '\n\n' + msg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: msg });
                }
                continue;
            }

            if (action.type === 'update_plan' || action.type === 'plan_update') {
                if (!runtimePlan) {
                    const missingMsg = `[System]: update_plan failed: no active plan. Use set_plan first.`;
                    accumulatedLog += '\n\n' + missingMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: missingMsg });
                    continue;
                }

                let nextPlan = runtimePlan;
                let changed = false;
                const payload = isObject(action.payload) ? action.payload : {};

                const applyTaskUpdate = (item: any) => {
                  if (!isObject(item) || typeof item.taskId !== 'string' || !item.taskId.trim()) return;
                  const taskId = item.taskId.trim();
                  const hasStatus = typeof item.status !== 'undefined';
                  if (hasStatus) {
                    const updated = updateTaskStatus(
                      nextPlan,
                      taskId,
                      normalizeTaskStatus(item.status),
                      typeof item.notes === 'string' ? item.notes : undefined
                    );
                    if (updated !== nextPlan) {
                      nextPlan = updated;
                      changed = true;
                    }
                  }

                  if (typeof item.targetNodeId === 'string' && item.targetNodeId.trim()) {
                    const updated = updateTaskTargetNodeId(nextPlan, taskId, item.targetNodeId.trim());
                    if (updated !== nextPlan) {
                      nextPlan = updated;
                      changed = true;
                    }
                  }
                };

                const updates = Array.isArray(payload.updates)
                  ? payload.updates
                  : typeof payload.taskId === 'string'
                    ? [payload]
                    : [];
                updates.forEach((item: any) => applyTaskUpdate(item));

                const appendTaskBuckets: any[] = [];
                if (Array.isArray(payload.addTasks)) appendTaskBuckets.push(...payload.addTasks);
                if (Array.isArray(payload.appendTasks)) appendTaskBuckets.push(...payload.appendTasks);

                // Compatibility: treat payload.tasks as mixed updates/additions.
                if (Array.isArray(payload.tasks)) {
                  payload.tasks.forEach((item: any) => {
                    if (!isObject(item) || typeof item.taskId !== 'string' || !item.taskId.trim()) return;
                    const exists = Boolean(findTaskById(nextPlan, item.taskId.trim()));
                    if (exists) {
                      applyTaskUpdate(item);
                    } else {
                      appendTaskBuckets.push(item);
                    }
                  });
                }

                if (appendTaskBuckets.length > 0) {
                    const updated = appendPlanTasks(nextPlan, appendTaskBuckets);
                    if (updated !== nextPlan) {
                      nextPlan = updated;
                      changed = true;
                    }
                }

                if (!changed) {
                    const invalidMsg = `[System]: update_plan ignored: no valid updates.`;
                    accumulatedLog += '\n\n' + invalidMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: invalidMsg });
                } else {
                    runtimePlan = nextPlan;
                    const summary = summarizePlan(runtimePlan);
                    const okMsg = `[System]: Plan updated.`;
                    accumulatedLog += '\n\n' + okMsg + '\n' + summary;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: `System: Plan updated.\n${summary}` });
                }
                continue;
            }

            if (action.type === 'execute_task' || action.type === 'run_task') {
                if (!runtimePlan) {
                    const missingMsg = `[System]: execute_task failed: no active plan. Use set_plan first.`;
                    accumulatedLog += '\n\n' + missingMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: missingMsg });
                    continue;
                }

                const payload = action.payload;
                const forceRun = payload?.force === true;
                const explicitTaskId =
                  typeof payload?.taskId === 'string' && payload.taskId
                    ? payload.taskId
                    : actionTaskId;
                const chosenTask = explicitTaskId
                  ? runtimePlan.tasks.find((task) => task.taskId === explicitTaskId) || null
                  : getNextExecutableTask(runtimePlan);

                if (!chosenTask) {
                    const noneMsg = `[System]: execute_task skipped: no matching executable task.`;
                    accumulatedLog += '\n\n' + noneMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: noneMsg });
                    continue;
                }

                const depNotDone = chosenTask.dependsOn.find((depId) => {
                    const dep = findTaskById(runtimePlan!, depId);
                    return !dep || dep.status !== 'done';
                });
                if (depNotDone) {
                    const depMsg = `[System]: execute_task blocked: dependency '${depNotDone}' not done for '${chosenTask.taskId}'.`;
                    accumulatedLog += '\n\n' + depMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: depMsg });
                    runtimePlan = updateTaskStatus(runtimePlan, chosenTask.taskId, 'blocked', depMsg);
                    continue;
                }

                if (!forceRun && chosenTask.status === 'done' && chosenTask.targetNodeId) {
                    const skipMsg = `[System]: execute_task skipped: '${chosenTask.taskId}' already done (target=${chosenTask.targetNodeId}). Use payload.force=true to rerun.`;
                    accumulatedLog += '\n\n' + skipMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: skipMsg });
                    continue;
                }

                runtimePlan = updateTaskStatus(runtimePlan, chosenTask.taskId, 'in_progress');
                try {
                    const result = await executePlannedTask(chosenTask, payload);
                    accumulatedLog += '\n\n' + result.message;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: result.message });

                    if (result.ok) {
                        runtimePlan = updateTaskStatus(runtimePlan, chosenTask.taskId, 'done');
                        if (result.nodeId) {
                            runtimePlan = updateTaskTargetNodeId(runtimePlan, chosenTask.taskId, result.nodeId);
                        }
                    } else {
                        runtimePlan = updateTaskStatus(runtimePlan, chosenTask.taskId, 'failed', result.message);
                    }
                } catch (e) {
                    const errMsg = `[System]: execute_task ${chosenTask.taskId} failed: ${e}`;
                    accumulatedLog += '\n\n' + errMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: errMsg });
                    runtimePlan = updateTaskStatus(runtimePlan, chosenTask.taskId, 'failed', String(e));
                }
                continue;
            }

            // 3. Execute Action
            if (action.type === 'finish') {
                if (runtimePlan) {
                    const unfinished = getUnfinishedTasks(runtimePlan);
                    if (unfinished.length > 0) {
                        const pending = unfinished
                          .slice(0, 6)
                          .map((task) => `${task.taskId}:${task.status}`)
                          .join(', ');
                        const blockedMsg = `[System]: finish blocked. Unfinished tasks=${unfinished.length} (${pending}).`;
                        accumulatedLog += '\n\n' + blockedMsg;
                        setResponse(accumulatedLog);
                        messages.push({ role: "user", content: blockedMsg });
                        continue;
                    }
                }
                accumulatedLog += '\n\n' + `[System]: Task Completed.`;
                setResponse(accumulatedLog);
                break;
            }

            if (action.type === 'read_specs') {
                const payload = action.payload;
                const ids = normalizeSpecIdsFromPayload(payload);
                if (ids.length === 0) {
                    console.warn("Invalid payload for read_specs", payload);
                }

                const { specsInfo, uniqueIds, idsToLoad } = buildSpecsInfo(ids, readSpecsCacheRef.current, true);
                const promptHintText = String(currentTurnText || '');
                const sysMsg = buildSpecsSystemMessage(
                  promptHintText,
                  uniqueIds,
                  idsToLoad.length === 0 && uniqueIds.length > 0
                );
                accumulatedLog += '\n\n' + sysMsg;
                setResponse(accumulatedLog);
                
                // Add specs to messages for next turn
                // Crucial: Append the tool output as a User message (or Tool message if supported)
                // Here we use User role to simulate system feedback
                messages.push({ role: "user", content: `Here are the specs you requested:\n\n${specsInfo}` });
                if (runtimePlan && actionTaskId) {
                    runtimePlan = updateTaskStatus(
                      runtimePlan,
                      actionTaskId,
                      uniqueIds.length > 0 ? 'done' : 'failed',
                      uniqueIds.length > 0 ? undefined : 'read_specs returned empty ids'
                    );
                }
            }

            else if (
              action.type === 'discover_component_props' ||
              action.type === 'inspect_component_props' ||
              action.type === 'crawl_component_props'
            ) {
                const payload = isObject(action.payload) ? action.payload : {};
                try {
                    const inspectResult = await inspectFigmaComponentProps(payload);
                    const summary = inspectResult?.summary || {};
                    const success = Number(summary.success || 0);
                    const failed = Number(summary.failed || 0);
                    const processed = Number(inspectResult?.processed || 0);
                    const requested = Number(inspectResult?.requested || 0);
                    const truncated = Boolean(inspectResult?.truncated);

                    const sysMsg = `[System]: discover_component_props done. success=${success}, failed=${failed}, processed=${processed}/${requested}${truncated ? ' (truncated)' : ''}.`;
                    accumulatedLog += '\n\n' + sysMsg;
                    setResponse(accumulatedLog);

                    const rawResults = Array.isArray(inspectResult?.results) ? inspectResult.results : [];
                    const maxComponentsForModel = 30;
                    const compactForModel = rawResults
                      .slice(0, maxComponentsForModel)
                      .map((item: any) => ({
                        status: item.status,
                        token: item.token,
                        componentKey: item.componentKey,
                        nodeType: item.nodeType,
                        componentName: item.componentName,
                        componentSetName: item.componentSetName,
                        properties: Array.isArray(item.properties)
                          ? item.properties.map((prop: any) => ({
                              propertyName: prop.propertyName,
                              type: prop.type,
                              defaultValue: prop.defaultValue,
                              variantOptions: Array.isArray(prop.variantOptions) ? prop.variantOptions.slice(0, 12) : undefined,
                              preferredValuesCount: Array.isArray(prop.preferredValues) ? prop.preferredValues.length : 0
                            }))
                          : [],
                        error: item.error
                      }));

                    const modelPayload = {
                      requested,
                      processed,
                      truncated,
                      summary: {
                        success,
                        failed
                      },
                      clippedForModel: rawResults.length > maxComponentsForModel,
                      components: compactForModel
                    };

                    messages.push({
                      role: "user",
                      content: `Discovered figma component properties:\n\n${JSON.stringify(modelPayload, null, 2)}`
                    });

                    if (runtimePlan && actionTaskId) {
                        runtimePlan = updateTaskStatus(
                          runtimePlan,
                          actionTaskId,
                          success > 0 ? 'done' : 'failed',
                          success > 0 ? undefined : 'no component properties discovered'
                        );
                    }
                } catch (e) {
                    const errorMsg = `[System]: discover_component_props failed: ${e}`;
                    accumulatedLog += '\n\n' + errorMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: errorMsg });
                    if (runtimePlan && actionTaskId) {
                        runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'failed', String(e));
                    }
                }
            }

            else if (
              action.type === 'inspect_component_structure' ||
              action.type === 'discover_component_structure'
            ) {
                const payload = isObject(action.payload) ? action.payload : {};
                try {
                    const inspectResult = await inspectFigmaComponentStructure(payload);
                    const summary = inspectResult?.summary || {};
                    const success = Number(summary.success || 0);
                    const failed = Number(summary.failed || 0);
                    const sysMsg = `[System]: inspect_component_structure done. success=${success}, failed=${failed}.`;
                    accumulatedLog += '\n\n' + sysMsg;
                    setResponse(accumulatedLog);

                    messages.push({
                      role: "user",
                      content: `Inspected figma component structure:\n\n${buildComponentInspectJson(inspectResult)}`
                    });

                    if (runtimePlan && actionTaskId) {
                        runtimePlan = updateTaskStatus(
                          runtimePlan,
                          actionTaskId,
                          success > 0 ? 'done' : 'failed',
                          success > 0 ? undefined : 'no component structure inspected'
                        );
                    }
                } catch (e) {
                    const errorMsg = `[System]: inspect_component_structure failed: ${e}`;
                    accumulatedLog += '\n\n' + errorMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: errorMsg });
                    if (runtimePlan && actionTaskId) {
                        runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'failed', String(e));
                    }
                }
            }
            
            else if (action.type === 'apply_scene' || action.type === 'apply_envelope') {
                const payload = action.payload;
                const rawEnvelope = payload?.envelope ?? payload;
                const isCreateIntent = String(rawEnvelope?.intent || '').toLowerCase() === 'create';
                const explicitParentId =
                  typeof payload?.parentId === 'string' ? payload.parentId : undefined;
                const resolvedParentId = isCreateIntent
                  ? resolveDefaultParentForAction(runtimePlan, actionTaskId, explicitParentId)
                  : explicitParentId;
                const tablePayloadFromScene = extractTablePayloadFromSceneRoot(rawEnvelope?.scene?.root);
                const tablePayloadForDirectDraw =
                  isCreateIntent && tablePayloadFromScene
                    ? tablePayloadFromScene
                    : (isCreateIntent && isObject(rawEnvelope?.schema) ? rawEnvelope : null);

                if (tablePayloadForDirectDraw) {
                    const tableComponent = buildTableComponentFromPayload(tablePayloadForDirectDraw);
                    if (tableComponent) {
                        try {
                            const rootNodeId = await createComponentNode(tableComponent, resolvedParentId);
                            const rerouteMsg = `[System]: apply_scene(table) rerouted to draw_table one-shot.`;
                            const successMsg = `[System]: draw_table success (ID: ${rootNodeId}, cols=${tableComponent.params.columnCount}, rows=${tableComponent.params.rowCount}).`;
                            accumulatedLog += '\n\n' + rerouteMsg + '\n' + successMsg;
                            setResponse(accumulatedLog);
                            messages.push({
                                role: "user",
                                content: `System: draw_table succeeded via apply_scene reroute. rootNodeId=${rootNodeId}`
                            });
                            if (runtimePlan && actionTaskId) {
                                runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'done');
                            }
                            continue;
                        } catch (e) {
                            const errorMsg = `[System]: draw_table reroute failed: ${e}`;
                            accumulatedLog += '\n\n' + errorMsg;
                            setResponse(accumulatedLog);
                            messages.push({ role: "user", content: errorMsg });
                            if (runtimePlan && actionTaskId) {
                                runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'failed', String(e));
                            }
                            continue;
                        }
                    }
                }

                const envelope = normalizeSceneEnvelopeForSend(rawEnvelope);
                const mode = payload?.mode === 'best_effort' ? 'best_effort' : 'strict';
                const patchChartNode = (node: any): any => {
                  if (!chartTokenOverride || !isObject(node)) return node;
                  const next: any = { ...node };
                  if (next.componentId === 'figma-component') {
                    const props = isObject(next.props) ? { ...next.props } : {};
                    props.componentToken = chartTokenOverride;
                    props.componentKey = '';
                    props.fallbackName = '';
                    next.props = props;
                  }
                  if (Array.isArray(next.children)) {
                    next.children = next.children.map((child: any) => patchChartNode(child));
                  }
                  if (isObject(next.slots)) {
                    const slots: any = {};
                    Object.entries(next.slots).forEach(([slotKey, slotNodes]) => {
                      slots[slotKey] = Array.isArray(slotNodes)
                        ? slotNodes.map((child: any) => patchChartNode(child))
                        : slotNodes;
                    });
                    next.slots = slots;
                  }
                  return next;
                };
                const patchedEnvelope = (() => {
                  if (!chartTokenOverride || !envelope || typeof envelope !== 'object') return envelope;
                  const scene = isObject((envelope as any).scene) ? (envelope as any).scene : null;
                  const root = scene && isObject(scene.root) ? scene.root : null;
                  if (!root) return envelope;
                  return { ...(envelope as any), scene: { ...scene, root: patchChartNode(root) } };
                })();

                if (!envelope || typeof envelope !== 'object') {
                    const invalidMsg = `[System]: Invalid apply_scene payload.`;
                    accumulatedLog += '\n\n' + invalidMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: invalidMsg });
                    if (runtimePlan && actionTaskId) {
                        runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'failed', 'invalid apply_scene payload');
                    }
                } else {
                    try {
                        const result = await applySceneEnvelope(patchedEnvelope, mode, resolvedParentId);
                        if (result?.ok) {
                            const summary = `[System]: Applied scene successfully (intent=${result.intent}, root=${result.rootNodeId || 'N/A'}, ops=${result.appliedOperations ?? 0}).`;
                            accumulatedLog += '\n\n' + summary;
                            setResponse(accumulatedLog);
                            messages.push({
                                role: "user",
                                content: `System: apply_scene succeeded. Result: ${JSON.stringify(result)}`
                            });
                            if (runtimePlan && actionTaskId) {
                                runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'done');
                            }
                        } else {
                            const failed = `[System]: apply_scene failed: ${JSON.stringify(result?.errors || [])}`;
                            accumulatedLog += '\n\n' + failed;
                            setResponse(accumulatedLog);
                            messages.push({ role: "user", content: failed });
                            if (runtimePlan && actionTaskId) {
                                runtimePlan = updateTaskStatus(
                                  runtimePlan,
                                  actionTaskId,
                                  'failed',
                                  JSON.stringify(result?.errors || [])
                                );
                            }
                        }
                    } catch (e) {
                        const errorMsg = `[System]: Error applying scene: ${e}`;
                        accumulatedLog += '\n\n' + errorMsg;
                        setResponse(accumulatedLog);
                        messages.push({ role: "user", content: errorMsg });
                        if (runtimePlan && actionTaskId) {
                            runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'failed', String(e));
                        }
                    }
                }
            }

            else if (action.type === 'draw_table' || action.type === 'draw_tabl') {
                const payload = action.payload;
                const parentId = resolveDefaultParentForAction(
                  runtimePlan,
                  actionTaskId,
                  typeof payload?.parentId === 'string' ? payload.parentId : undefined
                );
                const tableComponent = buildTableComponentFromPayload(payload?.table ?? payload, { minRowCount: 10 });

                if (!tableComponent) {
                    const invalidMsg = `[System]: Invalid draw_table payload. Required: { headers: string[], rows: (string[]|object[])[], columnTypes?: string[], columnWidths?: number[], rowHeight?: { header?: number, body?: number } }.`;
                    accumulatedLog += '\n\n' + invalidMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: invalidMsg });
                    if (runtimePlan && actionTaskId) {
                        runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'failed', 'invalid draw_table payload');
                    }
                } else {
                    try {
                        const rootNodeId = await createComponentNode(tableComponent, parentId);
                        const successMsg = `[System]: draw_table success (ID: ${rootNodeId}, cols=${tableComponent.params.columnCount}, rows=${tableComponent.params.rowCount}).`;
                        accumulatedLog += '\n\n' + successMsg;
                        setResponse(accumulatedLog);
                        messages.push({
                            role: "user",
                            content: `System: draw_table succeeded. rootNodeId=${rootNodeId}`
                        });
                        if (runtimePlan && actionTaskId) {
                            runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'done');
                        }
                    } catch (e) {
                        const errorMsg = `[System]: draw_table failed: ${e}`;
                        accumulatedLog += '\n\n' + errorMsg;
                        setResponse(accumulatedLog);
                        messages.push({ role: "user", content: errorMsg });
                        if (runtimePlan && actionTaskId) {
                            runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'failed', String(e));
                        }
                    }
                }
            }

            else if (action.type === 'draw_form') {
                const payload = action.payload;
                const parentId = resolveDefaultParentForAction(
                  runtimePlan,
                  actionTaskId,
                  typeof payload?.parentId === 'string' ? payload.parentId : undefined
                );
                const formComponent = buildFormComponentFromPayload(payload?.form ?? payload);

                if (!formComponent) {
                    const invalidMsg = `[System]: Invalid draw_form payload. Required: { rows?: any[][], fields?: any[], layout?: string, footer?: { actions?: any[] } }.`;
                    accumulatedLog += '\n\n' + invalidMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: invalidMsg });
                    if (runtimePlan && actionTaskId) {
                        runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'failed', 'invalid draw_form payload');
                    }
                } else {
                    try {
                        const rootNodeId = await createComponentNode(formComponent, parentId);
                        const rowCount = Array.isArray(formComponent.children) ? formComponent.children.length : 0;
                        const successMsg = `[System]: draw_form success (ID: ${rootNodeId}, rows=${rowCount}, layout=${formComponent.params.layout}).`;
                        accumulatedLog += '\n\n' + successMsg;
                        setResponse(accumulatedLog);
                        messages.push({
                            role: "user",
                            content: `System: draw_form succeeded. rootNodeId=${rootNodeId}`
                        });
                        if (runtimePlan && actionTaskId) {
                            runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'done');
                        }
                    } catch (e) {
                        const errorMsg = `[System]: draw_form failed: ${e}`;
                        accumulatedLog += '\n\n' + errorMsg;
                        setResponse(accumulatedLog);
                        messages.push({ role: "user", content: errorMsg });
                        if (runtimePlan && actionTaskId) {
                            runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'failed', String(e));
                        }
                    }
                }
            }

            else if (action.type === 'create_node') {
                const { componentId, params, children, parentId } = action.payload;
                const resolvedParentId = resolveDefaultParentForAction(
                  runtimePlan,
                  actionTaskId,
                  typeof parentId === 'string' ? parentId : undefined,
                  typeof componentId === 'string' ? componentId : undefined
                );

                if (componentId === 'table' && Array.isArray(children) && children.length > 0) {
                    const tablePayloadFromTree = extractTablePayloadFromSceneRoot({
                        componentId,
                        params,
                        children
                    });
                    const tableComponent = buildTableComponentFromPayload(tablePayloadFromTree);
                    if (tableComponent) {
                        try {
                            const rootNodeId = await createComponentNode(tableComponent, resolvedParentId);
                            const rerouteMsg = `[System]: create_node(table subtree) rerouted to draw_table one-shot.`;
                            const successMsg = `[System]: draw_table success (ID: ${rootNodeId}, cols=${tableComponent.params.columnCount}, rows=${tableComponent.params.rowCount}).`;
                            accumulatedLog += '\n\n' + rerouteMsg + '\n' + successMsg;
                            setResponse(accumulatedLog);
                            messages.push({
                                role: "user",
                                content: `System: draw_table succeeded via create_node reroute. rootNodeId=${rootNodeId}`
                            });
                            if (runtimePlan && actionTaskId) {
                                runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'done');
                            }
                            continue;
                        } catch (e) {
                            const errorMsg = `[System]: draw_table reroute failed: ${e}`;
                            accumulatedLog += '\n\n' + errorMsg;
                            setResponse(accumulatedLog);
                            messages.push({ role: "user", content: errorMsg });
                            if (runtimePlan && actionTaskId) {
                                runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'failed', String(e));
                            }
                            continue;
                        }
                    }
                }

                try {
                    const nextParams =
                      chartTokenOverride && componentId === 'figma-component' && isObject(params)
                        ? { ...params, componentToken: chartTokenOverride, componentKey: '', fallbackName: '' }
                        : params;
                    const rootNodeId = await createComponentNode(
                      { componentId, params: nextParams, children },
                      resolvedParentId
                    );

                    accumulatedLog += '\n\n' + `[System]: Created ${componentId} (ID: ${rootNodeId})`;
                    setResponse(accumulatedLog);

                    // Add result to history for next turn
                    messages.push({ 
                        role: "user", 
                        content: `System: Successfully created component '${componentId}' with ID '${rootNodeId}'.` 
                    });
                    if (runtimePlan && actionTaskId) {
                        runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'done');
                    }

                } catch (e) {
                    const errorMsg = `[System]: Error creating ${componentId}: ${e}`;
                    accumulatedLog += '\n\n' + errorMsg;
                    setResponse(accumulatedLog);
                    messages.push({ role: "user", content: errorMsg });
                    if (runtimePlan && actionTaskId) {
                        runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'failed', String(e));
                    }
                }
            }
            else {
                const unknownMsg = `[System]: Unknown action type '${String(action.type)}'.`;
                accumulatedLog += '\n\n' + unknownMsg;
                setResponse(accumulatedLog);
                messages.push({ role: "user", content: unknownMsg });
                if (runtimePlan && actionTaskId) {
                    runtimePlan = updateTaskStatus(runtimePlan, actionTaskId, 'failed', unknownMsg);
                }
            }

            const continueActions = new Set([
              'read_specs',
              'discover_component_props',
              'inspect_component_props',
              'crawl_component_props',
              'inspect_component_structure',
              'discover_component_structure'
            ]);
            if (!runtimePlan && !isPlanControlAction && !continueActions.has(action.type)) {
              break;
            }
        }
        
        // Save chat history for next interaction (filtering out system prompts to save tokens/context)
        setChatHistory(messages.filter(m => m.role !== 'system' || m.content !== generateMasterPrompt()));

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setResponse((prev) => (prev ? `${prev}\n\n[System]: 已停止。` : `[System]: 已停止。`));
      } else {
        console.error('Agent Loop Error:', error);
        setResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setAgentPlan(runtimePlan);
      setLoading(false);
      setGenerationLock(false);
      llmAbortRef.current = null;
      stopRequestedRef.current = false;
      if (thinkingActive && thinkingSeconds === null && thinkingStartedAtRef.current !== null) {
        const ms = Date.now() - thinkingStartedAtRef.current;
        const secs = Math.max(1, Math.ceil(ms / 1000));
        setThinkingSeconds(secs);
      }
      setThinkingActive(false);
    }
  };

  const isFormComponent = (componentId: string) => ['form', 'form-row', 'form-field'].includes(componentId);
  const isTableCellComponent = (componentId: string) =>
    componentId === 'table-header-cell' || componentId.startsWith('table-cell');
  const isChartSelection = (() => {
    if (!selectedComponent) return false;
    if (selectedComponent.componentId.startsWith('chart-')) return true;
    const def = COMPONENT_DEFS[selectedComponent.componentId];
    return def?.category === 'Data' && selectedComponent.componentId.includes('chart');
  })();
  const chartTypeShortcuts = [
    { label: '折线图', prompt: '生成一个折线图' },
    { label: '饼图', prompt: '生成一个饼图' },
    { label: '环形图', prompt: '生成一个环形图' },
    { label: '柱状图', prompt: '生成一个柱状图' },
    { label: '条形图', prompt: '生成一个条形图' },
    { label: '面积图', prompt: '生成一个面积图' }
  ];
  const buildQuickComponentName = (displayName: string, token: string) => {
    const baseName = String(displayName || '').trim();
    const tokenLabel = token
      .replace(/^lib-/, '')
      .split('-')
      .slice(-2)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    const zhParts = baseName.match(/[\u4e00-\u9fa5]+/g) || [];
    const enParts = baseName.match(/[A-Za-z][A-Za-z0-9\s-]*/g) || [];
    const zh = zhParts.join('') || baseName || token;
    const en = enParts.join(' ') || tokenLabel || baseName || token;
    return { name: `${en} ${zh}`.trim(), zh, en };
  };
  const quickComponentGroups = React.useMemo(() => {
    const grouped: Record<string, Array<{ token: string; name: string; zh: string; en: string }>> = {};
    Object.values(BASE_COMPONENT_TOKEN_PACK).forEach((profile) => {
      const token = String(profile?.token || '').trim();
      if (!token) return;
      let category = String(profile?.category || '其他').trim() || '其他';
      if (category === '布局') return;
      if (category === '未分类' || category === '其他') return;
      if (category === 'AI/火山引擎智能化') category = '智能化';
      const { name, zh, en } = buildQuickComponentName(String(profile?.displayName || ''), token);
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push({ token, name, zh, en });
    });
    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map((category) => ({
        category,
        items: grouped[category].sort((a, b) => a.name.localeCompare(b.name))
      }));
  }, []);
  const quickComponentActiveGroup = React.useMemo(
    () => quickComponentGroups.find((group) => group.category === quickComponentActiveCategory),
    [quickComponentGroups, quickComponentActiveCategory]
  );
  const chartShortcutIcons: Record<string, JSX.Element> = {
    折线图: (
      <svg width="12" height="11" viewBox="0 0 12 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0.875 0C1.03608 0 1.16667 0.130584 1.16667 0.291667V9.33333H11.375C11.5361 9.33333 11.6667 9.46392 11.6667 9.625V10.2083C11.6667 10.3694 11.5361 10.5 11.375 10.5H0.291667C0.130584 10.5 0 10.3694 0 10.2083V0.291667C0 0.130584 0.130584 0 0.291667 0H0.875ZM10.9453 1.95624L11.3578 2.36872C11.4717 2.48262 11.4717 2.66729 11.3578 2.7812L8.058 6.08103C7.94409 6.19493 7.75942 6.19493 7.64552 6.08103L7.23304 5.66855L7.2313 5.6667L5.58338 4.01878L2.48953 7.11223C2.37563 7.22613 2.19095 7.22613 2.07705 7.11223L1.66457 6.69975C1.55067 6.58584 1.55067 6.40117 1.66457 6.28727L4.96221 2.98966C4.96293 2.98892 4.96367 2.98817 4.9644 2.98744L5.19838 2.75382L5.37688 2.57496C5.42069 2.53115 5.47497 2.50419 5.53166 2.49408L5.56591 2.49004H5.60034C5.66915 2.49408 5.73679 2.52239 5.78936 2.57496L6.20184 2.98744L6.2023 2.98774L7.85196 4.6374L10.5329 1.95624C10.6468 1.84234 10.8314 1.84234 10.9453 1.95624Z"
          fill="currentColor"
        />
      </svg>
    ),
    面积图: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12.7708 7.18116V4.74828L10.0082 6.58999C9.7011 6.79479 9.29982 6.79019 8.99742 6.57854L6.30681 4.69512L3.68281 6.53195V8.64574L5.9765 7.04017C6.17482 6.90129 6.43883 6.90129 6.6371 7.04017L9.53508 9.06871L12.7708 7.18116ZM13.9228 7.5011V4.26994C13.9228 3.55431 13.1252 3.12747 12.5298 3.52443L9.51473 5.53447L6.82065 3.6486C6.51211 3.43264 6.1015 3.43264 5.79299 3.6486L2.7765 5.76014C2.62252 5.86793 2.53081 6.04406 2.53081 6.23202V9.74494C2.53075 9.74999 2.53075 9.75505 2.53081 9.76011V11.992C2.53081 13.0171 3.36177 13.848 4.38681 13.848H12.0668C13.0918 13.848 13.9228 13.0171 13.9228 11.992V7.5219C13.9229 7.51499 13.9229 7.50801 13.9228 7.5011ZM12.7708 8.51486L9.79704 10.2496C9.60292 10.3628 9.36062 10.3528 9.17649 10.2239L6.30681 8.21515L3.68281 10.0519V11.992C3.68281 12.3808 3.998 12.696 4.38681 12.696H12.0668C12.4556 12.696 12.7708 12.3808 12.7708 11.992V8.51486Z"
          fill="currentColor"
        />
      </svg>
    ),
    柱状图: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M5.30843 2.91668C5.30843 2.30456 5.80465 1.80835 6.41676 1.80835H7.58343C8.19552 1.80835 8.69176 2.30456 8.69176 2.91668V11.0834C8.69176 11.6955 8.19552 12.1917 7.58343 12.1917H6.41676C5.80465 12.1917 5.30843 11.6955 5.30843 11.0834V2.91668ZM6.41676 2.85835C6.38456 2.85835 6.35843 2.88447 6.35843 2.91668V11.0834C6.35843 11.1156 6.38456 11.1417 6.41676 11.1417H7.58343C7.61563 11.1417 7.64176 11.1156 7.64176 11.0834V2.91668C7.64176 2.88447 7.61563 2.85835 7.58343 2.85835H6.41676ZM1.2251 5.83335C1.2251 5.22123 1.72132 4.72502 2.33343 4.72502H3.5001C4.11221 4.72502 4.60843 5.22123 4.60843 5.83335V11.0834C4.60843 11.6955 4.11221 12.1917 3.5001 12.1917H2.33343C1.72132 12.1917 1.2251 11.6955 1.2251 11.0834V5.83335ZM2.33343 5.77502C2.30121 5.77502 2.2751 5.80113 2.2751 5.83335V11.0834C2.2751 11.1156 2.30121 11.1417 2.33343 11.1417H3.5001C3.53232 11.1417 3.55843 11.1156 3.55843 11.0834V5.83335C3.55843 5.80113 3.53232 5.77502 3.5001 5.77502H2.33343ZM10.5001 5.89169C9.88801 5.89169 9.39176 6.38788 9.39176 7.00003V11.0834C9.39176 11.6955 9.88801 12.1917 10.5001 12.1917H11.6668C12.2789 12.1917 12.7751 11.6955 12.7751 11.0834V7.00003C12.7751 6.38788 12.2789 5.89169 11.6668 5.89169H10.5001ZM10.4418 7.00003C10.4418 6.96777 10.4679 6.94169 10.5001 6.94169H11.6668C11.699 6.94169 11.7251 6.96777 11.7251 7.00003V11.0834C11.7251 11.1156 11.699 11.1417 11.6668 11.1417H10.5001C10.4679 11.1417 10.4418 11.1156 10.4418 11.0834V7.00003Z"
          fill="currentColor"
        />
      </svg>
    ),
    条形图: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.68276 3.35176C3.68276 3.03364 3.42488 2.77576 3.10676 2.77576C2.78864 2.77576 2.53076 3.03364 2.53076 3.35176V12.3118C2.53076 12.9833 3.07518 13.5278 3.74676 13.5278H13.3468C13.6648 13.5278 13.9228 13.2699 13.9228 12.9518C13.9228 12.6336 13.6648 12.3758 13.3468 12.3758H3.74676C3.71141 12.3758 3.68276 12.3471 3.68276 12.3118V3.35176ZM11.1066 8.40836C11.4248 8.40836 11.6826 8.1505 11.6826 7.83236C11.6826 7.51428 11.4248 7.25636 11.1066 7.25636H5.98663C5.66852 7.25636 5.41064 7.51428 5.41064 7.83236C5.41064 8.1505 5.66852 8.40836 5.98663 8.40836H11.1066ZM13.6026 4.95176C13.6026 5.26987 13.3447 5.52776 13.0266 5.52776H5.98663C5.66852 5.52776 5.41064 5.26987 5.41064 4.95176C5.41064 4.63364 5.66852 4.37576 5.98663 4.37576H13.0266C13.3447 4.37576 13.6026 4.63364 13.6026 4.95176ZM8.54664 11.2878C8.86478 11.2878 9.12264 11.0299 9.12264 10.7118C9.12264 10.3936 8.86478 10.1358 8.54664 10.1358H5.98663C5.66852 10.1358 5.41063 10.3936 5.41063 10.7118C5.41063 11.0299 5.66852 11.2878 5.98663 11.2878H8.54664Z"
          fill="currentColor"
        />
      </svg>
    ),
    饼图: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_240_50760)">
          <path
            d="M5.83398 2.48047C3.82111 2.99845 2.33301 4.82544 2.33301 7C2.33301 9.57733 4.42267 11.667 7 11.667C9.17456 11.667 11.0016 10.1789 11.5195 8.16602L12.7168 8.16699C12.1762 10.8295 9.82202 12.833 7 12.833C3.77834 12.833 1.16699 10.2217 1.16699 7C1.16699 4.17798 3.17054 1.82379 5.83301 1.2832L5.83398 2.48047ZM7 0.583008C10.5438 0.583008 13.417 3.45617 13.417 7H7.29199C7.13091 7 7 6.86909 7 6.70801V0.583008ZM8.16699 5.83301H12.1201C11.6747 3.87045 10.1296 2.32532 8.16699 1.87988V5.83301Z"
            fill="currentColor"
          />
        </g>
        <defs>
          <clipPath id="clip0_240_50760">
            <rect width="14" height="14" fill="white" />
          </clipPath>
        </defs>
      </svg>
    ),
    环形图: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.22712 2.96805C5.36407 2.96805 3.04311 5.289 3.04311 8.15207C3.04311 11.0151 5.36407 13.3361 8.22712 13.3361C11.0902 13.3361 13.4111 11.0151 13.4111 8.15207C13.4111 7.83393 13.669 7.57607 13.9871 7.57607C14.3052 7.57607 14.5631 7.83393 14.5631 8.15207C14.5631 11.6513 11.7264 14.4881 8.22712 14.4881C4.72784 14.4881 1.89111 11.6513 1.89111 8.15207C1.89111 4.65277 4.72784 1.81604 8.22712 1.81604C8.5452 1.81604 8.80312 2.07393 8.80312 2.39205C8.80312 2.71016 8.5452 2.96805 8.22712 2.96805ZM9.95185 2.62452C10.0765 2.33183 10.4148 2.19559 10.7074 2.32021C12.2876 2.99301 13.5379 4.28847 14.1508 5.89958C14.264 6.1969 14.1147 6.52961 13.8173 6.64276C13.52 6.75585 13.1872 6.60654 13.0742 6.30922C12.5729 4.99177 11.5489 3.93058 10.2562 3.38013C9.96344 3.2555 9.82725 2.9172 9.95185 2.62452ZM6.56312 8.15207C6.56312 7.23303 7.30808 6.48807 8.22712 6.48807C9.14609 6.48807 9.89112 7.23303 9.89112 8.15207C9.89112 9.07105 9.14609 9.81607 8.22712 9.81607C7.30808 9.81607 6.56312 9.07105 6.56312 8.15207ZM8.22712 5.33604C6.67186 5.33604 5.41111 6.59681 5.41111 8.15207C5.41111 9.70727 6.67186 10.9681 8.22712 10.9681C9.78232 10.9681 11.0431 9.70727 11.0431 8.15207C11.0431 6.59681 9.78232 5.33604 8.22712 5.33604Z"
          fill="currentColor"
        />
      </svg>
    )
  };

  const normalizeFormOption = (value: unknown) => String(value || '').trim().toLowerCase();

  const normalizeFormControlType = (value: unknown) => {
    const normalized = normalizeFormOption(value);
    if (!normalized) return 'input';
    if (normalized.includes('checkbox') || normalized.includes('多选')) return 'checkbox-group';
    if (normalized.includes('radio') || normalized.includes('单选')) return 'radio-group';
    if (normalized.includes('datepicker') || normalized.includes('日期')) return 'datepicker';
    if (normalized.includes('inputnumber') || normalized.includes('数字')) return 'inputnumber';
    if (normalized.includes('slider') || normalized.includes('滑动')) return 'slider';
    if (normalized.includes('switch') || normalized.includes('开关')) return 'switch';
    if (normalized.includes('textarea') || normalized.includes('多行')) return 'textarea';
    if (normalized.includes('timepicker') || normalized.includes('时间')) return 'timepicker';
    if (normalized.includes('select') || normalized.includes('选择')) return 'select';
    if (normalized.includes('upload') || normalized.includes('上传')) return 'upload';
    if (normalized.includes('button') || normalized.includes('按钮')) return 'button';
    if (normalized.includes('figma')) return 'figma-component';
    if (normalized.includes('text') || normalized.includes('文本')) return 'text';
    return 'input';
  };

  const shouldDisplayFormFieldParam = (key: string, params: Record<string, any>) => {
    const controlType = normalizeFormControlType(params.controlType);
    const showPrefix = !!params.showPrefix;
    const showSuffix = !!params.showSuffix;
    if (key === 'labelAlign' || key === 'labelWidthPreset' || key === 'labelWidth' || key === 'controlWidth') {
      return false;
    }
    if (key === 'size' || key === 'state') {
      return controlType === 'input' || controlType === 'select';
    }
    if (key === 'multiple' || key === 'selectType') {
      return controlType === 'select';
    }
    if (key === 'language') {
      return controlType === 'radio-group';
    }
    if (key === 'checkedValues') {
      return controlType === 'checkbox-group';
    }
    if (key === 'optionsText') {
      return controlType === 'select' || controlType === 'checkbox-group' || controlType === 'radio-group';
    }
    if (key === 'showPrefix' || key === 'showSuffix') {
      return controlType === 'input';
    }
    if (key === 'prefixText') {
      return controlType === 'input' && showPrefix;
    }
    if (key === 'suffixText') {
      return controlType === 'input' && showSuffix;
    }
    if (key === 'componentToken' || key === 'componentKey' || key === 'variantCriteria') {
      return controlType === 'figma-component';
    }
    if (key === 'text') {
      return controlType === 'text';
    }
    if (key === 'buttonLabel' || key === 'buttonVariant') {
      return controlType === 'button';
    }
    return true;
  };

  const getFormSelectOptionLabel = (key: string, option: string) => {
    const normalized = normalizeFormOption(option);
    if (key === 'controlType') {
      if (normalized.includes('checkbox') || normalized.includes('多选')) return 'Checkbox 多选';
      if (normalized.includes('radio') || normalized.includes('单选')) return 'Radio 单选';
      if (normalized.includes('datepicker') || normalized.includes('日期')) return 'DatePicker 日期选择';
      if (normalized.includes('inputnumber') || normalized.includes('数字')) return 'Inputnumber 数字输入';
      if (normalized.includes('slider') || normalized.includes('滑动')) return 'Slider 滑动';
      if (normalized.includes('switch') || normalized.includes('开关')) return 'Switch 开关';
      if (normalized.includes('textarea') || normalized.includes('多行')) return 'Textarea 多行文本';
      if (normalized.includes('timepicker') || normalized.includes('时间')) return 'TimePicker 时间选择';
      if (normalized.includes('select') || normalized.includes('选择')) return 'Select 选择框';
      if (normalized.includes('upload') || normalized.includes('上传')) return 'Upload 上传';
      if (normalized.includes('button') || normalized.includes('按钮')) return 'Button 按钮';
      if (normalized.includes('figma')) return 'Figma 组件';
      if (normalized.includes('text') || normalized.includes('文本')) return 'Text 文本';
      return 'Input 输入框';
    }
    if (key === 'layout') {
      if (normalized.includes('vertical') || normalized.includes('纵向')) return '纵向';
      return '横向';
    }
    if (key === 'labelAlign') {
      return normalized.includes('right') || normalized.includes('右') ? '右对齐' : '左对齐';
    }
    if (key === 'align') {
      if (normalized.includes('top') || normalized.includes('顶部')) return '顶部对齐';
      if (normalized.includes('right') || normalized.includes('右')) return '右对齐';
      if (normalized.includes('left') || normalized.includes('左')) return '左对齐';
      if (normalized.includes('center') || normalized.includes('居中')) return '居中';
      if (normalized.includes('end') || normalized.includes('末') || normalized.includes('右')) return '末尾对齐';
      if (normalized.includes('between') || normalized.includes('两端')) return '两端对齐';
      if (normalized.includes('start') || normalized.includes('起始')) return '起始对齐';
      return option;
    }
    if (key === 'labelWidthPreset') {
      if (normalized.includes('fill') || normalized.includes('跟随')) return '跟随输入域';
      if (normalized.includes('default') || normalized.includes('80')) return '默认 80';
      if (normalized.includes('medium') || normalized.includes('120')) return '中等 120';
      if (normalized.includes('large') || normalized.includes('160')) return '大号 160';
      if (normalized.includes('custom') || normalized.includes('自定义')) return '自定义';
      return option;
    }
    if (key === 'size') {
      if (normalized.includes('mini') || normalized.includes('24')) return '迷你 24';
      if (normalized.includes('small') || normalized.includes('28')) return '小 28';
      if (normalized.includes('large') || normalized.includes('36')) return '大 36';
      return '默认 32';
    }
    if (key === 'state') {
      if (normalized.includes('hover') || normalized.includes('悬浮')) return '悬浮';
      if (normalized.includes('active') || normalized.includes('激活')) return '激活';
      if (normalized.includes('error') || normalized.includes('错误')) return '错误';
      if (normalized.includes('disabled') || normalized.includes('禁用')) return '禁用';
      return '默认';
    }
    if (key === 'selectType') {
      if (normalized.includes('label') || normalized.includes('内置')) return '内置标签';
      return '默认';
    }
    if (key === 'language') {
      if (normalized === 'en' || normalized.includes('英文')) return '英文';
      return '中文';
    }
    if (key === 'buttonVariant') {
      if (normalized.includes('primary') || normalized.includes('主要')) return '主要';
      if (normalized.includes('outline') || normalized.includes('描边')) return '描边';
      return '次要';
    }
    return option;
  };

  const normalizeTagTypeValue = (value: unknown) => String(value ?? '').trim().toLowerCase();

  const resolveTagFamily = (params: Record<string, any>): 'default' | 'other' | 'status' => {
    const normalizedKind = normalizeTagTypeValue(params.tagKind ?? '');
    if (normalizedKind) {
      return normalizedKind.includes('status') || normalizedKind.includes('状态') ? 'status' : 'default';
    }
    const normalizedType = normalizeTagTypeValue(params.tagType ?? params.otherTagType ?? params.type ?? '');
    const token = String(params.componentToken ?? '').trim().toLowerCase();
    const isStatusType = normalizedType.includes('status') || normalizedType.includes('状态');
    const isGroupType = normalizedType.includes('taggroup') || normalizedType.includes('标签组') || normalizedType.includes('group');
    const isMarketingType = normalizedType.includes('marketing') || normalizedType.includes('营销');
    const isStatusToken = token.includes('status-tag');
    const isOtherToken = token.includes('other-tag');
    const hasStatusProps = ['statusTheme', 'statusType', 'statusState'].some((key) => {
      const value = params[key];
      return value !== undefined && value !== null && String(value).trim() !== '';
    });

    if (isStatusType || isStatusToken || (!normalizedType && hasStatusProps)) return 'status';
    if (isGroupType || isMarketingType || isOtherToken) return 'other';
    return 'default';
  };

  const resolveOtherTagType = (params: Record<string, any>): 'marketing' | 'group' => {
    const normalizedType = normalizeTagTypeValue(params.tagType ?? params.otherTagType ?? params.type ?? '');
    if (normalizedType.includes('taggroup') || normalizedType.includes('标签组') || normalizedType.includes('group')) {
      return 'group';
    }
    return 'marketing';
  };

  const TAG_PARAM_SETS = {
    default: new Set(['text', 'componentToken', 'tagType', 'size', 'state', 'showIcon', 'showDot', 'showDropdown', 'closable', 'disabled']),
    otherMarketing: new Set(['text', 'componentToken', 'tagType', 'size', 'colorScheme']),
    otherGroup: new Set(['text', 'componentToken', 'tagType', 'size', 'groupTexts']),
    status: new Set(['text', 'componentToken', 'tagType', 'size', 'statusTheme', 'statusType', 'statusState', 'showIcon', 'showDropdown', 'disabled'])
  } as const;

  const TAG_PARAM_KEYS = new Set([
    ...TAG_PARAM_SETS.default,
    ...TAG_PARAM_SETS.otherMarketing,
    ...TAG_PARAM_SETS.otherGroup,
    ...TAG_PARAM_SETS.status
  ]);

  const COLUMN_CONTENT_HIDDEN_KEYS = new Set(['rowCount', 'columnWidthMode', 'textAlign', 'textDisplay', 'headerText']);

  const isParamEditable = (def: ComponentDefinition, key: string, paramDef?: ParamDefinition): boolean => {
    if (!paramDef) return false;
    if (GENERATION_ONLY_PARAM_KEYS.has(key)) return false;
    if (COMPONENT_EDITABLE_PARAM_KEYS[def.id]?.includes(key)) return true;
    if (FULL_RERENDER_COMPONENT_IDS.has(def.id)) return true;
    if (def.id === 'table-column' || def.family === 'table-cell') return true;
    if (GENERIC_EDITABLE_PARAM_KEYS.has(key)) return true;
    return false;
  };

  const shouldDisplayTagParam = (key: string, params: Record<string, any>): boolean => {
    if (!TAG_PARAM_KEYS.has(key)) return true;
    const family = resolveTagFamily(params);
    if (family === 'status') return TAG_PARAM_SETS.status.has(key);
    if (family === 'other') {
      const otherType = resolveOtherTagType(params);
      return (otherType === 'group' ? TAG_PARAM_SETS.otherGroup : TAG_PARAM_SETS.otherMarketing).has(key);
    }
    return TAG_PARAM_SETS.default.has(key);
  };

  const shouldDisplayInputParam = (key: string, params: Record<string, any>): boolean => {
    const showPrefix = !!params.showPrefix;
    const showSuffix = !!params.showSuffix;
    if (key === 'prefixText') return showPrefix;
    if (key === 'suffixText') return showSuffix;
    return true;
  };

  const buildEffectiveParams = (def: ComponentDefinition, params: Record<string, any>): Record<string, any> => {
    const next = { ...(params || {}) };
    Object.entries(def.params || {}).forEach(([key, paramDef]) => {
      if (next[key] === undefined && paramDef && 'default' in paramDef) {
        next[key] = (paramDef as any).default;
      }
    });
    return next;
  };

  const PARAM_LABEL_MAP: Record<string, string> = {
    text: '文本',
    headerText: '表头文本',
    headerType: '表头元素',
    rowCount: '行数',
    columnCount: '列数',
    width: '宽度',
    height: '高度',
    size: '尺寸',
    controlType: '字段类型',
    rowAction: '行操作',
    hasPagination: '分页器',
    hasFilter: '筛选器',
    hasTabs: '标签页',
    hasButtonGroup: '按钮组',
    textAlign: '对齐方式',
    textDisplay: '文本显示',
    columnWidthMode: '列宽',
    itemCount: '表单项数量',
    headerHeight: '表头行高',
    bodyHeight: '内容行高',
    rowHeight: '行高',
    paddingTop: '上内边距',
    paddingBottom: '下内边距',
    paddingLeft: '左内边距',
    paddingRight: '右内边距',
    backgroundColor: '背景颜色',
    borderColor: '边框颜色',
    borderWidth: '边框宽度',
    borderBottomOnly: '仅下边框',
    cornerRadius: '圆角',
    componentToken: '组件 Token',
    tagType: '标签类型',
    sizePreset: '尺寸预设',
    colorScheme: '配色方案',
    statusTheme: '状态主题',
    statusType: '状态类型',
    statusState: '状态状态',
    showIcon: '显示图标',
    showDot: '显示圆点',
    showDropdown: '显示下拉',
    closable: '可关闭',
    disabled: '禁用',
    groupTexts: '标签组文本',
    labelWidth: '标签宽度',
    labelWidthPreset: '标签宽度预设',
    align: '对齐',
    layout: '布局',
    rowSpacing: '行间距',
    controlWidth: '控件宽度'
  };


  const OPTION_LABEL_MAP: Record<string, string> = {
    left: '左对齐',
    right: '右对齐',
    center: '居中',
    ellipsis: '单行省略',
    lineBreak: '支持换行',
    FIXED: '固定',
    HUG: '适应',
    FILL: '充满',
    None: '无',
    none: '无',
    Filter: '筛选',
    Sort: '排序',
    Search: '搜索',
    Info: '提示',
    mini: '迷你',
    default: '默认',
    medium: '中等',
    large: '大号',
    multiple: '多选',
    single: '单选',
    drag: '拖拽',
    expand: '展开',
    switch: '开关'
  };

  const normalizeLabelText = (value: string) => String(value || '').replace(/\s+/g, ' ').trim();

  const maybeHideNonOptionalParenLabel = (value: string, enabled: boolean) => {
    if (!enabled) return value;
    const raw = String(value || '');
    const next = raw
      .replace(/\s*（([^）]*)）\s*/g, (_match, inner) => (String(inner).includes('可选') ? `（${inner}）` : ' '))
      .replace(/\s*\(([^)]*)\)\s*/g, (_match, inner) => (String(inner).includes('可选') ? `(${inner})` : ' '));
    return normalizeLabelText(next);
  };

  const resolveParamLabel = (def: ComponentDefinition, key: string, paramDef: ParamDefinition): string => {
    const base = PARAM_LABEL_MAP[key] || paramDef.description || key;
    const normalized = normalizeLabelText(base);
    return maybeHideNonOptionalParenLabel(normalized, def.id === 'form-field');
  };

  const resolveOptionLabel = (def: ComponentDefinition, key: string, value: string): string => {
    if (OPTION_LABEL_MAP[value]) return OPTION_LABEL_MAP[value];
    if (isFormComponent(def.id)) return getFormSelectOptionLabel(key, value);
    return value;
  };

  const resolveVariantOptionValue = (value: unknown, options?: string[]) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'boolean') {
      if (options?.includes('True')) return value ? 'True' : 'False';
      return value ? 'true' : 'false';
    }
    return String(value);
  };

  const normalizeVariantCriteriaValue = (propType: string, value: string) => {
    if (!value) return null;
    if (propType === 'BOOLEAN') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      return value === 'True';
    }
    return value;
  };

  const buildParamControlRows = (
    def: ComponentDefinition,
    keys: string[],
    params: Record<string, any>
  ): { mainRows: React.ReactNode[]; switchRows: React.ReactNode[] } => {
    const mainRows: React.ReactNode[] = [];
    const switchRows: React.ReactNode[] = [];

    keys.forEach((key) => {
      const paramDef = def.params[key];
      const value = params[key] ?? paramDef.default;
      const label = resolveParamLabel(def, key, paramDef);
      const enumValues = paramDef.enumValues || [];
      let resolvedValue = value;
      if (
        (paramDef.type === 'select' || paramDef.type === 'enum') &&
        enumValues.length > 0 &&
        !enumValues.includes(value)
      ) {
        const normalizedValue = normalizeFormOption(value);
        const normalizedValueAlt = normalizedValue.replace('-group', '');
        const matched = enumValues.find((opt) => {
          const normalizedOption = normalizeFormOption(opt);
          return (
            normalizedOption === normalizedValue ||
            normalizedOption.includes(normalizedValue) ||
            normalizedOption.includes(normalizedValueAlt) ||
            normalizedValue.includes(normalizedOption)
          );
        });
        if (matched) resolvedValue = matched;
      }

      if (paramDef.type === 'boolean') {
        switchRows.push(
          <div className="switch-item" key={key}>
            <label>{label}</label>
            <SwitchControl value={!!resolvedValue} onChange={(next) => updateParam(key, next)} />
          </div>
        );
        return;
      }

      mainRows.push(
        <FieldRow key={key} label={label}>
          {paramDef.type === 'number' && (
            <NumberInputControl value={resolvedValue} onChange={(next) => updateParam(key, next)} />
          )}
          {paramDef.type === 'string' && (
            <TextInputControl value={resolvedValue} onChange={(next) => updateParam(key, next)} />
          )}
          {(paramDef.type === 'select' || paramDef.type === 'enum') && (
            <SelectControl value={resolvedValue} onChange={(next) => updateParam(key, next)}>
              {enumValues.map((opt) => (
                <option key={opt} value={opt}>
                  {resolveOptionLabel(def, key, opt)}
                </option>
              ))}
            </SelectControl>
          )}
          {paramDef.type === 'color' && (
            <ColorControl value={resolvedValue} onChange={(next) => updateParam(key, next)} />
          )}
        </FieldRow>
      );
    });

    return { mainRows, switchRows };
  };

  const renderPropertyEditor = () => {
    const editor = (() => {
      if (!selectedComponent) return null;
      const def = COMPONENT_DEFS[selectedComponent.componentId];
      if (!def) return null;

      // Find variants
      let familyVariants: ComponentDefinition[] = [];
      let currentVariantId = selectedComponent.componentId;

      if (def.family) {
          familyVariants = Object.values(COMPONENT_DEFS).filter(c => c.family === def.family);
      } else if (def.id === 'table-column') {
          // Special case for table column: show variants for cells
          familyVariants = Object.values(COMPONENT_DEFS).filter(c => c.family === 'table-cell');
          // Use the childComponentId if available, or default to table-cell
          currentVariantId = selectedComponent.childComponentId || 'table-cell';
      }

      const figmaToken = def.id === 'figma-component'
        ? String(selectedComponent.params?.componentToken || '').trim()
        : '';
      const figmaKey = def.id === 'figma-component'
        ? String(selectedComponent.params?.componentKey || '').trim()
        : '';
      const figmaPropsCacheKey = def.id === 'figma-component'
        ? resolveFigmaComponentPropsCacheKey(figmaToken, figmaKey)
        : '';
      const figmaPropsResult = figmaPropsCacheKey ? figmaComponentPropsCache[figmaPropsCacheKey] : null;
      const figmaVariantProperties = Array.isArray(figmaPropsResult?.properties)
        ? figmaPropsResult.properties.filter((prop: any) => prop.type === 'VARIANT' || prop.type === 'BOOLEAN')
        : [];
      const variantCriteriaMap = parseVariantCriteria(selectedComponent.params?.variantCriteria) || {};
      const showFigmaVariantProperties = def.id === 'figma-component' && figmaVariantProperties.length > 0;
      const isFormComponent = def.id === 'form';
      const formItemCountRaw = Number(selectedComponent.params?.itemCount);
      const formItemCountValue =
        Number.isFinite(formItemCountRaw) && formItemCountRaw > 0 ? Math.round(formItemCountRaw) : 1;
      const baseFormItemOptions = Array.from({ length: 10 }, (_, index) => index + 1);
      const formItemOptions = baseFormItemOptions.includes(formItemCountValue)
        ? baseFormItemOptions
        : [...baseFormItemOptions, formItemCountValue].sort((a, b) => a - b);

      return (
        <div className="property-editor">

          {familyVariants.length > 0 && (
            <div className="control-row" style={{ marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                {def.id === 'table-column' ? '列单元格类型' : '类型'}
              </label>
              <SelectControl value={currentVariantId} onChange={(value) => updateComponentType(value)}>
                {familyVariants.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </SelectControl>
            </div>
          )}

          {showFigmaVariantProperties && (
            <div className="control-row" style={{ marginBottom: '12px' }}>
              <div className="manual-control-stack">
                {figmaVariantProperties.map((prop: any) => {
                  const propName = normalizeLabelText(prop.displayName || prop.propertyName || '');
                  const propKey = normalizeLabelText(prop.displayName || prop.propertyName || '');
                  const legacyKey = String(prop.propertyName || '').trim();
                  if (!propName || !propKey) return null;
                  const options = Array.isArray(prop.variantOptions) ? prop.variantOptions : [];
                  const fallbackValue =
                    variantCriteriaMap[propKey] ??
                    (legacyKey ? variantCriteriaMap[legacyKey] : undefined) ??
                    prop.defaultValue ??
                    options[0];
                  const currentValue = resolveVariantOptionValue(fallbackValue, options);
                  const normalizedOptions = options.map((opt: string) => String(opt).trim().toLowerCase());
                  const isBooleanVariant =
                    String(prop.type || '').toUpperCase() === 'BOOLEAN' ||
                    (normalizedOptions.includes('true') && normalizedOptions.includes('false'));
                  const currentBooleanValue = normalizeVariantCriteriaValue('BOOLEAN', String(currentValue)) === true;
                  return (
                    <FieldRow key={propName} label={propName}>
                      {isBooleanVariant ? (
                        <SwitchControl
                          value={currentBooleanValue}
                          onChange={(next) => {
                            const nextCriteria = { ...variantCriteriaMap };
                            nextCriteria[propKey] = next;
                            const nextValue = Object.keys(nextCriteria).length > 0 ? JSON.stringify(nextCriteria) : '';
                            updateParam('variantCriteria', nextValue);
                          }}
                        />
                      ) : options.length > 0 ? (
                        <SelectControl
                          value={currentValue}
                          onChange={(next) => {
                            const normalized = normalizeVariantCriteriaValue(prop.type, String(next));
                            const nextCriteria = { ...variantCriteriaMap };
                            if (normalized === null || normalized === undefined || normalized === '') {
                              delete nextCriteria[propKey];
                            } else {
                              nextCriteria[propKey] = normalized;
                            }
                            const nextValue = Object.keys(nextCriteria).length > 0 ? JSON.stringify(nextCriteria) : '';
                            updateParam('variantCriteria', nextValue);
                          }}
                        >
                          {options.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </SelectControl>
                      ) : (
                        <TextInputControl
                          value={currentValue}
                          onChange={(next) => {
                            const nextCriteria = { ...variantCriteriaMap };
                            if (!next) {
                              delete nextCriteria[propKey];
                            } else {
                              nextCriteria[propKey] = next;
                            }
                            const nextValue = Object.keys(nextCriteria).length > 0 ? JSON.stringify(nextCriteria) : '';
                            updateParam('variantCriteria', nextValue);
                          }}
                        />
                      )}
                    </FieldRow>
                  );
                })}
              </div>
            </div>
          )}

          {(() => {
            const effectiveParams = buildEffectiveParams(def, selectedComponent.params || {});
            const isFormField = def.id === 'form-field';
            const isInput = def.id === 'input';
            const formFieldControlType = isFormField ? normalizeFormControlType(effectiveParams.controlType) : '';
            const useMergedFormFieldText =
              isFormField && (formFieldControlType === 'input' || formFieldControlType === 'select');
            const formFieldCurrentValue = useMergedFormFieldText ? String(effectiveParams.value ?? '') : '';
            const formFieldCachedValue = useMergedFormFieldText ? String(effectiveParams.cachedValue ?? '') : '';
            const formFieldTextValue = useMergedFormFieldText
              ? formFieldTextMode === 'value'
                ? formFieldCurrentValue
                : String(effectiveParams.placeholder ?? '')
              : '';
            const formFieldHiddenKeys = new Set([
              'label',
              'helpText',
              'descriptionText',
              'errorText',
              'layout',
              'componentKey',
              'variantCriteria',
              'text',
              'checkedValues',
              'language'
            ]);
            const paramKeys = Object.keys(def.params).filter((key) => {
              const paramDef = def.params[key];
              if (!isParamEditable(def, key, paramDef)) return false;
              if (isFormField && !shouldDisplayFormFieldParam(key, effectiveParams)) return false;
              if (isInput && !shouldDisplayInputParam(key, effectiveParams)) return false;
              if (isFormField && useMergedFormFieldText && (key === 'placeholder' || key === 'value')) return false;
              if (isFormField && formFieldHiddenKeys.has(key)) return false;
              if (def.id === 'figma-component' && key === 'variantCriteria' && figmaVariantProperties.length > 0) return false;
              if (def.id === 'figma-component' && ['componentToken', 'componentKey', 'fallbackName', 'width', 'height'].includes(key)) {
                return false;
              }
              if (def.id !== 'tag' && def.id !== 'table-cell-tag') return true;
              return shouldDisplayTagParam(key, effectiveParams);
            });
            const isForm = def.id === 'form';
            const orderedParamKeys = isForm
              ? ['layout', 'title', 'showColon'].filter((key) => paramKeys.includes(key))
              : isFormField
                ? [
                    ...['controlType', 'state', 'size'].filter((key) => paramKeys.includes(key)),
                    ...paramKeys.filter((key) => !['controlType', 'state', 'size'].includes(key))
                  ]
                : paramKeys;
            const advancedParamKeySet =
              ADVANCED_PARAM_KEYS_BY_COMPONENT[def.id] || new Set<string>();
            const commonParamKeys = orderedParamKeys.filter((key) => !advancedParamKeySet.has(key));
            const advancedParamKeysList = orderedParamKeys.filter((key) => advancedParamKeySet.has(key));
            const { mainRows: commonMainRows, switchRows: commonSwitchRows } = buildParamControlRows(
              def,
              commonParamKeys,
              selectedComponent.params || {}
            );
            const { mainRows: advancedMainRows, switchRows: advancedSwitchRows } = buildParamControlRows(
              def,
              advancedParamKeysList,
              selectedComponent.params || {}
            );
            const primaryFormFieldKeyCount = isFormField
              ? ['controlType', 'state', 'size'].filter((key) => commonParamKeys.includes(key)).length
              : 0;
            const formFieldTextControl = useMergedFormFieldText ? (
              <FieldRow key="form-field-text" label="填写文字">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <SegmentedControl
                    value={formFieldTextMode === 'value' ? 'value' : 'placeholder'}
                    onChange={(next) => {
                      const nextMode = next === 'value' ? 'value' : 'placeholder';
                      setFormFieldTextMode(nextMode);
                      if (nextMode === 'placeholder') {
                        const nextCachedValue = formFieldCurrentValue.trim().length > 0
                          ? formFieldCurrentValue
                          : formFieldCachedValue;
                        updateParams({ value: '', filled: false, cachedValue: nextCachedValue });
                        return;
                      }
                      if (!formFieldCurrentValue && formFieldCachedValue) {
                        updateParams({ value: formFieldCachedValue, cachedValue: formFieldCachedValue });
                      }
                    }}
                    groupClassName="othertabs-group"
                    buttonClassName="othertabs-button"
                    options={[
                      { value: 'value', label: '已填写' },
                      { value: 'placeholder', label: '占位文字' }
                    ]}
                  />
                  <TextInputControl
                    value={formFieldTextValue}
                    onChange={(next) => {
                      if (formFieldTextMode === 'value') {
                        updateParams({ value: next, cachedValue: next });
                      } else {
                        updateParams({ placeholder: next, value: '', filled: false });
                      }
                    }}
                  />
                </div>
              </FieldRow>
            ) : null;
            const mainRowsWithFormFieldText = useMergedFormFieldText && formFieldTextControl
              ? [
                  ...commonMainRows.slice(0, primaryFormFieldKeyCount),
                  formFieldTextControl,
                  ...commonMainRows.slice(primaryFormFieldKeyCount)
                ]
              : commonMainRows;
            const normalizedFormLayout = String(effectiveParams.layout || '').trim().toLowerCase();
            const showFormLabelAlign = isForm && (
              normalizedFormLayout.includes('horizontal') ||
              normalizedFormLayout.includes('横')
            );
            const normalizedFormAlign = String(effectiveParams.align || '').trim().toLowerCase();
            const formLabelAlignValue = normalizedFormAlign.includes('right') || normalizedFormAlign.includes('右')
              ? 'right'
              : 'left';
            const formLabelAlignControl = showFormLabelAlign ? (
              <FieldRow key="form-label-align" label="标签对齐">
                <SegmentedControl
                  value={formLabelAlignValue}
                  onChange={(value) => updateParam('align', value)}
                  groupClassName="align-group"
                  buttonClassName="align-button"
                  options={[
                    {
                      value: 'left',
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 4.5C4.72386 4.5 4.5 4.72386 4.5 5C4.5 5.27614 4.72386 5.5 5 5.5H15C15.2761 5.5 15.5 5.27614 15.5 5C15.5 4.72386 15.2761 4.5 15 4.5H5ZM5 8C4.72386 8 4.5 8.22386 4.5 8.5C4.5 8.77614 4.72386 9 5 9H11C11.2761 9 11.5 8.77614 11.5 8.5C11.5 8.22386 11.5 8 11 8H5ZM5 11.5C4.72386 11.5 4.5 11.7239 4.5 12C4.5 12.2761 4.72386 12.5 5 12.5H13C13.2761 12.5 13.5 12.2761 13.5 12C13.5 11.7239 13.5 11.5 13 11.5H5ZM5 15C4.72386 15 4.5 15.2239 4.5 15.5C4.5 15.7761 4.72386 16 5 16H10C10.2761 16 10.5 15.7761 10.5 15.5C10.5 15.2239 10.5 15 10 15H5Z"/>
                        </svg>
                      )
                    },
                    {
                      value: 'right',
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 4.5C4.72386 4.5 4.5 4.72386 4.5 5C4.5 5.27614 4.72386 5.5 5 5.5H15C15.2761 5.5 15.5 5.27614 15.5 5C15.5 4.72386 15.5 4.5 15 4.5H5ZM9 8C8.72386 8 8.5 8.22386 8.5 8.5C8.5 8.77614 8.72386 9 9 9H15C15.2761 9 15.5 8.77614 15.5 8.5C15.5 8.22386 15.5 8 15 8H9ZM7 11.5C6.72386 11.5 6.5 11.7239 6.5 12C6.5 12.2761 6.72386 12.5 7 12.5H15C15.2761 12.5 15.5 12.2761 15.5 12C15.5 11.7239 15.5 11.5 15 11.5H7ZM10 15C9.72386 15 9.5 15.2239 9.5 15.5C9.5 15.7761 9.72386 16 10 16H15C15.2761 16 15.5 15.7761 15.5 15.5C15.5 15.2239 15.5 15 15 15H10Z"/>
                        </svg>
                      )
                    }
                  ]}
                />
              </FieldRow>
            ) : null;
            const mainRowsWithFormLabelAlign =
              showFormLabelAlign && formLabelAlignControl
                ? (() => {
                    const layoutRowIndex = mainRowsWithFormFieldText.findIndex(
                      (row) => React.isValidElement(row) && row.key === 'layout'
                    );
                    if (layoutRowIndex < 0) {
                      return [formLabelAlignControl, ...mainRowsWithFormFieldText];
                    }
                    return [
                      ...mainRowsWithFormFieldText.slice(0, layoutRowIndex + 1),
                      formLabelAlignControl,
                      ...mainRowsWithFormFieldText.slice(layoutRowIndex + 1)
                    ];
                  })()
                : mainRowsWithFormFieldText;
            const formItemCountControl = isForm ? (
              <FieldRow key="form-item-count" label="表单项数量">
                <SelectControl
                  value={String(formItemCountValue)}
                  onChange={(value) => updateParam('itemCount', Number(value))}
                >
                  {formItemOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </SelectControl>
              </FieldRow>
            ) : null;
            const mainRowsWithFormItemCount =
              isForm && formItemCountControl
                ? [formItemCountControl, ...mainRowsWithFormLabelAlign]
                : mainRowsWithFormLabelAlign;
            const advancedSection =
              advancedMainRows.length > 0 || advancedSwitchRows.length > 0 ? (
                <div className="selection-advanced-section">
                  <div className="selection-divider" />
                  <div className="selection-advanced-body">
                    {advancedMainRows}
                    {advancedSwitchRows.length > 0 && <div style={{ marginTop: '12px' }}>{advancedSwitchRows}</div>}
                  </div>
                </div>
              ) : null;
            return (
              <>
                {mainRowsWithFormItemCount}
                {commonSwitchRows.length > 0 && <div style={{ marginTop: '12px' }}>{commonSwitchRows}</div>}
                {advancedSection}
              </>
            );
          })()}
        </div>
      );
    })();

    return (
      <>
        {renderSelectionAnalysis()}
        {editor}
      </>
    );
  };

  const renderTablePropertyEditor = () => {
    if (!selectedComponent) return null;
    const params = selectedComponent.params || {};
    const sizeValue = params.size || 'default';
    const rowCountValue = typeof params.rowCount === 'number' ? params.rowCount : 10;
    const rowActionValue = params.rowAction || 'none';
    const rowCountOptions = [1, 3, 5, 8, 10, 12, 15];
    const sizeOptions = [
      { value: 'mini', label: '迷你 - 32px' },
      { value: 'default', label: '默认 - 40px' },
      { value: 'medium', label: '中等 - 48px' },
      { value: 'large', label: '大号 - 56px' }
    ];
    const rowActionOptions = [
      { value: 'none', label: '无' },
      { value: 'multiple', label: '多选' },
      { value: 'single', label: '单选' },
      { value: 'drag', label: '拖拽' },
      { value: 'expand', label: '展开' },
      { value: 'switch', label: '开关' }
    ];

    return (
      <div className="selection-panel">
        <div className="section-title">表格尺寸</div>
        <div className="row">
          <div className="col">
            <SelectControl value={sizeValue} onChange={(value) => updateParam('size', value)}>
              {sizeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </SelectControl>
          </div>
        </div>

        <div className="section-title">表格行数</div>
        <div className="row">
          <div className="col">
            <SelectControl
              value={String(rowCountValue)}
              onChange={(value) => updateParam('rowCount', Number(value))}
            >
              {rowCountOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </SelectControl>
          </div>
        </div>

        <div className="section-title">表格行操作</div>
        <div className="row">
          <div className="col">
            <SelectControl value={rowActionValue} onChange={(value) => updateParam('rowAction', value)}>
              {rowActionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </SelectControl>
          </div>
        </div>

          <div style={{ marginTop: '12px' }}>
            <div className="switch-item">
              <label>分页器</label>
              <SwitchControl value={!!params.hasPagination} onChange={(value) => updateParam('hasPagination', value)} />
            </div>
            <div className="switch-item">
              <label>筛选器</label>
              <SwitchControl value={!!params.hasFilter} onChange={(value) => updateParam('hasFilter', value)} />
            </div>
            <div className="switch-item">
              <label>标签页</label>
              <SwitchControl value={!!params.hasTabs} onChange={(value) => updateParam('hasTabs', value)} />
            </div>
            <div className="switch-item">
              <label>按钮组</label>
              <SwitchControl value={!!params.hasButtonGroup} onChange={(value) => updateParam('hasButtonGroup', value)} />
            </div>
          </div>
      </div>
    );
  };

  const renderTableCellPropertyEditor = () => {
    if (!selectedComponent) return null;
    const params = selectedComponent.params || {};
    const isColumn = selectedComponent.componentId === 'table-column';
    const isCell = isTableCellComponent(selectedComponent.componentId);
    const cellVariants = Object.values(COMPONENT_DEFS).filter((def) => def.family === 'table-cell');
    const currentCellType = isColumn
      ? (selectedComponent.childComponentId || 'table-cell')
      : selectedComponent.componentId;
    const headerTypeValue = params.headerType || 'None';
    const alignValue = params.textAlign || 'left';
    const textDisplayValue = params.textDisplay || 'ellipsis';
    const widthModeValue = (params.columnWidthMode || 'FILL').toUpperCase();
    const contentDef = COMPONENT_DEFS[selectedComponent.componentId];
    const headerTextValue =
      (params.headerText ?? contentDef?.params?.headerText?.default ?? '') as string;
    const contentParamKeys = contentDef
      ? Object.keys(contentDef.params || {}).filter((key) => {
          const paramDef = contentDef.params[key];
          if (!isParamEditable(contentDef, key, paramDef)) return false;
          if (isColumn && (key === 'headerType' || COLUMN_CONTENT_HIDDEN_KEYS.has(key))) return false;
          if (contentDef.id !== 'tag' && contentDef.id !== 'table-cell-tag') return true;
          const effectiveParams = buildEffectiveParams(contentDef, selectedComponent.params || {});
          return shouldDisplayTagParam(key, effectiveParams);
        })
      : [];

    return (
      <div className="selection-panel">
        {(isColumn || (isCell && selectedComponent.componentId !== 'table-header-cell')) && (
          <>
            <div className="section-title">单元格类型</div>
            <div className="row">
              <div className="col">
                <SelectControl value={currentCellType} onChange={(value) => updateComponentType(value)}>
                  {cellVariants.map((variant) => (
                    <option key={variant.id} value={variant.id}>{variant.name}</option>
                  ))}
                </SelectControl>
              </div>
            </div>
          </>
        )}

        {isColumn && (
          <>
            <div className="section-title">表头元素</div>
            <div className="row">
              <div className="col">
                <SelectControl value={headerTypeValue} onChange={(value) => updateParam('headerType', value)}>
                  <option value="None">无</option>
                  <option value="Filter">筛选</option>
                  <option value="Sort">排序</option>
                  <option value="Search">搜索</option>
                  <option value="Info">提示</option>
                </SelectControl>
              </div>
            </div>
            <div className="section-title">表头文本</div>
            <div className="row">
              <div className="col">
                <TextInputControl
                  value={headerTextValue}
                  onChange={(value) => updateParam('headerText', value)}
                />
              </div>
            </div>
          </>
        )}

        <div className="section-title">对齐方式</div>
        <div className="row">
          <div className="col">
            <SegmentedControl
              value={alignValue}
              onChange={(value) => updateParam('textAlign', value)}
              groupClassName="align-group"
              buttonClassName="align-button"
              options={[
                {
                  value: 'left',
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 4.5C4.72386 4.5 4.5 4.72386 4.5 5C4.5 5.27614 4.72386 5.5 5 5.5H15C15.2761 5.5 15.5 5.27614 15.5 5C15.5 4.72386 15.2761 4.5 15 4.5H5ZM5 8C4.72386 8 4.5 8.22386 4.5 8.5C4.5 8.77614 4.72386 9 5 9H11C11.2761 9 11.5 8.77614 11.5 8.5C11.5 8.22386 11.2761 8 11 8H5ZM5 11.5C4.72386 11.5 4.5 11.7239 4.5 12C4.5 12.2761 4.72386 12.5 5 12.5H13C13.2761 12.5 13.5 12.2761 13.5 12C13.5 11.7239 13.2761 11.5 13 11.5H5ZM5 15C4.72386 15 4.5 15.2239 4.5 15.5C4.5 15.7761 4.72386 16 5 16H10C10.2761 16 10.5 15.7761 10.5 15.5C10.5 15.2239 10.2761 15 10 15H5Z"/>
                    </svg>
                  )
                },
                {
                  value: 'right',
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 4.5C4.72386 4.5 4.5 4.72386 4.5 5C4.5 5.27614 4.72386 5.5 5 5.5H15C15.2761 5.5 15.5 5.27614 15.5 5C15.5 4.72386 15.2761 4.5 15 4.5H5ZM9 8C8.72386 8 8.5 8.22386 8.5 8.5C8.5 8.77614 8.72386 9 9 9H15C15.2761 9 15.5 8.77614 15.5 8.5C15.5 8.22386 15.2761 8 15 8H9ZM7 11.5C6.72386 11.5 6.5 11.7239 6.5 12C6.5 12.2761 6.72386 12.5 7 12.5H15C15.2761 12.5 15.5 12.2761 15.5 12C15.5 11.7239 15.2761 11.5 15 11.5H7ZM10 15C9.72386 15 9.5 15.2239 9.5 15.5C9.5 15.7761 9.72386 16 10 16H15C15.2761 16 15.5 15.7761 15.5 15.5C15.5 15.2239 15.2761 15 15 15H10Z"/>
                    </svg>
                  )
                }
              ]}
            />
          </div>
        </div>

        <div className="section-title">文本显示</div>
        <div className="row">
          <div className="col">
            <SelectControl value={textDisplayValue} onChange={(value) => updateParam('textDisplay', value)}>
              <option value="ellipsis">单行省略</option>
              <option value="lineBreak">支持换行</option>
            </SelectControl>
          </div>
        </div>

        <div className="section-title">列宽</div>
        <div className="row">
          <div className="col">
            <SegmentedControl
              value={widthModeValue}
              onChange={(value) => updateParam('columnWidthMode', value)}
              groupClassName="othertabs-group"
              buttonClassName="othertabs-button"
              options={[
                { value: 'FIXED', label: '固定' },
                { value: 'HUG', label: '适应' },
                { value: 'FILL', label: '充满' }
              ]}
            />
          </div>
        </div>

        {isCell && !isColumn && selectedComponent.componentId !== 'table-header-cell' && (
          <div className="row" style={{ marginTop: '8px' }}>
            <button type="button" className="selection-primary" onClick={applyColumnSettings}>
              应用到整列
            </button>
          </div>
        )}

        {contentDef &&
          selectedComponent.componentId !== 'table-header-cell' &&
          contentParamKeys.length > 0 &&
          (!isCell || isColumn) && (
          <>
            <div className="section-title">单元格内容</div>
            {(() => {
              const { mainRows, switchRows } = buildParamControlRows(
                contentDef,
                contentParamKeys,
                selectedComponent.params || {}
              );
              return (
                <>
                  <div className="manual-control-stack">{mainRows}</div>
                  {switchRows.length > 0 && <div className="manual-switch-group">{switchRows}</div>}
                </>
              );
            })()}
          </>
        )}
      </div>
    );
  };

  const renderSelectionAnalysis = () => {
    return null;
  };

  const renderSelectionEditor = () => {
    if (!selectedComponent) return null;
    if (selectedComponent.componentId === 'table') {
      return renderTablePropertyEditor();
    }
    if (selectedComponent.componentId === 'table-column' || isTableCellComponent(selectedComponent.componentId)) {
      return renderTableCellPropertyEditor();
    }
    return renderPropertyEditor();
  };

  const renderDocs = () => {
    try {
      const registry = loadRegistry() ?? { version: 'unknown', components: {} as Record<string, ComponentDefinition> };
      const components = registry.components ?? {};
      const allDefs = Object.values(components).filter(isEnabledComponent);
      const defsById = components;
      const baseColorTokenEntries = Object.entries(BASE_COLOR_TOKEN_PACK ?? {}).sort(([a], [b]) => a.localeCompare(b));
      const semanticColorTokenEntries = Object.entries(SEMANTIC_COLOR_TOKEN_PACK ?? {}).sort(([a], [b]) => a.localeCompare(b));
      const baseTypographyTokenEntries = Object.entries(BASE_TYPOGRAPHY_TOKEN_PACK ?? {}).sort(([a], [b]) => a.localeCompare(b));
      const semanticTypographyTokenEntries = Object.entries(SEMANTIC_TYPOGRAPHY_TOKEN_PACK ?? {}).sort(([a], [b]) => a.localeCompare(b));
      const baseComponentTokenEntries = Object.entries(BASE_COMPONENT_TOKEN_PACK ?? {}).sort(([a], [b]) => a.localeCompare(b));
      const semanticComponentTokenEntries = Object.entries(SEMANTIC_COMPONENT_TOKEN_PACK ?? {}).sort(([a], [b]) => a.localeCompare(b));

      const grouped: {[key: string]: ComponentDefinition[]} = {};
      allDefs.forEach(def => {
          const cat = def.category || 'Other';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(def);
      });

      return (
        <div className="docs-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <h3 style={{ margin: 0 }}>组件库</h3>
          <label style={{ fontSize: '12px', color: '#666', display: 'inline-flex', alignItems: 'center', gap: '6px', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={showInheritedParams}
              onChange={(e) => setShowInheritedParams(e.target.checked)}
            />
            显示继承参数
          </label>
        </div>

        <div className="component-card" style={{ marginTop: '12px', marginBottom: '16px' }}>
          <div className="component-header">
            <span className="component-name">Figma 属性反查自动化</span>
            <span className="component-id" style={{ fontSize: '12px', color: '#999' }}>
              inspect_component_structure
            </span>
          </div>
          <p className="component-desc" style={{ fontSize: '13px', color: '#555' }}>
            支持按 token 自动反查真实属性和内部结构，用于把设计系统表单组件复刻为可扩展的自定义组件。结构反查会自动抽取默认态和关键状态，不需要手填变体条件。
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <input
              type="text"
              value={componentInspectTokenInput}
              onChange={(e) => setComponentInspectTokenInput(e.target.value)}
              placeholder="输入 token，支持逗号/空格分隔"
              style={{ flex: 1 }}
            />
            <button
              onClick={handleInspectStructureByTokenInput}
              disabled={componentInspectionRunning || loading}
            >
              自动反查
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <button
              onClick={handleCopyInspectJson}
              disabled={!componentInspectJson}
            >
              复制 Unified Inspect JSON
            </button>
          </div>
          {componentInspectionSummary && (
            <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>
              {componentInspectionSummary}
            </div>
          )}
          {componentInspectJson && (
            <textarea
              readOnly
              value={componentInspectJson}
              rows={10}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px', marginTop: '8px' }}
            />
          )}
        </div>

        <div className="component-card" style={{ marginTop: '12px', marginBottom: '16px' }}>
          <div className="component-header">
            <span className="component-name">Theme Color Tokens</span>
            <span className="component-id" style={{ fontSize: '12px', color: '#999' }}>
              semantic: {semanticColorTokenEntries.length} | base: {baseColorTokenEntries.length}
            </span>
          </div>
          <p className="component-desc" style={{ fontSize: '13px', color: '#555' }}>
            来自 <code>src/theme.color-tokens.ts</code>：语义 token 映射到基础 token，基础 token 再映射 VariableID/Key。
          </p>

          <div style={{ fontSize: '12px', color: '#777', marginBottom: '4px' }}>Semantic Tokens</div>
          <table className="params-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f5f5f5' }}>
                <th style={{ padding: '4px' }}>token</th>
                <th style={{ padding: '4px' }}>baseToken</th>
              </tr>
            </thead>
            <tbody>
              {semanticColorTokenEntries.map(([token, profile]) => {
                return (
                  <tr key={token} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '4px' }}><code>{token}</code></td>
                    <td style={{ padding: '4px' }}><code>{profile.baseToken}</code></td>
                  </tr>
                );
              })}
              {semanticColorTokenEntries.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ padding: '8px', color: '#999' }}>暂无语义颜色 token</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ fontSize: '12px', color: '#777', marginTop: '10px', marginBottom: '4px' }}>Base Tokens</div>
          <table className="params-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f5f5f5' }}>
                <th style={{ padding: '4px' }}>baseToken</th>
                <th style={{ padding: '4px' }}>variableRef</th>
                <th style={{ padding: '4px' }}>key/id</th>
              </tr>
            </thead>
            <tbody>
              {baseColorTokenEntries.map(([token, profile]) => {
                const keyAndId = [
                  profile.keyCandidates?.length ? `key: ${profile.keyCandidates.join(', ')}` : null,
                  profile.idCandidates?.length ? `id: ${profile.idCandidates.join(', ')}` : null
                ].filter(Boolean).join(' | ');
                return (
                  <tr key={token} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '4px' }}><code>{token}</code></td>
                    <td style={{ padding: '4px' }}><code>{profile.variableRef || '-'}</code></td>
                    <td style={{ padding: '4px' }}>{keyAndId || '-'}</td>
                  </tr>
                );
              })}
              {baseColorTokenEntries.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '8px', color: '#999' }}>暂无基础颜色 token</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="component-card" style={{ marginTop: '12px', marginBottom: '16px' }}>
          <div className="component-header">
            <span className="component-name">Theme Typography Tokens</span>
            <span className="component-id" style={{ fontSize: '12px', color: '#999' }}>
              semantic: {semanticTypographyTokenEntries.length} | base: {baseTypographyTokenEntries.length}
            </span>
          </div>
          <p className="component-desc" style={{ fontSize: '13px', color: '#555' }}>
            来自 <code>src/theme.typography-tokens.ts</code>：语义 token 映射到基础 token，基础 token 再映射 TextStyle Key/ID。
          </p>

          <div style={{ fontSize: '12px', color: '#777', marginBottom: '4px' }}>Semantic Tokens</div>
          <table className="params-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f5f5f5' }}>
                <th style={{ padding: '4px' }}>token</th>
                <th style={{ padding: '4px' }}>baseToken</th>
              </tr>
            </thead>
            <tbody>
              {semanticTypographyTokenEntries.map(([token, profile]) => (
                <tr key={token} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '4px' }}><code>{token}</code></td>
                  <td style={{ padding: '4px' }}><code>{profile.baseToken}</code></td>
                </tr>
              ))}
              {semanticTypographyTokenEntries.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ padding: '8px', color: '#999' }}>暂无语义排版 token</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ fontSize: '12px', color: '#777', marginTop: '10px', marginBottom: '4px' }}>Base Tokens</div>
          <table className="params-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f5f5f5' }}>
                <th style={{ padding: '4px' }}>baseToken</th>
                <th style={{ padding: '4px' }}>textStyleRef</th>
                <th style={{ padding: '4px' }}>key/id</th>
              </tr>
            </thead>
            <tbody>
              {baseTypographyTokenEntries.map(([token, profile]) => {
                const keyAndId = [
                  profile.keyCandidates?.length ? `key: ${profile.keyCandidates.join(', ')}` : null,
                  profile.idCandidates?.length ? `id: ${profile.idCandidates.join(', ')}` : null
                ].filter(Boolean).join(' | ');
                return (
                  <tr key={token} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '4px' }}><code>{token}</code></td>
                    <td style={{ padding: '4px' }}><code>{profile.textStyleRef || '-'}</code></td>
                    <td style={{ padding: '4px' }}>{keyAndId || '-'}</td>
                  </tr>
                );
              })}
              {baseTypographyTokenEntries.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '8px', color: '#999' }}>暂无基础排版 token</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="component-card" style={{ marginTop: '12px', marginBottom: '16px' }}>
          <div className="component-header">
            <span className="component-name">Theme Figma Component Tokens</span>
            <span className="component-id" style={{ fontSize: '12px', color: '#999' }}>
              semantic: {semanticComponentTokenEntries.length} | base: {baseComponentTokenEntries.length}
            </span>
          </div>
          <p className="component-desc" style={{ fontSize: '13px', color: '#555' }}>
            来自 <code>src/theme.component-tokens.ts</code>：语义 token 映射到基础 token，基础 token 映射到设计系统组件库的 Figma component key。
          </p>

          <div style={{ fontSize: '12px', color: '#777', marginBottom: '4px' }}>Semantic Tokens</div>
          <table className="params-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f5f5f5' }}>
                <th style={{ padding: '4px' }}>token</th>
                <th style={{ padding: '4px' }}>baseToken</th>
              </tr>
            </thead>
            <tbody>
              {semanticComponentTokenEntries.map(([token, profile]) => (
                <tr key={token} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '4px' }}><code>{token}</code></td>
                  <td style={{ padding: '4px' }}><code>{profile.baseToken}</code></td>
                </tr>
              ))}
              {semanticComponentTokenEntries.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ padding: '8px', color: '#999' }}>暂无语义组件 token</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ fontSize: '12px', color: '#777', marginTop: '10px', marginBottom: '4px' }}>Base Tokens</div>
          <table className="params-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f5f5f5' }}>
                <th style={{ padding: '4px' }}>baseToken</th>
                <th style={{ padding: '4px' }}>displayName</th>
                <th style={{ padding: '4px' }}>category</th>
                <th style={{ padding: '4px' }}>componentKey</th>
                <th style={{ padding: '4px' }}>source</th>
                <th style={{ padding: '4px' }}>aliases</th>
              </tr>
            </thead>
            <tbody>
              {baseComponentTokenEntries.map(([token, profile]) => (
                <tr key={token} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '4px' }}><code>{token}</code></td>
                  <td style={{ padding: '4px' }}>{profile.displayName || '-'}</td>
                  <td style={{ padding: '4px' }}>{profile.category || '-'}</td>
                  <td style={{ padding: '4px' }}><code>{profile.componentKey}</code></td>
                  <td style={{ padding: '4px' }}><code>{profile.source}</code></td>
                  <td style={{ padding: '4px' }}>{profile.aliases?.join(', ') || '-'}</td>
                </tr>
              ))}
              {baseComponentTokenEntries.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '8px', color: '#999' }}>暂无基础组件 token</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {Object.keys(grouped).length === 0 && (
          <div className="component-card" style={{ marginTop: '12px' }}>
            <div className="component-header">
              <span className="component-name">组件定义</span>
            </div>
            <p className="component-desc" style={{ fontSize: '13px', color: '#555' }}>
              registry.components 为空，暂无组件定义可展示。
            </p>
          </div>
        )}

        {Object.keys(grouped).sort().map(category => (
            <div key={category} className="category-section">
                <h4 style={{ 
                    borderBottom: '1px solid #eee', 
                    paddingBottom: '8px', 
                    marginTop: '24px',
                    color: '#666'
                }}>{category}</h4>
                {grouped[category].map((def: ComponentDefinition) => (
                  <div key={def.id} className="component-card" style={{ marginBottom: '16px' }}>
                    {(() => {
                      const legacyDef = COMPONENT_DEFS[def.id];
                      const familyDef = def.family ? defsById[def.family] : undefined;
                      const inheritedParamKeys = new Set<string>();
                      const defParams = def.params || {};
                      const familyParams = familyDef?.params || {};
                      if (familyDef && familyDef.id !== def.id) {
                        Object.entries(defParams).forEach(([key, paramDef]) => {
                          const familyParamDef = familyParams[key];
                          if (familyParamDef && isSameParamDefinition(paramDef, familyParamDef)) {
                            inheritedParamKeys.add(key);
                          }
                        });
                      }
                      const displayedParamEntries = Object.entries(defParams).filter(([key]) => (
                        showInheritedParams || !inheritedParamKeys.has(key)
                      ));
                      const editableParamKeys = new Set(
                        Object.keys(defParams).filter((key) =>
                          isParamEditable(def, key, defParams[key])
                        )
                      );

                      const isRebuilt = def.isRebuilt ?? Boolean(def.figmaPropertySnapshot || def.figmaBinding?.nodeType === 'INSTANCE');
                      return (
                        <>
                    <div className="component-header">
                      <span className="component-name">{def.name}</span>
                      {isRebuilt && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          background: '#FFF4E5',
                          color: '#B65D00',
                          border: '1px solid #FFD8A8',
                          marginLeft: '8px'
                        }}>
                          复刻
                        </span>
                      )}
                      <span className="component-id" style={{ fontSize: '12px', color: '#999' }}>ID: {def.id}</span>
                    </div>
                    <p className="component-desc" style={{ fontSize: '13px', color: '#555' }}>{def.description}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '4px', fontSize: '12px', marginBottom: '10px' }}>
                      <span style={{ color: '#777' }}>schemaVersion</span><code>{def.schemaVersion}</code>
                      <span style={{ color: '#777' }}>family</span><span>{def.family || '-'}</span>
                      <span style={{ color: '#777' }}>renderKey</span><code>{def.figmaBinding?.renderKey || '-'}</code>
                      <span style={{ color: '#777' }}>nodeType</span><code>{def.figmaBinding?.nodeType || '-'}</code>
                      <span style={{ color: '#777' }}>layoutMode</span><code>{def.figmaBinding?.preferredLayoutMode || '-'}</code>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#777', marginBottom: '4px' }}>Capabilities</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {Object.entries(def.capabilities || {}).map(([k, v]) => (
                          <span key={k} style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            background: v ? '#E8F7ED' : '#F3F4F6',
                            color: v ? '#1F7A3D' : '#6B7280',
                            border: `1px solid ${v ? '#B7E4C4' : '#E5E7EB'}`
                          }}>
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="params-table-wrapper">
                      {!showInheritedParams && inheritedParamKeys.size > 0 && (
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                          已隐藏继承自 <code>{familyDef?.id}</code> 的参数：{inheritedParamKeys.size} 项
                        </div>
                      )}
                      {legacyDef && (
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                          属性面板可编辑参数：{editableParamKeys.size} 项
                        </div>
                      )}
                      <table className="params-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', background: '#f5f5f5' }}>
                            <th style={{ padding: '4px' }}>参数</th>
                            <th style={{ padding: '4px' }}>类型</th>
                            <th style={{ padding: '4px' }}>默认值</th>
                            <th style={{ padding: '4px' }}>必填</th>
                            <th style={{ padding: '4px' }}>可编辑</th>
                            <th style={{ padding: '4px' }}>说明</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedParamEntries.map(([key, param]) => {
                            const editable = legacyDef ? editableParamKeys.has(key) : true;
                            return (
                              <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '4px' }}>{key}</td>
                                <td style={{ padding: '4px' }}><code style={{ background: '#eee', padding: '2px 4px', borderRadius: '3px' }}>{param.type}</code></td>
                                <td style={{ padding: '4px' }}>{String(param.default)}</td>
                                <td style={{ padding: '4px' }}>{param.required ? 'yes' : 'no'}</td>
                                <td style={{ padding: '4px', color: editable ? '#1F7A3D' : '#999' }}>
                                  {editable ? 'yes' : 'no'}
                                </td>
                                <td style={{ padding: '4px' }}>{param.description}</td>
                              </tr>
                            );
                          })}
                          {displayedParamEntries.length === 0 && (
                            <tr>
                              <td colSpan={6} style={{ padding: '8px', color: '#999' }}>
                                当前组件无差异参数（均继承自 <code>{familyDef?.id || '-'}</code>）。
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {def.slots && Object.keys(def.slots).length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '12px', color: '#777', marginBottom: '4px' }}>Slots</div>
                        <table className="params-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ textAlign: 'left', background: '#f5f5f5' }}>
                              <th style={{ padding: '4px' }}>slot</th>
                              <th style={{ padding: '4px' }}>allowedComponents</th>
                              <th style={{ padding: '4px' }}>required</th>
                              <th style={{ padding: '4px' }}>min/max</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(def.slots).map(([slotKey, slotDef]) => (
                              <tr key={slotKey} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '4px' }}><code>{slotKey}</code></td>
                                <td style={{ padding: '4px' }}>{slotDef.allowedComponents.join(', ')}</td>
                                <td style={{ padding: '4px' }}>{slotDef.required ? 'yes' : 'no'}</td>
                                <td style={{ padding: '4px' }}>{slotDef.minItems ?? 0} / {slotDef.maxItems ?? '∞'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {(() => {
                      const colorVariableBindings = def.colorVariableBindings;
                      if (!colorVariableBindings || Object.keys(colorVariableBindings).length === 0) return null;
                      return (
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ fontSize: '12px', color: '#777', marginBottom: '4px' }}>Color Variable Bindings</div>
                          <table className="params-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ textAlign: 'left', background: '#f5f5f5' }}>
                                <th style={{ padding: '4px' }}>semanticKey</th>
                                <th style={{ padding: '4px' }}>token</th>
                                <th style={{ padding: '4px' }}>enabled</th>
                                <th style={{ padding: '4px' }}>variableRef</th>
                                <th style={{ padding: '4px' }}>candidates</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(colorVariableBindings).map(([semanticKey, binding]) => {
                                const candidates = [
                                  binding.keyCandidates?.length ? `key: ${binding.keyCandidates.join(', ')}` : null,
                                  binding.idCandidates?.length ? `id: ${binding.idCandidates.join(', ')}` : null,
                                  binding.nameCandidates?.length ? `name: ${binding.nameCandidates.join(', ')}` : null
                                ].filter(Boolean).join(' | ');
                                return (
                                  <tr key={semanticKey} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '4px' }}><code>{semanticKey}</code></td>
                                    <td style={{ padding: '4px' }}><code>{binding.token || '-'}</code></td>
                                    <td style={{ padding: '4px' }}>{binding.enabled ? 'yes' : 'no'}</td>
                                    <td style={{ padding: '4px' }}><code>{binding.variableRef || '-'}</code></td>
                                    <td style={{ padding: '4px' }}>{candidates || '-'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                    {(() => {
                      const typographyBindings = def.typographyBindings;
                      if (!typographyBindings || Object.keys(typographyBindings).length === 0) return null;
                      return (
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ fontSize: '12px', color: '#777', marginBottom: '4px' }}>Typography Bindings</div>
                          <table className="params-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ textAlign: 'left', background: '#f5f5f5' }}>
                                <th style={{ padding: '4px' }}>semanticKey</th>
                                <th style={{ padding: '4px' }}>token</th>
                                <th style={{ padding: '4px' }}>enabled</th>
                                <th style={{ padding: '4px' }}>textStyleRef</th>
                                <th style={{ padding: '4px' }}>candidates</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(typographyBindings).map(([semanticKey, binding]) => {
                                const candidates = [
                                  binding.keyCandidates?.length ? `key: ${binding.keyCandidates.join(', ')}` : null,
                                  binding.idCandidates?.length ? `id: ${binding.idCandidates.join(', ')}` : null,
                                  binding.nameCandidates?.length ? `name: ${binding.nameCandidates.join(', ')}` : null
                                ].filter(Boolean).join(' | ');
                                return (
                                  <tr key={semanticKey} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '4px' }}><code>{semanticKey}</code></td>
                                    <td style={{ padding: '4px' }}><code>{binding.token || '-'}</code></td>
                                    <td style={{ padding: '4px' }}>{binding.enabled ? 'yes' : 'no'}</td>
                                    <td style={{ padding: '4px' }}><code>{binding.textStyleRef || '-'}</code></td>
                                    <td style={{ padding: '4px' }}>{candidates || '-'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                    {(() => {
                      const themeBindings = (def as ComponentDefinition & {
                        themeBindings?: Array<{ propKey: string; tokenRef: string }>
                      }).themeBindings;
                      if (!themeBindings || themeBindings.length === 0) return null;
                      return (
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ fontSize: '12px', color: '#777', marginBottom: '4px' }}>Theme Bindings</div>
                          <table className="params-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ textAlign: 'left', background: '#f5f5f5' }}>
                                <th style={{ padding: '4px' }}>propKey</th>
                                <th style={{ padding: '4px' }}>tokenRef</th>
                              </tr>
                            </thead>
                            <tbody>
                              {themeBindings.map((item, index) => (
                                <tr key={`${item.propKey}-${index}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                  <td style={{ padding: '4px' }}><code>{item.propKey}</code></td>
                                  <td style={{ padding: '4px' }}><code>{item.tokenRef}</code></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                        </>
                      );
                    })()}
                  </div>
                ))}
            </div>
        ))}
      </div>
      );
    } catch (error) {
      return (
        <div className="docs-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <h3 style={{ margin: 0 }}>组件库</h3>
          </div>
          <div className="component-card" style={{ marginTop: '12px' }}>
            <div className="component-header">
              <span className="component-name">加载失败</span>
            </div>
            <p className="component-desc" style={{ fontSize: '13px', color: '#555' }}>
              组件库渲染出现异常，请检查 registry 或 token 数据。
            </p>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: '#999' }}>
              {String(error)}
            </pre>
          </div>
        </div>
      );
    }
  };

  const handleClearPlan = () => {
    if (loading) return;
    setAgentPlan(null);
  };

  const handleManualTaskStatus = (taskId: string, status: PlanTaskStatus) => {
    if (loading) return;
    setAgentPlan((prev) => {
      if (!prev) return prev;
      return updateTaskStatus(prev, taskId, status, 'manual override');
    });
  };

  const handleNudgeNextTask = async () => {
    if (!agentPlan || manualTaskRunner || loading) return;
    const task = getNextExecutableTask(agentPlan);
    if (!task) return;

    setManualTaskRunner(true);
    try {
      const depNotDone = task.dependsOn.find((depId) => {
        const dep = findTaskById(agentPlan, depId);
        return !dep || dep.status !== 'done';
      });
      if (depNotDone) {
        const depMsg = `[System]: 手动执行被阻止，依赖任务未完成：${depNotDone}`;
        setResponse((prev) => (prev ? `${prev}\n\n${depMsg}` : depMsg));
        setAgentPlan((prev) => {
          if (!prev) return prev;
          return updateTaskStatus(prev, task.taskId, 'blocked', depMsg);
        });
        return;
      }

      if (task.status === 'done' && task.targetNodeId) {
        const doneMsg = `[System]: 手动执行跳过，任务已完成：${task.taskId} (target=${task.targetNodeId})`;
        setResponse((prev) => (prev ? `${prev}\n\n${doneMsg}` : doneMsg));
        return;
      }

      let nextPlan = updateTaskStatus(agentPlan, task.taskId, 'in_progress', 'manual run');
      setAgentPlan(nextPlan);

      const result = await executeTaskByType(task, { taskId: task.taskId }, nextPlan);
      setResponse((prev) => (prev ? `${prev}\n\n${result.message}` : result.message));

      if (result.ok) {
        nextPlan = updateTaskStatus(nextPlan, task.taskId, 'done');
        if (result.nodeId) {
          nextPlan = updateTaskTargetNodeId(nextPlan, task.taskId, result.nodeId);
        }
      } else {
        nextPlan = updateTaskStatus(nextPlan, task.taskId, 'failed', result.message);
      }

      setAgentPlan(nextPlan);
    } catch (e) {
      const errorMsg = `[System]: 手动执行失败 ${task.taskId}: ${e}`;
      setResponse((prev) => (prev ? `${prev}\n\n${errorMsg}` : errorMsg));
      setAgentPlan((prev) => {
        if (!prev) return prev;
        return updateTaskStatus(prev, task.taskId, 'failed', String(e));
      });
    } finally {
      setManualTaskRunner(false);
    }
  };

  const renderPlanPanel = () => {
    if (!agentPlan) return null;

    const counts = agentPlan.tasks.reduce(
      (acc, task) => {
        acc[task.status] += 1;
        return acc;
      },
      {
        pending: 0,
        in_progress: 0,
        done: 0,
        failed: 0,
        blocked: 0
      } as Record<PlanTaskStatus, number>
    );
    const nextTask = getNextExecutableTask(agentPlan);

    return (
      <div className="plan-panel">
        <div className="plan-header">
          <div>
            <div className="plan-title">执行计划</div>
            <div className="plan-meta">{agentPlan.planId} | {agentPlan.rootGoal}</div>
          </div>
          <div className="plan-header-actions">
            <button
              className="plan-clear-btn"
              onClick={handleNudgeNextTask}
              disabled={loading || manualTaskRunner || !nextTask}
            >
              {manualTaskRunner ? '执行中...' : '执行下一步'}
            </button>
            <button className="plan-clear-btn" onClick={handleClearPlan} disabled={loading}>清空计划</button>
          </div>
        </div>

        <div className="plan-counts">
          <span className="plan-chip pending">pending: {counts.pending}</span>
          <span className="plan-chip in_progress">in_progress: {counts.in_progress}</span>
          <span className="plan-chip done">done: {counts.done}</span>
          <span className="plan-chip failed">failed: {counts.failed}</span>
          <span className="plan-chip blocked">blocked: {counts.blocked}</span>
        </div>

        <div className="plan-next">
          {nextTask
            ? `Next: ${nextTask.taskId} - ${nextTask.title}`
            : 'Next: 无可执行任务'}
        </div>

        <div className="plan-task-list">
          {agentPlan.tasks.map((task) => (
            <div key={task.taskId} className={`plan-task plan-task-${task.status}`}>
              <div className="plan-task-main">
                <div className="plan-task-line">
                  <span className="plan-task-id">{task.taskId}</span>
                  <span className={`plan-task-status ${task.status}`}>
                    {task.status === 'in_progress' ? (
                      <SpinnerIcon className="plan-status-icon spin" />
                    ) : task.status === 'done' ? (
                      <CheckIcon className="plan-status-icon" />
                    ) : null}
                    {task.status}
                  </span>
                </div>
                <div className="plan-task-title">{task.title}</div>
                <div className="plan-task-meta">
                  type={task.type}
                  {task.targetNodeId ? ` | target=${task.targetNodeId}` : ''}
                  {task.dependsOn.length > 0 ? ` | dependsOn=${task.dependsOn.join(',')}` : ''}
                  {task.retries > 0 ? ` | retries=${task.retries}` : ''}
                </div>
                {task.notes && <div className="plan-task-notes">notes: {task.notes}</div>}
                {task.requiredSpecs.length > 0 && (
                  <div className="plan-task-specs">specs: {task.requiredSpecs.join(', ')}</div>
                )}
              </div>
              <div className="plan-task-actions">
                <button className="plan-mini-btn" onClick={() => handleManualTaskStatus(task.taskId, 'pending')} disabled={loading}>待处理</button>
                <button className="plan-mini-btn" onClick={() => handleManualTaskStatus(task.taskId, 'in_progress')} disabled={loading}>进行中</button>
                <button className="plan-mini-btn success" onClick={() => handleManualTaskStatus(task.taskId, 'done')} disabled={loading}>完成</button>
                <button className="plan-mini-btn danger" onClick={() => handleManualTaskStatus(task.taskId, 'failed')} disabled={loading}>失败</button>
                <button className="plan-mini-btn" onClick={() => handleManualTaskStatus(task.taskId, 'blocked')} disabled={loading}>阻塞</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getSelectionTypeAndName = () => {
    if (!selectedComponent) return { type: '', name: '' };
    const def = COMPONENT_DEFS[selectedComponent.componentId];
    const base = def?.name || selectedComponent.componentId;
    const params = selectedComponent.params || {};
    let type = base;
    if (selectedComponent.componentId === 'table-column') {
      type = '列';
    } else if (selectedComponent.componentId === 'table-header-cell') {
      type = '表头';
    } else if (def?.family === 'table-cell' || selectedComponent.componentId.startsWith('table-cell')) {
      type = '单元格';
    } else if (base.includes(' ')) {
      type = base.split(' ').slice(-1)[0] || base;
    }
    let paramName = '';
    if (selectedComponent.componentId === 'table-column') {
      paramName = String(params.headerText || '').trim();
    } else if (selectedComponent.componentId === 'table-header-cell') {
      paramName = String(params.text || '').trim();
    } else if (selectedComponent.componentId === 'form-field') {
      paramName = String(params.label || '').trim();
    }
    const rawName = String(selectedComponent.nodeName || '').trim();
    const resolvedName = paramName || rawName;
    const name = resolvedName && resolvedName !== base ? resolvedName : '';
    return { type, name };
  };

  const getSelectionTitle = () => {
    if (!selectedComponent) return '';
    const def = COMPONENT_DEFS[selectedComponent.componentId];
    if (def?.id === 'figma-component') {
      const token = String(selectedComponent.params?.componentToken || '').trim();
      const componentKey = String(selectedComponent.params?.componentKey || '').trim();
      if (token) {
        const semanticProfile = SEMANTIC_COMPONENT_TOKEN_PACK[token];
        const baseToken = semanticProfile?.baseToken || token;
        const baseProfile = BASE_COMPONENT_TOKEN_PACK[baseToken];
        const tokenName = baseProfile?.displayName || baseToken;
        if (tokenName) return tokenName;
      }
      if (componentKey && BASE_COMPONENT_KEY_TO_NAME[componentKey]) {
        return BASE_COMPONENT_KEY_TO_NAME[componentKey];
      }
    }
    const { type, name } = getSelectionTypeAndName();
    if (!type) return '';
    return name ? `${type}：${name}` : type;
  };

  const renderSelectionPage = () => {
    const hasSelection = Boolean(selectedComponent);
    const selectionTitle = getSelectionTitle();
    const selectionTitleDisplay = selectionTitle
      ? selectionTitle
      : selectedComponent
        ? String(selectedComponent.nodeName || selectedComponent.componentId || '').trim()
        : '';
    return (
      <div className="selection-layout">
        <div className="selection-header">
          <div className="selection-header-left">
            <button
              className="selection-back"
              onClick={() => setActiveTab('chat')}
            >
              <span className="selection-back-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M11.1 11.3609C11.4113 11.6721 11.4113 12.1768 11.1 12.4881L10.5364 13.0517C10.2252 13.363 9.72047 13.363 9.4092 13.0517L4.90029 8.54279C4.74381 8.38632 4.666 8.18098 4.66684 7.9759C4.666 7.77082 4.74381 7.56548 4.90029 7.40901L9.4092 2.90009C9.72047 2.58882 10.2252 2.58882 10.5364 2.90009L11.1 3.46371C11.4113 3.77498 11.4113 4.27966 11.1 4.59094L7.71508 7.9759L11.1 11.3609Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className="selection-back-text">返回对话模式</span>
            </button>
          </div>
          <div className="selection-title">选中内容属性</div>
        </div>
          <div className={`selection-scroll ${hasSelection ? '' : 'selection-scroll-empty'}`}>
          {hasSelection ? (
            <>
              <div className="selection-panel-group">
                <div className="selection-current">
                  <span className="selection-current-label">当前选中</span>
                  <span className="chat-selection-tag">
                    <span className="chat-selection-tag-text">{selectionTitleDisplay}</span>
                  </span>
                </div>
                {renderSelectionEditor()}
              </div>
            </>
          ) : (
            <div className="selection-empty">未选中任何内容</div>
          )}
        </div>
      </div>
    );
  };


  return (
    <div
      className={`container ${activeTab === 'selection' ? 'container-selection' : ''} ${
        activeTab === 'chat' ? 'container-chat' : ''
      }`}
    >
      {activeTab !== 'selection' && (
        <div className="tabs">
          <button 
            className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            对话 & 编辑
          </button>
          <button
            className="tab-button"
            onClick={() => setActiveTab('selection')}
          >
            选中属性
          </button>
          <button 
            className={`tab-button ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            组件库
          </button>
        </div>
      )}

      {activeTab === 'chat' ? (
        <div className="chat-layout">
          <div className="chat-scroll" ref={chatScrollRef}>
            <div className="chat-thread">
              {uiMessages.map((msg, index) => (
                <div key={`${msg.role}_${index}`} className={`chat-message ${msg.role}`}>
                  {(() => {
                    if (msg.role !== 'ai') return null;
                    const isRunning = loading && index === uiMessages.length - 1;
                    const hasContent = Boolean(msg.content.trim());
                    if (!isRunning && !hasContent) return null;
                    return (
                      <span className={`chat-message-status ${isRunning ? 'running' : 'done'}`}>
                        {isRunning ? (
                          <SpinnerIcon className="chat-status-icon spin" />
                        ) : (
                          <CheckIcon className="chat-status-icon" />
                        )}
                      </span>
                    );
                  })()}
                  <div className="chat-bubble">
                    {msg.role === 'ai' ? (
                      <div className="ai-message">
                        {(() => {
                          const items = buildAiDisplayItems(msg.content);
                          const isLast = index === uiMessages.length - 1;
                          const showThinkingRow = isLast && (thinkingActive || thinkingSeconds !== null);
                          const isHiddenSpecThought = (text: string) => {
                            const normalized = String(text || '').trim();
                            if (parseSeriesSpecLine(normalized)) return true;
                            const compact = normalized.replace(/\s+/g, '').replace(/[。.!！…]+$/g, '');
                            return (
                              (compact.startsWith('读') ||
                                compact.startsWith('读取') ||
                                compact.startsWith('重新读取')) &&
                              /spec$/i.test(compact)
                            );
                          };
                          const hasSpecThought = items.some((item) => item.kind === 'thought' && isHiddenSpecThought(item.text));
                          return (
                            <>
                              {showThinkingRow && (
                                <div className="ai-thought ai-thinking">
                                  <ThinkingIcon className="ai-thought-icon" />
                                  <p className="ai-thought-text">
                                    {thinkingActive ? '思考中...' : `思考 ${thinkingSeconds ?? 1}s`}
                                  </p>
                                  {hasSpecThought && (
                                    <button
                                      type="button"
                                      className={`ai-thinking-toggle ${thoughtDetailsExpanded ? 'expanded' : ''}`}
                                      onClick={() => setThoughtDetailsExpanded((prev) => !prev)}
                                      aria-label={thoughtDetailsExpanded ? '收起思考细节' : '展开思考细节'}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path
                                          d="M4 6L8 10L12 6"
                                          stroke="#A1A1AA"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              )}
                              {items.map((item, itemIndex) => {
                                if (item.kind === 'thought') {
                                  const shouldHide = isHiddenSpecThought(item.text);
                                  if (shouldHide && !thoughtDetailsExpanded) return null;
                                  const compact = String(item.text || '').replace(/\s+/g, '');
                                  const isReadSpecsLine = Boolean(parseSeriesSpecLine(item.text));
                                  const isDrawLine = compact.startsWith('绘制');
                                  if (isReadSpecsLine) {
                                    return (
                                      <div key={`thought_${itemIndex}`} className="ai-action-line">
                                        <SearchIcon className="ai-action-icon" />
                                        <p className="ai-action-text">{item.text}</p>
                                      </div>
                                    );
                                  }
                                  if (isDrawLine) {
                                    return (
                                      <div key={`thought_${itemIndex}`} className="ai-action-line">
                                        <DrawIcon className="ai-action-icon" />
                                        <p className="ai-action-text">{isLast && loading ? `${item.text}...` : item.text}</p>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={`thought_${itemIndex}`} className="ai-thought">
                                      <ThinkingIcon className="ai-thought-icon" />
                                      <p className="ai-thought-text">{item.text}</p>
                                    </div>
                                  );
                                }

                                const compact = String(item.text || '').replace(/\s+/g, '');
                                const isReadSpecsLine = Boolean(parseSeriesSpecLine(item.text));
                                const isDrawLine = compact.startsWith('绘制');
                                if (isReadSpecsLine) {
                                  return (
                                    <div key={`text_${itemIndex}`} className="ai-action-line">
                                      <SearchIcon className="ai-action-icon" />
                                      <p className="ai-action-text">{item.text}</p>
                                    </div>
                                  );
                                }
                                if (isDrawLine) {
                                  return (
                                    <div key={`text_${itemIndex}`} className="ai-action-line">
                                      <DrawIcon className="ai-action-icon" />
                                      <p className="ai-action-text">{isLast && loading ? `${item.text}...` : item.text}</p>
                                    </div>
                                  );
                                }
                                return (
                                  <div key={`text_${itemIndex}`} className="ai-text-line">
                                    {item.text}
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <UserMessageBubble content={msg.content} images={msg.images} tables={msg.tables} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {agentPlan && (
              <button
                className="plan-island-toggle"
                onClick={() => setPlanIslandOpen((prev) => !prev)}
                title={planIslandOpen ? '收起执行计划' : '展开执行计划'}
                disabled={loading}
              >
                {planIslandOpen ? '收起计划' : '计划岛台'}
              </button>
            )}

            {agentPlan && planIslandOpen && (
              <div className="plan-island">
                {renderPlanPanel()}
              </div>
            )}
          </div>
          <div className="input-section">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(event) => {
                handleImageFiles(event.target.files);
                event.currentTarget.value = '';
              }}
            />
            <input
              ref={tableInputRef}
              type="file"
              accept=".csv,.tsv,.xlsx,.xls"
              multiple
              style={{ display: 'none' }}
              onChange={(event) => {
                handleTableFiles(event.target.files);
                event.currentTarget.value = '';
              }}
            />
            <div className="chat-selection-bar">
              {selectionCount <= 0 ? (
                <span className="chat-selection-label">未选中画布内任何元素</span>
              ) : selectionCount > 1 ? (
                <span className="chat-selection-label">已选中 {selectionCount} 个元素</span>
              ) : getSelectionTitle() ? (
                <span className="chat-selection-group">
                  <span className="chat-selection-label">已选中</span>
                  <span className="chat-selection-tag">
                    <span className="chat-selection-tag-text">{getSelectionTitle()}</span>
                  </span>
                </span>
              ) : (
                <span className="chat-selection-label">已选中</span>
              )}
              <Tooltip content={manualTooltipText} enabled={selectionCount <= 0} placement="top-end">
                <div className="chat-selection-action-wrap">
                  <button
                    type="button"
                    className="chat-selection-action"
                    onClick={() => setActiveTab('selection')}
                    disabled={selectionCount <= 0}
                  >
                    手动调整
                  </button>
                </div>
              </Tooltip>
            </div>
            <div className="composer">
              {(uploadedImages.length > 0 || uploadedTables.length > 0 || attachmentError) && (
                <div className="attachment-list">
                  {uploadedImages.map((image) => (
                    <div key={image.id} className="attachment-card">
                      <img className="attachment-thumb" src={image.dataUrl} alt={image.name} />
                      <div className="attachment-meta">
                        <div className="attachment-name">{image.name}</div>
                        <div className="attachment-subtle">Image · {formatBytes(image.size)}</div>
                      </div>
                      <button
                        type="button"
                        className="attachment-remove"
                        onClick={() => removeImageAttachment(image.id)}
                        disabled={loading}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                  {uploadedTables.map((table) => (
                    <div key={table.id} className="attachment-card table-card">
                      <span className="attachment-file-icon" aria-hidden="true">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="3" width="18" height="18" rx="4" fill="#E8F5E9"/>
                          <path d="M8 8H16" stroke="#2E7D32" strokeWidth="1.6" strokeLinecap="round"/>
                          <path d="M8 12H16" stroke="#2E7D32" strokeWidth="1.6" strokeLinecap="round"/>
                          <path d="M8 16H14" stroke="#2E7D32" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <div className="attachment-meta">
                        <div className="attachment-name">{table.name}</div>
                        <div className={`attachment-subtle ${table.parseError ? 'attachment-error-text' : ''}`}>
                          {table.parseError ? table.parseError : `${formatTableKind(table.kind)} · ${formatBytes(table.size)}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="attachment-remove"
                        onClick={() => removeTableAttachment(table.id)}
                        disabled={loading}
                      >
                        删除
                      </button>
                    </div>
                  ))}
              {attachmentError && <div className="attachment-error-banner">{attachmentError}</div>}
            </div>
          )}
              <div
                className={`composer-box ${chartShortcutActive ? 'with-chart-tag' : ''}`}
                ref={composerBoxRef}
              >
                {chartShortcutActive && (
                  <div
                    className="composer-chart-tag-row"
                    ref={chartDropdownRef}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <span className="composer-chart-tag-prefix">生成一个</span>
                    <div className="composer-chart-tag-wrap">
                      <button
                        type="button"
                        className="composer-chart-tag"
                        onClick={() => {
                          setAttachmentMenuOpen(false);
                          setChartMenuOpen((prev) => !prev);
                        }}
                        disabled={loading}
                      >
                        <span className="composer-chart-tag-text">{chartShortcutActive}</span>
                        <span className="composer-chart-tag-icon" aria-hidden="true">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M3.46129 3.67509C3.22783 3.44164 2.84933 3.44164 2.61587 3.67509L2.19316 4.0978C1.9597 4.33126 1.9597 4.70977 2.19316 4.94322L5.57484 8.32491C5.6922 8.44226 5.8462 8.50062 6.00001 8.49999C6.15382 8.50062 6.30782 8.44226 6.42518 8.32491L9.80686 4.94322C10.0403 4.70977 10.0403 4.33126 9.80686 4.0978L9.38415 3.67509C9.15069 3.44164 8.77219 3.44164 8.53873 3.67509L6.00001 6.21381L3.46129 3.67509Z"
                              fill="currentColor"
                            />
                          </svg>
                        </span>
                      </button>
                      <div className={`composer-chart-dropdown ${chartMenuOpen ? 'open' : ''}`}>
                        {chartTypeShortcuts.map((shortcut) => (
                          <button
                            key={shortcut.label}
                            type="button"
                            className={`composer-chart-dropdown-item ${
                              chartShortcutActive === shortcut.label ? 'active' : ''
                            }`}
                            onClick={() => {
                              setUserInput('');
                              setChartShortcutActive(shortcut.label);
                              if (shortcut.label === '折线图') {
                                setChartOverlayOpen(true);
                              } else {
                                setChartOverlayOpen(false);
                              }
                              setAttachmentMenuOpen(false);
                              setChartMenuOpen(false);
                              composerTextareaRef.current?.focus();
                            }}
                            disabled={loading}
                          >
                            <span className="composer-chart-dropdown-icon" aria-hidden="true">
                              {chartShortcutIcons[shortcut.label]}
                            </span>
                            <span className="composer-chart-dropdown-label">{shortcut.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="composer-textarea-wrap">
                  <textarea
                    className="composer-textarea"
                    value={userInput}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setUserInput(nextValue);
                      if (nextValue.trim()) {
                        setChartShortcutActive(null);
                      }
                      if (!nextValue.trim()) {
                        setChartPromptMode(false);
                        setChartShortcutActive(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        !e.shiftKey &&
                        !('isComposing' in e.nativeEvent && e.nativeEvent.isComposing) &&
                        uploadedImages.length > 0 &&
                        !loading
                      ) {
                        e.preventDefault();
                        onSend();
                        return;
                      }
                      if (
                        (e.key === 'Backspace' || e.key === 'Delete') &&
                        !userInput.trim() &&
                        chartShortcutActive
                      ) {
                        e.preventDefault();
                        setChartShortcutActive(null);
                        setChartPromptMode(false);
                        setChartMenuOpen(false);
                      }
                    }}
                    onPaste={handlePaste}
                    placeholder={
                      chartShortcutActive
                        ? ''
                        : selectionCount > 0
                          ? '请输入需要调整的地方...'
                          : '让 VED UI Agent 绘制...'
                    }
                    disabled={loading}
                    rows={4}
                    ref={composerTextareaRef}
                  />
                </div>
                <div className="composer-footer">
                  <div className="composer-footer-left">
                    <div
                      className="composer-attach"
                      ref={composerAttachRef}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="composer-icon-button"
                        onClick={() => setAttachmentMenuOpen((prev) => !prev)}
                        disabled={loading}
                      >
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 3.75V14.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M3.75 9H14.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                      {attachmentMenuOpen && (
                        <div className="composer-menu">
                          <button
                            type="button"
                            className="composer-menu-item"
                            onClick={() => {
                              setAttachmentMenuOpen(false);
                              imageInputRef.current?.click();
                            }}
                            disabled={loading}
                          >
                            <span className="composer-menu-icon">
                              <svg
                                className="icon-screenshot"
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                role="img"
                                aria-label="截图图标"
                                focusable="false"
                              >
                                <title>截图图标</title>
                                <path
                                  d="M2.75 15C2.3375 15 1.98438 14.8531 1.69063 14.5594C1.39687 14.2656 1.25 13.9125 1.25 13.5V3C1.25 2.5875 1.39687 2.23437 1.69063 1.94062C1.98438 1.64687 2.3375 1.5 2.75 1.5H8.75C8.75 1.7125 8.75 1.94375 8.75 2.19375C8.75 2.44375 8.75 2.7125 8.75 3H2.75V13.5H13.25V7.5C13.5375 7.5 13.8063 7.5 14.0563 7.5C14.3063 7.5 14.5375 7.5 14.75 7.5V13.5C14.75 13.9125 14.6031 14.2656 14.3094 14.5594C14.0156 14.8531 13.6625 15 13.25 15H2.75ZM3.5 12H12.5L9.6875 8.25L7.4375 11.25L5.75 9L3.5 12ZM11.75 6V4.5H10.25V3H11.75V1.5H13.25V3H14.75V4.5H13.25V6H11.75Z"
                                  fill="#18181B"
                                />
                              </svg>
                            </span>
                            上传截图
                          </button>
                          <button
                            type="button"
                            className="composer-menu-item"
                            onClick={() => {
                              setAttachmentMenuOpen(false);
                              tableInputRef.current?.click();
                            }}
                            disabled={loading}
                          >
                            <span className="composer-menu-icon">
                              <svg
                                className="icon-spreadsheet-file"
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                role="img"
                                aria-label="表格文件图标"
                                focusable="false"
                              >
                                <title>表格文件图标</title>
                                <g clipPath="url(#clip0_icon_spreadsheet_file)">
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M11.3904 0.666687C11.5673 0.666687 11.7369 0.736964 11.8619 0.86205L13.8048 2.80578C13.9298 2.93079 14 3.10032 14 3.27708V14.6667C14 15.0349 13.7015 15.3334 13.3333 15.3334H2.66667C2.29848 15.3334 2 15.0349 2 14.6667V1.33335C2 0.965164 2.29848 0.666687 2.66667 0.666687H11.3904ZM10.6663 2.00002L3.33333 2.00002V14H12.6667V4.01269L11 4.01301C10.8159 4.01301 10.6667 3.86377 10.6667 3.67968L10.6663 2.00002ZM11 5.33335C11.3682 5.33335 11.6667 5.63183 11.6667 6.00002V11.6667C11.6667 12.0349 11.3682 12.3334 11 12.3334H5C4.63181 12.3334 4.33333 12.0349 4.33333 11.6667V6.00002C4.33333 5.63183 4.63181 5.33335 5 5.33335H11ZM6.838 8.66669H5.53333V11.1334H6.838V8.66669ZM10.4663 8.66669H7.838V11.1334H10.4667L10.4663 8.66669ZM6.838 6.53302L5.53333 6.53335V7.66669H6.838V6.53302ZM10.4667 6.53335L7.838 6.53302V7.66669H10.4663L10.4667 6.53335Z"
                                    fill="#18181B"
                                  />
                                </g>
                                <defs>
                                  <clipPath id="clip0_icon_spreadsheet_file">
                                    <rect width="16" height="16" fill="white" />
                                  </clipPath>
                                </defs>
                              </svg>
                            </span>
                            上传表格
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="composer-quick-actions">
                      <button
                        type="button"
                        className="composer-quick-chip composer-quick-chip-btn"
                        onClick={() => {
                          replaceQuickPrompt('生成一个表格');
                          setChartPromptMode(false);
                          setChartShortcutActive(null);
                          setAttachmentMenuOpen(false);
                          setQuickComponentMenuOpen(false);
                          composerTextareaRef.current?.focus();
                        }}
                        disabled={loading}
                      >
                        <span className="composer-quick-chip-icon" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_240_5295)">
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M12.1853 1.16669C12.5432 1.16669 12.8334 1.45687 12.8334 1.81484V12.1852C12.8334 12.5432 12.5432 12.8334 12.1853 12.8334H1.8149C1.45693 12.8334 1.16675 12.5432 1.16675 12.1852V1.81484C1.16675 1.45687 1.45693 1.16669 1.8149 1.16669H12.1853ZM2.33341 11.6667H4.66646L4.66675 5.83335H2.33341V11.6667ZM11.6667 5.83335H5.83341L5.83312 11.6667H11.6667V5.83335ZM11.6667 4.66669V2.33335H5.83341V4.66669H11.6667ZM4.66675 2.33335H2.33341V4.66669H4.66675V2.33335Z"
                                fill="currentColor"
                              />
                            </g>
                            <defs>
                              <clipPath id="clip0_240_5295">
                                <rect width="14" height="14" fill="white" />
                              </clipPath>
                            </defs>
                          </svg>
                        </span>
                        <span className="composer-quick-chip-label">表格</span>
                      </button>
                      <button
                        type="button"
                        className="composer-quick-chip composer-quick-chip-btn"
                        onClick={() => {
                          replaceQuickPrompt('生成一个表单');
                          setChartPromptMode(false);
                          setChartShortcutActive(null);
                          setAttachmentMenuOpen(false);
                          setQuickComponentMenuOpen(false);
                          composerTextareaRef.current?.focus();
                        }}
                        disabled={loading}
                      >
                        <span className="composer-quick-chip-icon" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_240_10797)">
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M11.6667 0.875C11.9888 0.875 12.25 1.13617 12.25 1.45833V12.5417C12.25 12.8638 11.9888 13.125 11.6667 13.125H2.33333C2.01117 13.125 1.75 12.8638 1.75 12.5417V1.45833C1.75 1.13617 2.01117 0.875 2.33333 0.875H11.6667ZM11.0833 2.04167H2.91667V11.9583H11.0833V2.04167ZM7.875 8.75C8.03608 8.75 8.16667 8.88058 8.16667 9.04167V9.625C8.16667 9.78608 8.03608 9.91667 7.875 9.91667H4.66667C4.50558 9.91667 4.375 9.78608 4.375 9.625V9.04167C4.375 8.88058 4.50558 8.75 4.66667 8.75H7.875ZM9.33333 6.125C9.49442 6.125 9.625 6.25558 9.625 6.41667V7C9.625 7.16108 9.49442 7.29167 9.33333 7.29167H4.66667C4.50558 7.29167 4.375 7.16108 4.375 7V6.41667C4.375 6.25558 4.50558 6.125 4.66667 6.125H9.33333ZM9.33333 3.5C9.49442 3.5 9.625 3.63058 9.625 3.79167V4.375C9.625 4.53608 9.49442 4.66667 9.33333 4.66667H4.66667C4.50558 4.66667 4.375 4.53608 4.375 4.375V3.79167C4.375 3.63058 4.50558 3.5 4.66667 3.5H9.33333Z"
                                fill="currentColor"
                              />
                            </g>
                            <defs>
                              <clipPath id="clip0_240_10797">
                                <rect width="14" height="14" fill="white" />
                              </clipPath>
                            </defs>
                          </svg>
                        </span>
                        <span className="composer-quick-chip-label">表单</span>
                      </button>
                    <div
                      className="composer-chart-dropdown-wrap"
                      ref={chartShortcutActive ? undefined : chartDropdownRef}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="composer-quick-chip composer-quick-chip-btn"
                        onClick={() => {
                          replaceQuickPrompt('生成一个图表');
                          setChartPromptMode(false);
                          setChartShortcutActive(null);
                          setAttachmentMenuOpen(false);
                          setQuickComponentMenuOpen(false);
                          setChartMenuOpen((prev) => !prev);
                          composerTextareaRef.current?.focus();
                        }}
                        disabled={loading}
                      >
                        <span className="composer-quick-chip-icon" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_240_12373)">
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M12.185 1.16669C12.543 1.16669 12.8332 1.45687 12.8332 1.81484V12.1852C12.8332 12.5432 12.543 12.8334 12.185 12.8334H1.81465C1.45669 12.8334 1.1665 12.5432 1.1665 12.1852V1.81484C1.1665 1.45687 1.45669 1.16669 1.81465 1.16669H12.185ZM11.6665 2.33335H2.33317V11.6667H11.6665V2.33335ZM4.37484 5.83335C4.53592 5.83335 4.6665 5.96394 4.6665 6.12502V10.2084C4.6665 10.3694 4.53592 10.5 4.37484 10.5H3.7915C3.63042 10.5 3.49984 10.3694 3.49984 10.2084V6.12502C3.49984 5.96394 3.63042 5.83335 3.7915 5.83335H4.37484ZM6.70817 4.08335C6.86925 4.08335 6.99984 4.21394 6.99984 4.37502V10.2084C6.99984 10.3694 6.86925 10.5 6.70817 10.5H6.12484C5.96375 10.5 5.83317 10.3694 5.83317 10.2084V4.37502C5.83317 4.21394 5.96375 4.08335 6.12484 4.08335H6.70817ZM9.0415 7.58335C9.20259 7.58335 9.33317 7.71394 9.33317 7.87502V10.2084C9.33317 10.3694 9.20259 10.5 9.0415 10.5H8.45817C8.29709 10.5 8.1665 10.3694 8.1665 10.2084V7.87502C8.1665 7.71394 8.29709 7.58335 8.45817 7.58335H9.0415Z"
                                fill="currentColor"
                              />
                            </g>
                            <defs>
                              <clipPath id="clip0_240_12373">
                                <rect width="14" height="14" fill="white" />
                              </clipPath>
                            </defs>
                          </svg>
                        </span>
                        <span className="composer-quick-chip-label">图表</span>
                      </button>
                      {!chartShortcutActive && (
                        <div className={`composer-chart-dropdown ${chartMenuOpen ? 'open' : ''}`}>
                          {chartTypeShortcuts.map((shortcut) => (
                            <button
                              key={shortcut.label}
                              type="button"
                              className="composer-chart-dropdown-item"
                              onClick={() => {
                                setUserInput('');
                                setChartShortcutActive(shortcut.label);
                                if (shortcut.label === '折线图') {
                                  setChartOverlayOpen(true);
                                } else {
                                  setChartOverlayOpen(false);
                                }
                                setAttachmentMenuOpen(false);
                                setChartMenuOpen(false);
                                composerTextareaRef.current?.focus();
                              }}
                              disabled={loading}
                            >
                              <span className="composer-chart-dropdown-icon" aria-hidden="true">
                                {chartShortcutIcons[shortcut.label]}
                              </span>
                              <span className="composer-chart-dropdown-label">{shortcut.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div
                      className="composer-component-dropdown-wrap"
                      ref={quickComponentDropdownRef}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="composer-quick-chip composer-quick-chip-btn"
                        onClick={() => {
                          setChartPromptMode(false);
                          setChartShortcutActive(null);
                          setAttachmentMenuOpen(false);
                          setChartMenuOpen(false);
                          setQuickComponentMenuOpen((prev) => !prev);
                          composerTextareaRef.current?.focus();
                        }}
                        disabled={loading}
                      >
                        <span className="composer-quick-chip-label">快速组件</span>
                      </button>
                      <div
                        className={`composer-component-dropdown ${quickComponentMenuOpen ? 'open' : ''}`}
                        onMouseLeave={() => setQuickComponentActiveCategory(null)}
                        ref={quickComponentMenuRef}
                        style={{
                          left: (quickComponentDropdownRef.current?.getBoundingClientRect().left || 0),
                          bottom: window.innerHeight - (quickComponentDropdownRef.current?.getBoundingClientRect().top || 0) + 6,
                          top: 'auto'
                        }}
                      >
                        <div className="composer-component-dropdown-list">
                          {quickComponentGroups.map((group) => (
                            <div key={group.category} className="composer-component-group">
                              <button
                                type="button"
                                className="composer-component-group-title"
                                onMouseEnter={(event) => {
                                  const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                  setQuickComponentActiveCategory(group.category);
                                  setQuickComponentSubmenuStyle({
                                    left: rect.left - 6,
                                    bottom: window.innerHeight - rect.bottom,
                                    top: 'auto',
                                    transform: 'translateX(-100%)'
                                  });
                                }}
                              >
                                <span>{group.category}</span>
                                <span className="composer-component-group-arrow">›</span>
                              </button>
                            </div>
                          ))}
                        </div>
                        {quickComponentActiveGroup && (
                          <div className="composer-component-submenu" style={quickComponentSubmenuStyle}>
                            {quickComponentActiveGroup.items.map((item) => (
                              <button
                                key={item.token}
                                type="button"
                                className="composer-component-item"
                                onClick={async () => {
                                  setAttachmentError(null);
                                  setQuickComponentMenuOpen(false);
                                  setAttachmentMenuOpen(false);
                                  composerTextareaRef.current?.focus();
                                  try {
                                    await createComponentNode({
                                      componentId: 'figma-component',
                                      params: { componentToken: item.token }
                                    });
                                  } catch (error) {
                                    setAttachmentError(`快速组件插入失败：${String(error)}`);
                                  }
                                }}
                                disabled={loading}
                              >
                                <span className="composer-component-item-zh">{item.zh}</span>
                                <span className="composer-component-item-divider">/</span>
                                <span className="composer-component-item-en">{item.en}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                  </div>
                  <Tooltip content={loading ? '停止生成' : '发送'} enabled={loading || canSend} placement="top">
                    <div className="composer-send-wrap">
                      <button
                        className="composer-send"
                        onClick={loading ? stopGeneration : onSend}
                        disabled={!loading && !canSend}
                      >
                      {loading ? (
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="6" y="6" width="8" height="8" rx="2" fill="white" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 16V5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                          <path d="M6 9L10 5L14 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      </button>
                    </div>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'selection' ? (
        renderSelectionPage()
      ) : (
        renderDocs()
      )}
      {chartOverlayOpen && (
        <div className="chart-overlay">
          <div className="chart-overlay-backdrop" onClick={() => setChartOverlayOpen(false)} />
          <div className="chart-overlay-panel">
            <div className="chart-overlay-header">
              <div className="chart-overlay-title">AI Chart</div>
              <button
                type="button"
                className="chart-overlay-close"
                onClick={() => setChartOverlayOpen(false)}
              >
                ×
              </button>
            </div>
            <iframe className="chart-overlay-iframe" srcDoc={chartUiHtml} title="AI Chart" />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
