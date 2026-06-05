import {
  Component, Input, Output, EventEmitter, OnInit,
  ContentChild, TemplateRef, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TableColumn, SimpleFilter, AdvancedFilter,
  FilterMode, FILTER_MODES,
} from './data-table.model';

@Component({
  selector: 'ui-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent implements OnInit {
  @Input() columns: TableColumn[] = [];
  @Input() rows: any[] = [];
  @Input() loading = false;
  @Input() emptyMessage = 'Aucune donnée disponible.';
  @Input() trackByKey = 'id';

  @Input() filterType: 'simple' | 'advanced' = 'simple';

  @Output() filtersChange = new EventEmitter<SimpleFilter | AdvancedFilter>();

  @ContentChild('rowTemplate') rowTemplate!: TemplateRef<any>;

  readonly filterModes = FILTER_MODES;

  simpleFilters: SimpleFilter = {};
  advancedFilters: AdvancedFilter = {};

  openPopover: string | null = null;

  get activeFiltersCount(): number {
    if (this.filterType === 'simple') {
      return Object.values(this.simpleFilters).filter(v => !!v).length;
    }
    return Object.values(this.advancedFilters).filter(f => !!f.value).length;
  }

  get filteredRows(): any[] {
    return this.rows.filter(row => {
      return this.columns.every(col => {
        if (!col.filterable) return true;
        const cellValue = row[col.key];
        if (this.filterType === 'simple') {
          const filter = this.simpleFilters[col.key] ?? '';
          if (!filter) return true;
          return String(cellValue ?? '').toLowerCase().includes(filter.toLowerCase());
        } else {
          const filter = this.advancedFilters[col.key];
          if (!filter?.value) return true;
          return this.matchAdvanced(cellValue, filter);
        }
      });
    });
  }

  ngOnInit(): void {
    this.columns.forEach(col => {
      if (!col.filterable) return;
      if (this.filterType === 'simple') {
        this.simpleFilters[col.key] = '';
      } else {
        this.advancedFilters[col.key] = { value: '', mode: 'contains' };
      }
    });
  }

  togglePopover(key: string, event: Event): void {
    event.stopPropagation();
    this.openPopover = this.openPopover === key ? null : key;
  }

  clearFilter(key: string): void {
    if (this.filterType === 'simple') {
      this.simpleFilters[key] = '';
    } else {
      this.advancedFilters[key] = { value: '', mode: 'contains' };
    }
    this.openPopover = null;
    this._emitFilters();
  }

  clearAllFilters(): void {
    this.columns.forEach(col => {
      if (!col.filterable) return;
      if (this.filterType === 'simple') {
        this.simpleFilters[col.key] = '';
      } else {
        this.advancedFilters[col.key] = { value: '', mode: 'contains' };
      }
    });
    this.openPopover = null;
    this._emitFilters();
  }

  applyFilter(): void {
    this.openPopover = null;
    this._emitFilters();
  }

  isFilterActive(key: string): boolean {
    if (this.filterType === 'simple') return !!this.simpleFilters[key];
    return !!this.advancedFilters[key]?.value;
  }

  trackRow(_index: number, row: any): any {
    return row[this.trackByKey] ?? _index;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openPopover = null;
  }

  private matchAdvanced(val: any, filter: { value: string; mode: FilterMode }): boolean {
    const s = String(val ?? '').toLowerCase();
    const f = filter.value.toLowerCase();
    switch (filter.mode) {
      case 'contains':    return s.includes(f);
      case 'startsWith':  return s.startsWith(f);
      case 'notContains': return !s.includes(f);
      case 'endsWith':    return s.endsWith(f);
      case 'equals':      return s === f;
    }
  }

  private _emitFilters(): void {
    this.filtersChange.emit(
      this.filterType === 'simple' ? { ...this.simpleFilters } : { ...this.advancedFilters }
    );
  }
}
