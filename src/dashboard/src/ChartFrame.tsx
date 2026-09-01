import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@genispace/geniapp/kit';

export interface ChartFrameProps {
  title: ReactNode;
  /** Right-aligned header slot (e.g. a legend, a small select, a "view all" link). */
  actions?: ReactNode;
  /** Hint under the title. */
  subtitle?: ReactNode;
  /** Fixed chart body height in px (defaults to 280). */
  height?: number;
  children: ReactNode;
  className?: string;
}

/**
 * Consistent Card frame for a dashboard chart. Wrap a recharts
 * `<ResponsiveContainer width="100%" height="100%">` as the child.
 */
export function ChartFrame({ title, actions, subtitle, height = 280, children, className }: ChartFrameProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent>
        <div style={{ height }}>{children}</div>
      </CardContent>
    </Card>
  );
}
