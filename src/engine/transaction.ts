import type { TransactionLike, UndoAction } from "./types";

type ParentContainer = BaseNode & ChildrenMixin;

function isParentContainer(node: BaseNode | null): node is ParentContainer {
  return Boolean(node && typeof (node as ParentContainer).appendChild === "function");
}

export interface NodePositionSnapshot {
  parent: ParentContainer | null;
  index: number;
}

export function captureNodePosition(node: SceneNode): NodePositionSnapshot {
  if (!isParentContainer(node.parent)) {
    return { parent: null, index: -1 };
  }

  return {
    parent: node.parent,
    index: node.parent.children.indexOf(node)
  };
}

export class EngineTransaction implements TransactionLike {
  private undoStack: UndoAction[] = [];

  pushUndo(action: UndoAction): void {
    this.undoStack.push(action);
  }

  async rollback(): Promise<void> {
    for (let i = this.undoStack.length - 1; i >= 0; i -= 1) {
      await this.undoStack[i]();
    }
    this.undoStack = [];
  }

  clear(): void {
    this.undoStack = [];
  }
}
