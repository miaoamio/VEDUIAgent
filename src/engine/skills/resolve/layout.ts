export function setFillWidth(node: SceneNode) {
  if (node.parent && 'layoutMode' in node.parent && node.parent.layoutMode === 'VERTICAL') {
    // 父容器是纵向时，水平撑满用 layoutAlign = 'STRETCH'
    if ('layoutAlign' in node) {
      node.layoutAlign = 'STRETCH';
    }
    if ('layoutGrow' in node) {
      node.layoutGrow = 0; // 纵向父容器中，layoutGrow = 1 会导致垂直方向被撑开
    }
  } else {
    // 父容器是横向时，水平撑满用 layoutGrow = 1
    if ('layoutGrow' in node) {
      node.layoutGrow = 1;
    }
    if ('layoutAlign' in node) {
      node.layoutAlign = 'STRETCH';
    }
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
  if ('layoutGrow' in node) {
    try {
      node.layoutGrow = 0;
    } catch {}
  }
  if ('layoutSizingHorizontal' in node) {
    try {
      (node as any).layoutSizingHorizontal = 'FIXED';
    } catch {
    }
  }
  if ('resize' in node) {
    try {
      const height = 'height' in node ? node.height : (node as any).height;
      (node as any).resize(width, height);
    } catch {
    }
  }
}

export function setFillWidthPreserveHeight(node: SceneNode) {
  const parent = node.parent;
  if (parent && 'layoutMode' in parent && parent.layoutMode === 'HORIZONTAL') {
    if ('layoutGrow' in node) {
      node.layoutGrow = 1;
    }
    if ('layoutAlign' in node) {
      node.layoutAlign = 'INHERIT';
    }
  } else {
    setFillWidth(node);
  }
  if ('layoutSizingHorizontal' in node) {
    try {
      (node as any).layoutSizingHorizontal = 'FILL';
    } catch {
    }
  }
}
