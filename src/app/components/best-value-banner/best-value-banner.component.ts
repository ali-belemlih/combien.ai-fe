import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BestValue } from '../../models/operator.model';

@Component({
  selector: 'app-best-value-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './best-value-banner.component.html',
  styleUrl: './best-value-banner.component.scss',
})
export class BestValueBannerComponent {
  @Input() bestValue: BestValue | null = null;

  get dataLabel(): string {
    if (!this.bestValue) return '';
    const mo = this.bestValue.plan.data;
    if (mo >= 1000) {
      const go = mo / 1000;
      return `${go % 1 === 0 ? go : go.toFixed(1)} Go`;
    }
    return `${mo} Mo`;
  }
}
