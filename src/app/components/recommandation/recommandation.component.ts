import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompareService } from '../../services/compare.service';
import { OffreAll, UsageType } from '../../models/compare.model';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

interface UsageOption {
  value: UsageType;
  label: string;
  icon: string;
  desc: string;
  color: string;
}

const OP_COLORS: Record<string, string> = {
  moov: '#0066cc', mtn: '#ffcc00', orange: '#ff6600', glo: '#00aa44',
};

function opColor(name: string | null): string {
  if (!name) return '#6c63ff';
  const k = name.toLowerCase();
  for (const [key, color] of Object.entries(OP_COLORS)) {
    if (k.includes(key)) return color;
  }
  return '#6c63ff';
}

@Component({
  selector: 'app-recommandation',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TagModule],
  templateUrl: './recommandation.component.html',
  styleUrl: './recommandation.component.scss',
})
export class RecommandationComponent {
  private readonly svc = inject(CompareService);

  budget = 5000;
  selectedUsage: UsageType = 'internet';
  loading = false;
  error: string | null = null;
  results: OffreAll[] = [];
  hasSearched = false;

  readonly budgetPresets = [500, 1000, 2000, 5000, 10000, 20000];

  readonly usageOptions: UsageOption[] = [
    { value: 'internet', label: 'Internet',  icon: '📶', desc: 'Forfaits data mobile',   color: '#6366f1' },
    { value: 'voix',     label: 'Voix',      icon: '📞', desc: 'Crédit téléphonique',    color: '#10b981' },
    { value: 'roaming',  label: 'Roaming',   icon: '✈️', desc: 'Tarifs à l\'étranger',  color: '#f59e0b' },
  ];

  get selectedOption(): UsageOption {
    return this.usageOptions.find(o => o.value === this.selectedUsage)!;
  }

  setBudget(v: number): void { this.budget = v; }

  search(): void {
    if (!this.budget || this.budget <= 0) return;
    this.loading = true;
    this.error = null;
    this.hasSearched = true;

    this.svc.getBestOffers({ budget: this.budget, usage: this.selectedUsage }).subscribe({
      next: (data) => {
        this.results = data;
        this.loading = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.loading = false;
      },
    });
  }

  getOpColor(name: string | null): string { return opColor(name); }

  getOpLogo(name: string | null): string {
    if (!name) return '📶';
    const k = name.toLowerCase();
    if (k.includes('mtn'))    return '🟡';
    if (k.includes('moov'))   return '🔵';
    if (k.includes('orange')) return '🟠';
    if (k.includes('glo'))    return '🟢';
    return '📶';
  }

  formatPrice(v: number | null): string {
    if (v === null || v === undefined) return '—';
    return `${Number(v).toLocaleString('fr-FR')} FCFA`;
  }

  formatData(mo: number | null): string {
    if (mo === null) return '—';
    return mo >= 1000 ? `${mo % 1000 === 0 ? mo / 1000 : (mo / 1000).toFixed(1)} Go` : `${mo} Mo`;
  }

  get ratioLabel(): string {
    switch (this.selectedUsage) {
      case 'internet': return 'Mo/FCFA';
      case 'voix':     return 'FCFA crédit/FCFA payé';
      case 'roaming':  return 'FCFA/min';
    }
  }

  getMetricValue(o: OffreAll): string {
    switch (this.selectedUsage) {
      case 'internet': return o.data_mo ? this.formatData(o.data_mo) : '—';
      case 'voix':     return o.credit_recu ? this.formatPrice(o.credit_recu) : '—';
      case 'roaming':  return o.tarif_appel ? this.formatPrice(o.tarif_appel) : '—';
    }
  }

  getMetricLabel(): string {
    switch (this.selectedUsage) {
      case 'internet': return 'Data incluse';
      case 'voix':     return 'Crédit reçu';
      case 'roaming':  return 'Tarif appel';
    }
  }

  getRatio(o: OffreAll): string {
    if (!o.tarif || o.tarif === 0) return '—';
    switch (this.selectedUsage) {
      case 'internet':
        return o.data_mo ? `${(o.data_mo / o.tarif).toFixed(2)} Mo/FCFA` : '—';
      case 'voix':
        return o.credit_recu ? `${(o.credit_recu / o.tarif).toFixed(2)}x` : '—';
      case 'roaming':
        return o.tarif_appel ? `${o.tarif_appel} FCFA/min` : '—';
    }
  }

  isTopOffer(index: number): boolean { return index === 0; }

  get topOffer(): OffreAll | null { return this.results[0] ?? null; }

  get savings(): string {
    if (this.results.length < 2) return '';
    const best  = this.results[0].tarif ?? 0;
    const worst = this.results[this.results.length - 1].tarif ?? 0;
    const diff  = worst - best;
    return diff > 0 ? `Économisez jusqu'à ${diff.toLocaleString('fr-FR')} FCFA` : '';
  }
}
