import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@genispace/geniapp/kit';

export function DatasourceReadonlyTable({
  title,
  hint,
  rows,
  columns,
  emptyLabel,
}: {
  title: string;
  hint?: string;
  rows: Record<string, unknown>[];
  columns: Array<{ key: string; label: string; format?: (v: unknown) => string }>;
  emptyLabel?: string;
}) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          {hint ? <CardDescription>{hint}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {emptyLabel ?? t('datasourceInsight.empty', 'No rows from managed datasource (install GeniApp 1.0.1+).')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {hint ? <CardDescription>{hint}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.key}>{c.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c.key}>
                      {c.format ? c.format(row[c.key]) : String(row[c.key] ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
