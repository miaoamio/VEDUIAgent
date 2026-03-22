/**
 * block.helpers.ts — Layer 0: Utils / Helpers
 *
 * 共用工具函数，供多个 Skill（table、form、chart、tab）调用。
 * 不暴露给 AI，不调用 Figma API，不硬编码数字或颜色。
 */

export const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null;

export const getBlockSource = (payload: any): any | null => {
  const source = isObject(payload?.block) ? payload.block : payload;
  return isObject(source) ? source : null;
};

export const getBlockBody = (source: any): any => {
  return isObject(source?.body) ? source.body : source;
};

export const resolveBlockContainerMeta = (
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

export const toButtonFromItem = (
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

export const buildHeaderSectionChildren = (header: any): any[] => {
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
