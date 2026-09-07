/** Catalog of draft table / chart kinds for the studio toolbox. */

export type TableKindCategory =
  | 'tables'
  | 'comparison'
  | 'trends'
  | 'composition'
  | 'distribution';

export interface TableKindOption {
  id: string;
  label: string;
  category: TableKindCategory;
  /** true = render as chart from numeric cells; false = HTML table */
  isChart: boolean;
  description: string;
}

export const TABLE_KIND_OPTIONS: TableKindOption[] = [
  {
    id: 'data',
    label: 'Data table',
    category: 'tables',
    isChart: false,
    description: 'Exact numbers organized in rows and columns.',
  },
  {
    id: 'summary',
    label: 'Summary table',
    category: 'tables',
    isChart: false,
    description: 'Totals, averages, or high-level rollups.',
  },
  {
    id: 'frequency',
    label: 'Frequency table',
    category: 'tables',
    isChart: false,
    description: 'Counts how often an event or answer happens.',
  },
  {
    id: 'crosstab',
    label: 'Cross-tabulation',
    category: 'tables',
    isChart: false,
    description: 'Compare two or more variables at once.',
  },
  {
    id: 'bar',
    label: 'Bar chart',
    category: 'comparison',
    isChart: true,
    description: 'Compare items with horizontal bars.',
  },
  {
    id: 'column',
    label: 'Column chart',
    category: 'comparison',
    isChart: true,
    description: 'Compare items with vertical columns.',
  },
  {
    id: 'radar',
    label: 'Radar chart',
    category: 'comparison',
    isChart: true,
    description: 'Compare items across several features.',
  },
  {
    id: 'line',
    label: 'Line chart',
    category: 'trends',
    isChart: true,
    description: 'Connect points to show change over time.',
  },
  {
    id: 'area',
    label: 'Area chart',
    category: 'trends',
    isChart: true,
    description: 'Filled area under a trend line.',
  },
  {
    id: 'pie',
    label: 'Pie chart',
    category: 'composition',
    isChart: true,
    description: 'Parts of a whole (best with ≤6 slices).',
  },
  {
    id: 'donut',
    label: 'Donut chart',
    category: 'composition',
    isChart: true,
    description: 'Pie chart with a center hole.',
  },
  {
    id: 'stacked-bar',
    label: 'Stacked bar',
    category: 'composition',
    isChart: true,
    description: 'Sub-parts stacked into one bar per category.',
  },
  {
    id: 'histogram',
    label: 'Histogram',
    category: 'distribution',
    isChart: true,
    description: 'How values group into numerical ranges.',
  },
  {
    id: 'scatter',
    label: 'Scatter plot',
    category: 'distribution',
    isChart: true,
    description: 'Dots showing how two variables relate.',
  },
  {
    id: 'box',
    label: 'Box plot',
    category: 'distribution',
    isChart: true,
    description: 'Spread, middle, and outer limits of a set.',
  },
];

export const TABLE_KIND_CATEGORIES: {
  id: TableKindCategory;
  label: string;
}[] = [
  { id: 'tables', label: 'Essential tables' },
  { id: 'comparison', label: 'Charts for comparisons' },
  { id: 'trends', label: 'Charts for trends' },
  { id: 'composition', label: 'Charts for composition' },
  { id: 'distribution', label: 'Charts for distribution' },
];

const ALIASES: Record<string, string> = {
  data: 'data',
  table: 'data',
  comparison: 'data',
  summary: 'summary',
  totals: 'summary',
  frequency: 'frequency',
  freq: 'frequency',
  crosstab: 'crosstab',
  'cross-tab': 'crosstab',
  'cross-tabulation': 'crosstab',
  bar: 'bar',
  'bar-chart': 'bar',
  column: 'column',
  'column-chart': 'column',
  radar: 'radar',
  spider: 'radar',
  line: 'line',
  'line-chart': 'line',
  area: 'area',
  'area-chart': 'area',
  pie: 'pie',
  'pie-chart': 'pie',
  donut: 'donut',
  doughnut: 'donut',
  'stacked-bar': 'stacked-bar',
  stacked: 'stacked-bar',
  histogram: 'histogram',
  scatter: 'scatter',
  'scatter-plot': 'scatter',
  box: 'box',
  'box-plot': 'box',
};

export function normalizeTableKind(raw?: string): string {
  const key = (raw || '').trim().toLowerCase();
  if (!key) return 'data';
  return ALIASES[key] || (TABLE_KIND_OPTIONS.some((o) => o.id === key) ? key : 'data');
}

export function getTableKindOption(raw?: string): TableKindOption {
  const id = normalizeTableKind(raw);
  return (
    TABLE_KIND_OPTIONS.find((o) => o.id === id) || TABLE_KIND_OPTIONS[0]
  );
}

export function tableKindLabel(raw?: string): string {
  return getTableKindOption(raw).label;
}
