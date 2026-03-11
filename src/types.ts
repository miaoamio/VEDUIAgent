export interface ComponentParam {
  type: 'string' | 'number' | 'boolean' | 'color' | 'select';
  default: any;
  options?: string[]; // For select type
  description: string;
  uiRole?: 'editable' | 'generation-only';
}

export interface ColorVariableBindingSpec {
  enabled: boolean; // false = do not bind variable, fallback to raw color
  token?: string; // Logical token name resolved by theme token pack
  variableRef?: string; // Variable key/id hint used for import
  keyCandidates?: string[]; // Additional variable key candidates
  idCandidates?: string[]; // VariableID candidates
  nameCandidates?: string[]; // Local variable name candidates
}

export interface TypographyBindingSpec {
  enabled: boolean; // false = do not bind text style, fallback to raw font settings
  token?: string; // Logical typography token name resolved by theme token pack
  textStyleRef?: string; // TextStyle key/id hint used for import
  keyCandidates?: string[]; // Additional text style key candidates
  idCandidates?: string[]; // TextStyle id candidates
  nameCandidates?: string[]; // Local text style name candidates
}

export interface FigmaPropertyDefinitionSpec {
  propertyName: string;
  displayName?: string;
  type: string;
  defaultValue?: string | boolean;
  options?: string[];
}

export interface FigmaPropertySnapshotSpec {
  token?: string;
  componentKey: string;
  inspectedAt: string;
  source: 'discover_component_props';
  properties: FigmaPropertyDefinitionSpec[];
}

export interface ComponentDefinition {
  id: string; // e.g., "circle", "row"
  name: string;
  category?: string; // e.g. "Layout", "Form", "Table"
  family?: string; // e.g. "table-cell" - components in the same family can be swapped
  description: string;
  agentPrompt?: string; // Prompt instruction for the agent
  examples?: string[]; // Example usages for the agent
  params: { [key: string]: ComponentParam };
  allowedChildren?: string[]; // List of component IDs that can be nested inside
  variableBindings?: { [semanticKey: string]: ColorVariableBindingSpec }; // Color-token binding declared in spec
  typographyBindings?: { [semanticKey: string]: TypographyBindingSpec }; // Typography-token binding declared in spec
  figmaPropertySnapshot?: FigmaPropertySnapshotSpec; // Discovered Figma component properties for spec maintenance
}

export interface ComponentInstance {
  id: string; // Unique instance ID
  componentId: string; // Reference to ComponentDefinition.id
  params: { [key: string]: any };
  children?: ComponentInstance[];
}
