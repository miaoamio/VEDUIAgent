import type { ComponentRegistry } from "./registry.types";
import { layoutComponents } from "./registry/components/layout";
import { tableComponents } from "./registry/components/table";
import { basicComponents } from "./registry/components/basic";
import { iconComponents } from "./registry/components/icon";
import { formComponents } from "./registry/components/form";
import { inputComponents } from "./registry/components/input";

export const COMPONENT_REGISTRY: ComponentRegistry = {
  components: {
    ...layoutComponents,
    ...tableComponents,
    ...basicComponents,
    ...iconComponents,
    ...formComponents,
    ...inputComponents
  }
};
