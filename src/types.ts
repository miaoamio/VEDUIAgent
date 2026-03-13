export interface ComponentInstance {
  id: string; // Unique instance ID
  componentId: string; // Reference to ComponentDefinition.id
  params: { [key: string]: any };
  children?: ComponentInstance[];
}
