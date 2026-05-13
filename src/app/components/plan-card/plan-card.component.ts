import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { Plan } from '../../models/operator.model';

@Component({
  selector: 'app-plan-card',
  standalone: true,
  imports: [CommonModule, CardModule, TagModule],
  templateUrl: './plan-card.component.html',
  styleUrl: './plan-card.component.scss',
})
export class PlanCardComponent {
  @Input() plan: Plan | null = null;
  @Input() operatorColor: string = '#000';
  @Input() isCheaper: boolean = false;
  @Input() isMoreExpensive: boolean = false;

  get badgeLabel(): string {
    if (this.isCheaper) return '✅ Moins cher';
    if (this.isMoreExpensive) return '❌ Plus cher';
    return '➖ Même prix';
  }

  get badgeClass(): string {
    if (this.isCheaper) return 'badge--cheaper';
    if (this.isMoreExpensive) return 'badge--expensive';
    return 'badge--equal';
  }

  /** Ratio Mo par FCFA, arrondi à 2 décimales */
  get ratio(): string {
    if (!this.plan || this.plan.price === 0) return '—';
    return (this.plan.data / this.plan.price).toFixed(2);
  }
}
