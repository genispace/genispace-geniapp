import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from '@genispace/shared-utils'
import { Z_INDEX_CLASSES } from '../../styles/z-index-layers'

function usePopoverBackgroundColor() {
  const [backgroundColor, setBackgroundColor] = React.useState<string>('hsl(0 0% 100%)');

  React.useEffect(() => {
    const updateBackgroundColor = () => {
      if (typeof window === 'undefined') return;

      const root = document.documentElement;
      const popoverValue = getComputedStyle(root).getPropertyValue('--popover').trim();
      const isDark = root.classList.contains('dark');

      if (popoverValue) {
        setBackgroundColor(`hsl(${popoverValue})`);
      } else {

        setBackgroundColor(isDark ? 'hsl(0 0% 3.9%)' : 'hsl(0 0% 100%)');
      }
    };

    updateBackgroundColor();

    const observer = new MutationObserver(updateBackgroundColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return backgroundColor;
}

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, style, ...props }, ref) => {
  const backgroundColor = usePopoverBackgroundColor();

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          `${Z_INDEX_CLASSES.OVERLAY_POPOVER} w-72 rounded-md border p-4 shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]`,
          "text-popover-foreground border-border",
          className
        )}
        style={{
          backgroundColor,
          ...style,
        }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
