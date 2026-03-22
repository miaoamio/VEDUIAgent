export type ComponentCategory = "Layout" | "Basic" | "Form" | "Table" | "Data" | "Icon" | "Other";

export type ParamType =
  | "string"
  | "number"
  | "boolean"
  | "color"
  | "select"
  | "segmented"
  | "enum"
  | "object"
  | "array";

export interface ParamDefinition {
  type: ParamType;
  default: unknown;
  description: string;
  required?: boolean;
  enumValues?: string[];
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  ui?: {
    control?: "input" | "textarea" | "switch" | "color" | "select";
    group?: string;
    order?: number;
  };
}

export interface SlotDefinition {
  displayName?: string;
  allowedComponents: string[];
  required?: boolean;
  minItems?: number;
  maxItems?: number;
  ordered?: boolean;
}

export type ConstraintDefinition =
  | { type: "forbid_children"; components: string[] }
  | { type: "require_slot"; slot: string }
  | { type: "mutually_exclusive_params"; params: string[] }
  | {
      type: "requires_param_when";
      whenParam: string;
      whenValue: unknown;
      requiredParam: string;
    }
  | { type: "max_depth"; value: number }
  | { type: "custom"; key: string; payload?: Record<string, unknown> };

export interface CapabilityDefinition {
  allowChildren?: boolean;
  allowSwapVariant?: boolean;
  allowSetProps?: boolean;
  allowSetLayout?: boolean;
  allowSetStyle?: boolean;
  allowBindData?: boolean;
  allowRemove?: boolean;
}

export interface FigmaBinding {
  nodeType?: "FRAME" | "TEXT" | "INSTANCE" | "GROUP";
  renderKey?: string;
  preferredLayoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE";
  styleMapper?: string;
  propMapper?: string;
}

export interface FigmaPropertyDefinition {
  propertyName: string;
  displayName?: string;
  type: string;
  defaultValue?: string | boolean;
  options?: string[];
}

export interface FigmaPropertySnapshot {
  token?: string;
  componentKey: string;
  inspectedAt: string;
  source: "discover_component_props" | "inspect_live_instance";
  sourceNodeId?: string;
  sourceNodeType?: "COMPONENT" | "COMPONENT_SET";
  componentName?: string;
  componentSetName?: string;
  properties: FigmaPropertyDefinition[];
}

export type FigmaPropertySnapshotCatalog = Record<string, FigmaPropertySnapshot>;

export interface ColorVariableBinding {
  enabled: boolean;
  token?: string;
  variableRef?: string;
  keyCandidates?: string[];
  idCandidates?: string[];
  nameCandidates?: string[];
}

export interface TypographyBinding {
  enabled: boolean;
  token?: string;
  textStyleRef?: string;
  keyCandidates?: string[];
  idCandidates?: string[];
  nameCandidates?: string[];
}

export interface SizeMetricDefinition {
  height: number;
  paddingX: number;
  paddingY: number;
  fontSize: number;
  cornerRadius: number;
  lineHeight?: number;
  gap?: number;
  iconSize?: number;
  dotSize?: number;
  glyphSize?: number;
}

export interface ComponentRuntimeDefinition {
  sizeMetrics?: Record<string, SizeMetricDefinition>;
  sizeMetricsRef?: string;
  spacing?: Record<string, number>;
  fallback?: {
    width?: number;
    height?: number;
  };
}

export interface RenderNotes {
  actionHint?: string;
  paramRules?: string[];
  commonErrors?: string[];
  agentHints?: string[];
}

export interface MigrationRule {
  fromVersion: string;
  toVersion: string;
  description?: string;
  renameParams?: Record<string, string>;
  dropParams?: string[];
  defaults?: Record<string, unknown>;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  isRebuilt?: boolean;
  schemaVersion: string;
  family?: string;
  tags?: string[];
  prompts?: {
    description: string;
    usage?: string;
    examples?: string[];
  };
  params: Record<string, ParamDefinition>;
  slots?: Record<string, SlotDefinition>;
  constraints?: ConstraintDefinition[];
  capabilities?: CapabilityDefinition;
  figmaBinding?: FigmaBinding;
  figmaPropertySnapshot?: FigmaPropertySnapshot;
  figmaPropertySnapshotCatalog?: FigmaPropertySnapshotCatalog;
  colorVariableBindings?: Record<string, ColorVariableBinding>;
  typographyBindings?: Record<string, TypographyBinding>;
  runtime?: ComponentRuntimeDefinition;
  renderNotes?: RenderNotes;
  migrations?: MigrationRule[];
}

export interface ComponentRegistry {
  components: Record<string, ComponentDefinition>;
  meta?: {
    updatedAt?: string;
    owner?: string;
    description?: string;
  };
}

export const DEFAULT_CAPABILITIES: Required<CapabilityDefinition> = {
  allowChildren: true,
  allowSwapVariant: false,
  allowSetProps: true,
  allowSetLayout: true,
  allowSetStyle: true,
  allowBindData: false,
  allowRemove: true
};
