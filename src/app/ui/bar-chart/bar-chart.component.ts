import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartBar } from '../../models/operator.model';

@Component({
  selector: 'ui-bar-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bar-chart.component.html',
  styleUrl: './bar-chart.component.scss',
})
export class BarChartComponent implements OnChanges {
  @Input() bars: ChartBar[] = [];
  @Input() title = '';
  @Input() unit = '';

  legend: { label: string; color: string }[] = [];

  ngOnChanges(): void {
    // Construire la légende à partir des couleurs uniques
    const seen = new Map<string, string>();
    for (const bar of this.bars) {
      // Extraire le nom de l'opérateur (avant le "·")
      const opName = bar.label.split('·')[0].trim();
      if (!seen.has(bar.color)) {
        seen.set(bar.color, opName);
      }
    }
    this.legend = Array.from(seen.entries()).map(([color, label]) => ({ color, label }));
  }

  getPercent(value: number): number {
    const max = Math.max(...this.bars.map(b => b.value), 1);
    return Math.max((value / max) * 100, 2);
  }
}
