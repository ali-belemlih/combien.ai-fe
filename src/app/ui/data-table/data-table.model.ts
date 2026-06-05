export type FilterMode = 'contains' | 'startsWith' | 'notContains' | 'endsWith' | 'equals';

export interface TableColumn {
  key: string;
  label: string;
  filterable?: boolean;
  filterMode?: 'simple' | 'advanced';
  sortable?: boolean;
  class?: string;
}

export interface SimpleFilter {
  [key: string]: string;
}

export interface AdvancedFilter {
  [key: string]: { value: string; mode: FilterMode };
}

export const FILTER_MODES: { label: string; value: FilterMode }[] = [
  { label: 'Contient',        value: 'contains'    },
  { label: 'Commence par',    value: 'startsWith'  },
  { label: 'Ne contient pas', value: 'notContains' },
  { label: 'Finit par',       value: 'endsWith'    },
  { label: 'Égal à',          value: 'equals'      },
];
