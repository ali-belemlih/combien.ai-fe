import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Operator, Plan, BestValue, FilterOption, SortOption, ChartBar } from '../../models/operator.model';
import { OperatorService, SortKey } from '../../services/operator.service';
import { BestValueBannerComponent } from '../best-value-banner/best-value-banner.component';
import { CalculatorComponent } from '../calculator/calculator.component';
import { SearchInputComponent } from '../../ui/search-input/search-input.component';
import { SortSelectComponent } from '../../ui/sort-select/sort-select.component';
import { BarChartComponent } from '../../ui/bar-chart/bar-chart.component';
import { FilterBarComponent } from '../../ui/filter-bar/filter-bar.component';

export type TabKey = 'all' | 'daily' | 'weekly' | 'monthly';
export type ViewMode = 'cards' | 'compare' | 'chart';

export interface PlanWithOp extends Plan {
  operatorName: string;
  operatorColor: string;
  operatorId: string;
}

/** Paire de forfaits pour la vue comparaison côte à côte */
export interface PlanPair {
  data: number;          // volume en Mo (clé de regroupement)
  duration: TabKey;
  left: PlanWithOp | null;
  right: PlanWithOp | null;
  cheaperSide: 'left' | 'right' | 'equal' | null;
}

@Component({
  selector: 'app-comparison',
  standalone: true,
  imports: [
    CommonModule,
    BestValueBannerComponent, CalculatorComponent,
    SearchInputComponent, SortSelectComponent, BarChartComponent,
    FilterBarComponent,
  ],
  templateUrl: './comparison.component.html',
  styleUrl: './comparison.component.scss',
})
export class ComparisonComponent implements OnInit {
  operators: Operator[] = [];

  loading = true;
  error: string | null = null;

  activeTab: TabKey = 'all';
  sortKey: SortKey = 'data_asc';
  search = '';
  viewMode: ViewMode = 'cards';

  /** Filtre pays actif ('all' = tous les pays) */
  activeCountry = 'all';

  /** Opérateurs sélectionnés pour la comparaison côte à côte (max 2) */
  compareLeft: string = '';
  compareRight: string = '';

  readonly tabs: FilterOption[] = [
    { label: 'Tous', value: 'all' },
    { label: '⏱ Journalier', value: 'daily' },
    { label: '📅 Hebdomadaire', value: 'weekly' },
    { label: '🗓 Mensuel', value: 'monthly' },
  ];

  readonly sortOptions: SortOption[] = [
    { label: 'Data ↑', value: 'data_asc', direction: 'asc' },
    { label: 'Data ↓', value: 'data_desc', direction: 'desc' },
    { label: 'Prix ↑', value: 'price_asc', direction: 'asc' },
    { label: 'Prix ↓', value: 'price_desc', direction: 'desc' },
    { label: 'Meilleure valeur', value: 'value_desc', direction: 'desc' },
  ];

  constructor(private svc: OperatorService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.svc.loadOperators().subscribe({
      next: (ops) => {
        this.operators = ops;
        this._initCompareSelectors();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: Error) => {
        this.error = err.message || 'Impossible de charger les données. Vérifiez que le backend est démarré sur http://localhost:8000.';
        this.loading = false;
      },
    });
  }

  // ─── Pays disponibles ────────────────────────────────────────────────────────
  get countryOptions(): FilterOption[] {
    const countries = [...new Set(this.operators.map(op => op.country).filter(Boolean))].sort();
    return [
      { label: '🌍 Tous les pays', value: 'all' },
      ...countries.map(c => ({ label: c, value: c })),
    ];
  }

  /** Opérateurs filtrés par pays */
  get filteredOperators(): Operator[] {
    if (this.activeCountry === 'all') return this.operators;
    return this.operators.filter(op => op.country === this.activeCountry);
  }

  // ─── Options pour les sélecteurs de comparaison ──────────────────────────────
  get compareOptions(): FilterOption[] {
    return this.filteredOperators.map(op => ({ label: `${op.logo} ${op.name}`, value: op.id }));
  }

  private _initCompareSelectors(): void {
    const ops = this.filteredOperators;
    this.compareLeft  = ops[0]?.id ?? '';
    this.compareRight = ops[1]?.id ?? '';
  }

  onCountryChange(country: string): void {
    this.activeCountry = country;
    this._initCompareSelectors();
  }

  // ─── Plans filtrés + triés ────────────────────────────────────────────────────
  get filteredPlans(): PlanWithOp[] {
    const all: PlanWithOp[] = this.filteredOperators.flatMap(op =>
      op.plans.map(p => ({
        ...p,
        operatorName: op.name,
        operatorColor: op.color,
        operatorId: op.id,
      }))
    );

    const filtered = all.filter(p => {
      const matchTab    = this.activeTab === 'all' || p.duration === this.activeTab;
      const matchSearch = !this.search
        || p.name.toLowerCase().includes(this.search.toLowerCase())
        || p.features.some(f => f.toLowerCase().includes(this.search.toLowerCase()))
        || p.operatorName.toLowerCase().includes(this.search.toLowerCase());
      return matchTab && matchSearch;
    });

    return this._sort(filtered);
  }

  // ─── Groupement par opérateur (vue cartes) ───────────────────────────────────
  get groupedByOperator(): { op: Operator; plans: PlanWithOp[] }[] {
    return this.filteredOperators
      .map(op => ({
        op,
        plans: this.filteredPlans.filter(p => p.operatorId === op.id),
      }))
      .filter(g => g.plans.length > 0);
  }

  // ─── Vue comparaison côte à côte ─────────────────────────────────────────────
  get leftOperator(): Operator | undefined {
    return this.filteredOperators.find(op => op.id === this.compareLeft);
  }

  get rightOperator(): Operator | undefined {
    return this.filteredOperators.find(op => op.id === this.compareRight);
  }

  get planPairs(): PlanPair[] {
    const left  = this.leftOperator;
    const right = this.rightOperator;
    if (!left || !right) return [];

    const durFilter = this.activeTab === 'all' ? null : this.activeTab;

    // Collecte tous les volumes distincts présents dans l'un ou l'autre opérateur
    const leftPlans  = left.plans.filter(p => !durFilter || p.duration === durFilter);
    const rightPlans = right.plans.filter(p => !durFilter || p.duration === durFilter);

    // Clé unique = data (Mo) + duration
    const keys = new Map<string, { data: number; duration: string }>();
    [...leftPlans, ...rightPlans].forEach(p => {
      const k = `${p.data}-${p.duration}`;
      if (!keys.has(k)) keys.set(k, { data: p.data, duration: p.duration });
    });

    const pairs: PlanPair[] = [];
    keys.forEach(({ data, duration }) => {
      const lp = leftPlans.find(p => p.data === data && p.duration === duration) ?? null;
      const rp = rightPlans.find(p => p.data === data && p.duration === duration) ?? null;

      let cheaperSide: PlanPair['cheaperSide'] = null;
      if (lp && rp) {
        if (lp.price < rp.price) cheaperSide = 'left';
        else if (rp.price < lp.price) cheaperSide = 'right';
        else cheaperSide = 'equal';
      }

      pairs.push({
        data,
        duration: duration as TabKey,
        left:  lp ? { ...lp, operatorName: left.name,  operatorColor: left.color,  operatorId: left.id  } : null,
        right: rp ? { ...rp, operatorName: right.name, operatorColor: right.color, operatorId: right.id } : null,
        cheaperSide,
      });
    });

    // Trier par volume croissant puis durée
    const durOrder: Record<string, number> = { daily: 0, weekly: 1, monthly: 2 };
    return pairs.sort((a, b) => {
      const dd = (durOrder[a.duration] ?? 3) - (durOrder[b.duration] ?? 3);
      return dd !== 0 ? dd : a.data - b.data;
    });
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────
  get totalPlans(): number {
    return this.filteredOperators.reduce((s, op) => s + op.plans.length, 0);
  }
  get totalOperators(): number { return this.filteredOperators.length; }
  get totalFiltered(): number  { return this.filteredPlans.length; }

  // ─── Meilleure valeur ────────────────────────────────────────────────────────
  get bestValue(): BestValue | null { return this.svc.getBestValue(this.filteredOperators); }

  // ─── Graphique ───────────────────────────────────────────────────────────────
  get chartBars(): ChartBar[] {
    return this.filteredPlans.map(p => {
      const dataLabel = p.data >= 1000
        ? `${p.data % 1000 === 0 ? p.data / 1000 : (p.data / 1000).toFixed(1)} Go`
        : `${p.data} Mo`;
      return {
        label: `${p.operatorName} · ${dataLabel}`,
        value: p.price,
        color: p.operatorColor,
        sublabel: p.duration === 'daily' ? '24h' : p.duration === 'weekly' ? '7j' : '30j',
      };
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  formatData(mo: number): string {
    if (mo >= 1000) {
      const go = mo / 1000;
      return `${go % 1 === 0 ? go : go.toFixed(1)} Go`;
    }
    return `${mo} Mo`;
  }

  durationLabel(d: string): string {
    return d === 'daily' ? '24h' : d === 'weekly' ? '7 jours' : '30 jours';
  }

  countByTab(tab: TabKey): number {
    const plans = this.filteredOperators.flatMap(op => op.plans);
    if (tab === 'all') return plans.length;
    return plans.filter(p => p.duration === tab).length;
  }

  priceDiff(pair: PlanPair): string {
    if (!pair.left || !pair.right) return '';
    const diff = Math.abs(pair.left.price - pair.right.price);
    return diff > 0 ? `${diff.toLocaleString()} FCFA de différence` : 'Même prix';
  }

  private _sort(plans: PlanWithOp[]): PlanWithOp[] {
    return [...plans].sort((a, b) => {
      switch (this.sortKey) {
        case 'data_asc':   return a.data - b.data;
        case 'data_desc':  return b.data - a.data;
        case 'price_asc':  return a.price - b.price;
        case 'price_desc': return b.price - a.price;
        case 'value_desc': return (b.data / b.price) - (a.data / a.price);
        default: return 0;
      }
    });
  }
}
