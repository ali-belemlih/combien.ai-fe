import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiItem } from './kpi-grid.model';

@Component({
  selector: 'ui-kpi-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-grid.component.html',
  styleUrl: './kpi-grid.component.scss',
})
export class KpiGridComponent {
  @Input() items: (KpiItem | null)[] = [];

  get visibleItems(): KpiItem[] {
    return this.items.filter((item): item is KpiItem => item !== null);
  }
}
