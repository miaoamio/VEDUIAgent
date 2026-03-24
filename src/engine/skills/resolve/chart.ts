import type { ComponentDefinition } from "../../../registry.types";
import {
  createFigmaComponentInstanceFromRef,
  resolveComponentKeyFromToken
} from "../../../figmaComponent";
import { buildSnapshotDrivenCriteria } from "./figma-component";

export async function renderChartInstance(options: {
  definition: ComponentDefinition;
  params: Record<string, any>;
}): Promise<InstanceNode> {
  const { definition, params } = options;
  const snapshot = (definition as any).figmaPropertySnapshot as any;
  const token = typeof snapshot?.token === "string" ? snapshot.token.trim() : "";
  const componentKey =
    (token ? resolveComponentKeyFromToken(token) : "") || String(snapshot?.componentKey || "").trim();
  if (!componentKey) {
    throw new Error(`Missing componentKey for chart '${definition.id}'`);
  }
  const fallbackName = snapshot?.componentSetName || definition.name;
  const { variantCriteria, booleanProps } = buildSnapshotDrivenCriteria({ params, snapshot });
  const instance = await createFigmaComponentInstanceFromRef({
    componentKey,
    componentToken: token,
    fallbackName,
    variantCriteria
  });
  if (Object.keys(booleanProps).length > 0) {
    try {
      instance.setProperties(booleanProps);
    } catch (e) {
      console.warn("[Render] setProperties failed", e);
    }
  }
  const height = Number(params.height);
  if (Number.isFinite(height) && height > 0) {
    instance.resize(instance.width, height);
  }
  return instance;
}
