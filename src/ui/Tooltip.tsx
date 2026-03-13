import * as React from 'react';
import {
  FloatingArrow,
  FloatingPortal,
  arrow,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole
} from '@floating-ui/react';

export type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactElement;
  enabled?: boolean;
  placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';
  offsetMainAxis?: number;
};

export const Tooltip = ({
  content,
  children,
  enabled = true,
  placement = 'top',
  offsetMainAxis = 10
}: TooltipProps) => {
  const [open, setOpen] = React.useState(false);
  const arrowRef = React.useRef<SVGSVGElement | null>(null);
  React.useEffect(() => {
    if (!enabled) setOpen(false);
  }, [enabled]);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [
      offset({ mainAxis: offsetMainAxis }),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowRef })
    ]
  });

  const hover = useHover(context, { enabled });
  const focus = useFocus(context, { enabled });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  const childRef = (children as any).ref;
  const mergedRef = useMergeRefs([refs.setReference, childRef]);

  const shouldRender = enabled && open && Boolean(content);

  return (
    <>
      {React.cloneElement(children, getReferenceProps({ ref: mergedRef }))}
      {shouldRender && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps({ className: 'ved-tooltip' })}
          >
            <div className="ved-tooltip-content">{content}</div>
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className="ved-tooltip-arrow"
              width={12}
              height={6}
              tipRadius={1}
              fill="#FFFFFF"
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
