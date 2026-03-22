export function setFillWidth(node: SceneNode) {
  if ('layoutGrow' in node) {
    node.layoutGrow = 1;
  }
  if ('layoutAlign' in node) {
    node.layoutAlign = 'STRETCH';
  }
  if ('layoutSizingHorizontal' in node) {
    try {
      (node as any).layoutSizingHorizontal = 'FILL';
    } catch {
    }
  }
}

export function setFixedWidth(node: SceneNode, width: number) {
  if (!Number.isFinite(width) || width <= 0) return;
  if ('resize' in node) {
    try {
      const height = 'height' in node ? node.height : (node as any).height;
      (node as any).resize(width, height);
    } catch {
    }
  }
  if ('layoutGrow' in node) {
    node.layoutGrow = 0;
  }
  if ('layoutSizingHorizontal' in node) {
    try {
      (node as any).layoutSizingHorizontal = 'FIXED';
    } catch {
    }
  }
}
