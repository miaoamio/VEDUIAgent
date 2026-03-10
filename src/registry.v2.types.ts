import type { ComponentDefinition } from "./types";

export const REGISTRY_V2_VERSION = "2.0" as const;

export type RegistryVersion = typeof REGISTRY_V2_VERSION;

export type ComponentCategory = "Layout" | "Basic" | "Form" | "Table" | "Data" | "Other";

export type ParamType =
  | "string"
  | "number"
  | "boolean"
  | "color"
  | "select"
  | "enum"
  | "object"
  | "array";

export interface ParamDefinitionV2 {
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

export interface SlotDefinitionV2 {
  displayName?: string;
  allowedComponents: string[];
  required?: boolean;
  minItems?: number;
  maxItems?: number;
  ordered?: boolean;
}

export type ConstraintDefinitionV2 =
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

export interface CapabilityDefinitionV2 {
  allowChildren?: boolean;
  allowSwapVariant?: boolean;
  allowSetProps?: boolean;
  allowSetLayout?: boolean;
  allowSetStyle?: boolean;
  allowBindData?: boolean;
  allowRemove?: boolean;
}

export interface FigmaBindingV2 {
  nodeType?: "FRAME" | "TEXT" | "INSTANCE" | "GROUP";
  renderKey?: string;
  preferredLayoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE";
  styleMapper?: string;
  propMapper?: string;
}

export interface FigmaPropertyDefinitionV2 {
  propertyName: string;
  displayName?: string;
  type: string;
  defaultValue?: string | boolean;
  options?: string[];
}

export interface FigmaPropertySnapshotV2 {
  token?: string;
  componentKey: string;
  inspectedAt: string;
  source: "discover_component_props";
  properties: FigmaPropertyDefinitionV2[];
}

export interface ColorVariableBindingV2 {
  enabled: boolean;
  token?: string;
  variableRef?: string;
  keyCandidates?: string[];
  idCandidates?: string[];
  nameCandidates?: string[];
}

export interface TypographyBindingV2 {
  enabled: boolean;
  token?: string;
  textStyleRef?: string;
  keyCandidates?: string[];
  idCandidates?: string[];
  nameCandidates?: string[];
}

export interface MigrationRuleV2 {
  fromVersion: string;
  toVersion: string;
  description?: string;
  renameParams?: Record<string, string>;
  dropParams?: string[];
  defaults?: Record<string, unknown>;
}

export interface ComponentDefinitionV2 {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  schemaVersion: string;
  family?: string;
  tags?: string[];
  prompts?: {
    description: string;
    usage?: string;
    examples?: string[];
  };
  params: Record<string, ParamDefinitionV2>;
  slots?: Record<string, SlotDefinitionV2>;
  constraints?: ConstraintDefinitionV2[];
  capabilities?: CapabilityDefinitionV2;
  figmaBinding?: FigmaBindingV2;
  figmaPropertySnapshot?: FigmaPropertySnapshotV2;
  colorVariableBindings?: Record<string, ColorVariableBindingV2>;
  typographyBindings?: Record<string, TypographyBindingV2>;
  migrations?: MigrationRuleV2[];
}

export interface ComponentRegistryV2 {
  version: RegistryVersion;
  components: Record<string, ComponentDefinitionV2>;
  meta?: {
    updatedAt?: string;
    owner?: string;
    description?: string;
  };
}

export type LegacyRegistryV1 = Record<string, ComponentDefinition>;

export const DEFAULT_CAPABILITIES_V2: Required<CapabilityDefinitionV2> = {
  allowChildren: true,
  allowSwapVariant: false,
  allowSetProps: true,
  allowSetLayout: true,
  allowSetStyle: true,
  allowBindData: false,
  allowRemove: true
};
