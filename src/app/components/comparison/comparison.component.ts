import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Operator, Plan, BestValue, FilterOption, SortOption, ChartBar } from '../../models/operator.model';
import { OperatorService, SortKey } from '../../services/operator.service';
import { OffreVoix, OperatorVoix, VoixCategory, VoixComparePair } from '../../models/voix.model';
import { VoixService } from '../../services/voix.service';
import { BestValueBannerComponent } from '../best-value-banner/best-value-banner.component';
import { CalculatorComponent } from '../calculator/calculator.component';
import { SearchInputComponent } from '../../ui/search-input/search-input.component';
import { SortSelectComponent } from '../../ui/sort-select/sort-select.component';
import { BarChartComponent } from '../../ui/bar-chart/bar-chart.component';
import { FilterBarComponent } from '../../ui/filter-bar/filter-bar.component';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { forkJoin } from 'rxjs';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ForfaitType = 'internet' | 'voix';
export type TabKey = 'all' | 'daily' | 'weekly' | 'monthly';
export type ViewMode = 'cards' | 'compare' | 'chart' | 'table';

export interface PlanWithOp extends Plan {
  operatorName: string;
  operatorColor: string;
  operatorId: string;
}

export interface PlanPair {
  data: number;
  duration: TabKey;
  left: PlanWithOp | null;
  right: PlanWithOp | null;
  cheaperSide: 'left' | 'right' | 'equal' | null;
}

// ─── Métadonnées opérateurs voix ─────────────────────────────────────────────
const OP_META: Record<string, { color: string; logo: string }> = {
  'moov':        { color: '#0066cc', logo: '🔵' },
  'moov africa': { color: '#0066cc', logo: '🔵' },
  'mtn':         { color: '#ffcc00', logo: '🟡' },
  'orange':      { color: '#ff6600', logo: '🟠' },
  'glo':         { color: '#00aa44', logo: '🟢' },
};

function getOpMeta(name: string): { color: string; logo: string } {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(OP_META)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return { color: '#6c63ff', logo: '📶' };
}

@Component({
  selector: 'app-comparison',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    BestValueBannerComponent, CalculatorComponent,
    SearchInputComponent, SortSelectComponent, BarChartComponent,
    FilterBarComponent, ButtonModule, TagModule, CardModule,
  ],
  templateUrl: './comparison.component.html',
  styleUrl: './comparison.component.scss',
})
export class ComparisonComponent implements OnInit {

  // ─── Type de forfait actif ────────────────────────────────────────────────
  forfaitType: ForfaitType = 'internet';

  // ─── État global ─────────────────────────────────────────────────────────
  loading = true;
  error: string | null = null;

  // ─── Filtres communs ──────────────────────────────────────────────────────
  activeCountry = 'all';
  search = '';
  viewMode: ViewMode = 'cards';

  // ══════════════════════════════════════════════════════════════════════════
  // INTERNET (data)
  // ══════════════════════════════════════════════════════════════════════════
  operators: Operator[] = [];
  activeTab: TabKey = 'all';
  sortKey: SortKey = 'data_asc';
  compareLeft = '';
  compareRight = '';

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

  // ══════════════════════════════════════════════════════════════════════════
  // VOIX
  // ══════════════════════════════════════════════════════════════════════════
  allOffres: OffreVoix[] = [];
  activeCategory: VoixCategory | 'all' = 'all';
  compareVoixLeft = '';
  compareVoixRight = '';

  readonly voixCategories: { label: string; value: VoixCategory | 'all' }[] = [
    { label: 'Tous', value: 'all' },
    { label: '⏱ Journalier', value: 'JOUR' },
    { label: '📅 Hebdomadaire', value: 'HEBDO' },
    { label: '🗓 Mensuel', value: 'MOIS' },
  ];

  // ─────────────────────────────────────────────────────────────────────────

  constructor(
    private svc: OperatorService,
    private voixSvc: VoixService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      operators: this.svc.loadOperators(),
      offres: this.voixSvc.getAll(),
    }).subscribe({
      next: ({ operators, offres }) => {
        this.operators = operators;
        this.allOffres = offres.filter(o => o.actif);
        this._initCompareSelectors();
        this._initVoixCompare();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: Error) => {
        this.error = err.message || 'Impossible de charger les données.';
        this.loading = false;
      },
    });
  }

  // ─── Sélecteur de type ───────────────────────────────────────────────────
  onTypeChange(type: ForfaitType): void {
    this.forfaitType = type;
    this.activeCountry = 'all';
    this.search = '';
    this.viewMode = 'cards';
    if (type === 'internet') this._initCompareSelectors();
    else this._initVoixCompare();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAYS (commun aux deux types)
  // ══════════════════════════════════════════════════════════════════════════

  get countryOptions(): FilterOption[] {
    let countries: string[];
    if (this.forfaitType === 'internet') {
      countries = [...new Set(this.operators.map(op => op.country).filter(Boolean))].sort();
    } else {
      countries = [...new Set(this.allOffres.map(o => o.pays).filter(Boolean))].sort();
    }
    return [
      { label: '🌍 Tous les pays', value: 'all' },
      ...countries.map(c => ({ label: c, value: c })),
    ];
  }

  onCountryChange(country: string): void {
    this.activeCountry = country;
    if (this.forfaitType === 'internet') this._initCompareSelectors();
    else this._initVoixCompare();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INTERNET — logique
  // ══════════════════════════════════════════════════════════════════════════

  get filteredOperators(): Operator[] {
    if (this.activeCountry === 'all') return this.operators;
    return this.operators.filter(op => op.country === this.activeCountry);
  }

  get compareOptions(): FilterOption[] {
    return this.filteredOperators.map(op => ({ label: `${op.logo} ${op.name}`, value: op.id }));
  }

  private _initCompareSelectors(): void {
    const ops = this.filteredOperators;
    this.compareLeft  = ops[0]?.id ?? '';
    this.compareRight = ops[1]?.id ?? '';
  }

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

    return this._sortPlans(filtered);
  }

  get groupedByOperator(): { op: Operator; plans: PlanWithOp[] }[] {
    return this.filteredOperators
      .map(op => ({
        op,
        plans: this.filteredPlans.filter(p => p.operatorId === op.id),
      }))
      .filter(g => g.plans.length > 0);
  }

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
    const leftPlans  = left.plans.filter(p => !durFilter || p.duration === durFilter);
    const rightPlans = right.plans.filter(p => !durFilter || p.duration === durFilter);

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
        data, duration: duration as TabKey,
        left:  lp ? { ...lp, operatorName: left.name,  operatorColor: left.color,  operatorId: left.id  } : null,
        right: rp ? { ...rp, operatorName: right.name, operatorColor: right.color, operatorId: right.id } : null,
        cheaperSide,
      });
    });

    const durOrder: Record<string, number> = { daily: 0, weekly: 1, monthly: 2 };
    return pairs.sort((a, b) => {
      const dd = (durOrder[a.duration] ?? 3) - (durOrder[b.duration] ?? 3);
      return dd !== 0 ? dd : a.data - b.data;
    });
  }

  get totalPlans(): number {
    return this.filteredOperators.reduce((s, op) => s + op.plans.length, 0);
  }
  get totalOperators(): number { return this.filteredOperators.length; }
  get totalFiltered(): number  { return this.filteredPlans.length; }
  get bestValue(): BestValue | null { return this.svc.getBestValue(this.filteredOperators); }

  // ─── KPIs Internet ───────────────────────────────────────────────────────

  /** Meilleur ratio Mo/FCFA : offre + opérateur */
  get kpiBestRatio(): { label: string; value: string; sub: string; color: string } | null {
    const all = this.filteredOperators.flatMap(op =>
      op.plans.map(p => ({ ...p, opName: op.name, opColor: op.color }))
    ).filter(p => Number(p.price) > 0);
    if (!all.length) return null;
    const best = all.reduce((a, b) => (Number(b.data) / Number(b.price)) > (Number(a.data) / Number(a.price)) ? b : a);
    return {
      label: 'Meilleur ratio',
      value: `${(Number(best.data) / Number(best.price)).toFixed(2)} Mo/FCFA`,
      sub: `${best.opName} · ${this.formatData(Number(best.data))}`,
      color: best.opColor,
    };
  }

  /** Prix moyen par Go sur le marché (plans filtrés) */
  get kpiAvgPricePerGo(): { label: string; value: string; sub: string; color: string } | null {
    const plans = this.filteredOperators.flatMap(op => op.plans).filter(p => Number(p.price) > 0 && Number(p.data) > 0);
    if (!plans.length) return null;
    const avgFcfaPerMo = plans.reduce((s, p) => s + Number(p.price) / Number(p.data), 0) / plans.length;
    const avgFcfaPerGo = avgFcfaPerMo * 1000;
    return {
      label: 'Prix moyen / Go',
      value: `${Math.round(avgFcfaPerGo).toLocaleString('fr-FR')} FCFA`,
      sub: `Moyenne sur ${plans.length} forfaits`,
      color: '#6366f1',
    };
  }

  /** Offre la moins chère (tous types confondus) */
  get kpiCheapest(): { label: string; value: string; sub: string; color: string } | null {
    const all = this.filteredOperators.flatMap(op =>
      op.plans.map(p => ({ ...p, opName: op.name, opColor: op.color }))
    ).filter(p => Number(p.price) > 0);
    if (!all.length) return null;
    const cheapest = all.reduce((a, b) => Number(b.price) < Number(a.price) ? b : a);
    return {
      label: 'Offre la moins chère',
      value: `${Number(cheapest.price).toLocaleString('fr-FR')} FCFA`,
      sub: `${cheapest.opName} · ${this.formatData(Number(cheapest.data))}`,
      color: cheapest.opColor,
    };
  }

  /** Économie max : écart entre la plus chère et la moins chère pour un même volume */
  get kpiMaxSaving(): { label: string; value: string; sub: string; color: string } | null {
    const all = this.filteredOperators.flatMap(op =>
      op.plans.map(p => ({ ...p, opName: op.name }))
    ).filter(p => Number(p.price) > 0);
    if (all.length < 2) return null;

    const byData = new Map<number, typeof all>();
    for (const p of all) {
      const dataKey = Number(p.data);
      if (!byData.has(dataKey)) byData.set(dataKey, []);
      byData.get(dataKey)!.push(p);
    }

    let maxSaving = 0;
    let savingLabel = '';
    byData.forEach((plans, data) => {
      if (plans.length < 2) return;
      const prices = plans.map(p => Number(p.price));
      const diff = Math.max(...prices) - Math.min(...prices);
      if (diff > maxSaving) {
        maxSaving = diff;
        savingLabel = this.formatData(data);
      }
    });

    if (maxSaving === 0) return null;
    return {
      label: 'Économie max possible',
      value: `${maxSaving.toLocaleString('fr-FR')} FCFA`,
      sub: `Pour ${savingLabel} de data`,
      color: '#10b981',
    };
  }

  /** Opérateur le plus compétitif (meilleur ratio moyen) */
  get kpiBestOperator(): { label: string; value: string; sub: string; color: string } | null {
    const ops = this.filteredOperators.filter(op => op.plans.length > 0);
    if (!ops.length) return null;
    const scored = ops.map(op => {
      const plans = op.plans.filter(p => Number(p.price) > 0);
      const avgRatio = plans.length
        ? plans.reduce((s, p) => s + Number(p.data) / Number(p.price), 0) / plans.length
        : 0;
      return { op, avgRatio };
    });
    const best = scored.reduce((a, b) => b.avgRatio > a.avgRatio ? b : a);
    return {
      label: 'Opérateur le plus compétitif',
      value: `${best.op.logo} ${best.op.name}`,
      sub: `Ratio moyen ${best.avgRatio.toFixed(2)} Mo/FCFA`,
      color: best.op.color,
    };
  }

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

  private _sortPlans(plans: PlanWithOp[]): PlanWithOp[] {
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

  // ══════════════════════════════════════════════════════════════════════════
  // VOIX — logique
  // ══════════════════════════════════════════════════════════════════════════

  get filteredOffres(): OffreVoix[] {
    return this.allOffres.filter(o => {
      const matchPays   = this.activeCountry === 'all' || o.pays === this.activeCountry;
      const matchCat    = this.activeCategory === 'all' || o.category === this.activeCategory;
      const matchSearch = !this.search
        || o.operator.toLowerCase().includes(this.search.toLowerCase())
        || (o.plan_name ?? '').toLowerCase().includes(this.search.toLowerCase())
        || o.pays.toLowerCase().includes(this.search.toLowerCase());
      return matchPays && matchCat && matchSearch;
    });
  }

  get voixOperatorGroups(): OperatorVoix[] {
    const map = new Map<string, OffreVoix[]>();
    for (const o of this.filteredOffres) {
      const key = `${o.operator}|${o.pays}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return Array.from(map.entries()).map(([key, offres]) => {
      const [name, pays] = key.split('|');
      const meta = getOpMeta(name);
      return { name, pays, color: meta.color, logo: meta.logo, offres };
    });
  }

  get voixTotalOperators(): number { return this.voixOperatorGroups.length; }
  get voixTotalOffres(): number    { return this.filteredOffres.length; }

  get bestVoixRatio(): { offre: OffreVoix; operator: string; ratio: number } | null {
    let best: { offre: OffreVoix; operator: string; ratio: number } | null = null;
    for (const o of this.filteredOffres) {
      if (!o.volume_recu || o.price === 0) continue;
      const ratio = Number(o.volume_recu) / Number(o.price);
      if (!best || ratio > best.ratio) {
        best = { offre: o, operator: o.operator, ratio };
      }
    }
    return best;
  }

  // ─── KPIs Voix ───────────────────────────────────────────────────────────

  /** Meilleur ratio crédit reçu / prix payé */
  get kpiVoixBestRatio(): { label: string; value: string; sub: string; color: string } | null {
    const best = this.bestVoixRatio;
    if (!best) return null;
    return {
      label: 'Meilleur ratio crédit',
      value: `${best.ratio.toFixed(2)}x`,
      sub: `${best.operator} · ${this.formatPrice(best.offre.price)} payé`,
      color: getOpMeta(best.operator).color,
    };
  }

  /** Offre avec le plus de crédit reçu */
  get kpiVoixMostCredit(): { label: string; value: string; sub: string; color: string } | null {
    const offres = this.filteredOffres.filter(o => o.volume_recu);
    if (!offres.length) return null;
    const best = offres.reduce((a, b) =>
      Number(b.volume_recu) > Number(a.volume_recu) ? b : a
    );
    return {
      label: 'Plus de crédit reçu',
      value: this.formatPrice(best.volume_recu),
      sub: `${best.operator} · ${this.formatPrice(best.price)} payé`,
      color: getOpMeta(best.operator).color,
    };
  }

  /** Bonus extra total disponible sur le marché */
  get kpiVoixTotalBonus(): { label: string; value: string; sub: string; color: string } | null {
    const offresWithBonus = this.filteredOffres.filter(o => o.extra_bonus);
    if (!offresWithBonus.length) return null;
    const total = offresWithBonus.reduce((s, o) => s + Number(o.extra_bonus), 0);
    return {
      label: 'Bonus total disponible',
      value: this.formatPrice(total),
      sub: `Sur ${offresWithBonus.length} offres avec bonus`,
      color: '#f59e0b',
    };
  }

  /** Opérateur le plus généreux (ratio moyen le plus élevé) */
  get kpiVoixBestOperator(): { label: string; value: string; sub: string; color: string } | null {
    const groups = this.voixOperatorGroups.filter(g => g.offres.some(o => o.volume_recu));
    if (!groups.length) return null;
    const scored = groups.map(g => {
      const valid = g.offres.filter(o => o.volume_recu && Number(o.price) > 0);
      const avgRatio = valid.length
        ? valid.reduce((s, o) => s + Number(o.volume_recu) / Number(o.price), 0) / valid.length
        : 0;
      return { g, avgRatio };
    });
    const best = scored.reduce((a, b) => b.avgRatio > a.avgRatio ? b : a);
    return {
      label: 'Opérateur le plus généreux',
      value: `${best.g.logo} ${best.g.name}`,
      sub: `Ratio moyen ${best.avgRatio.toFixed(2)}x`,
      color: best.g.color,
    };
  }

  get voixCompareOptions(): { label: string; value: string }[] {
    return this.voixOperatorGroups.map(g => ({
      label: `${g.logo} ${g.name} (${g.pays})`,
      value: `${g.name}|${g.pays}`,
    }));
  }

  private _initVoixCompare(): void {
    const ops = this.voixOperatorGroups;
    this.compareVoixLeft  = ops[0] ? `${ops[0].name}|${ops[0].pays}` : '';
    this.compareVoixRight = ops[1] ? `${ops[1].name}|${ops[1].pays}` : '';
  }

  get leftVoixGroup(): OperatorVoix | undefined {
    const [name, pays] = this.compareVoixLeft.split('|');
    return this.voixOperatorGroups.find(g => g.name === name && g.pays === pays);
  }

  get rightVoixGroup(): OperatorVoix | undefined {
    const [name, pays] = this.compareVoixRight.split('|');
    return this.voixOperatorGroups.find(g => g.name === name && g.pays === pays);
  }

  get voixComparePairs(): VoixComparePair[] {
    const left  = this.leftVoixGroup;
    const right = this.rightVoixGroup;
    if (!left || !right) return [];

    const prices = new Set<number>([
      ...left.offres.map(o => Number(o.price)),
      ...right.offres.map(o => Number(o.price)),
    ]);

    const pairs: VoixComparePair[] = [];
    for (const price of [...prices].sort((a, b) => a - b)) {
      const lOffre = left.offres.find(o => Number(o.price) === price) ?? null;
      const rOffre = right.offres.find(o => Number(o.price) === price) ?? null;

      let betterSide: VoixComparePair['betterSide'] = null;
      if (lOffre && rOffre) {
        const lVal = Number(lOffre.volume_recu ?? 0);
        const rVal = Number(rOffre.volume_recu ?? 0);
        if (lVal > rVal) betterSide = 'left';
        else if (rVal > lVal) betterSide = 'right';
        else betterSide = 'equal';
      }

      pairs.push({
        category: (lOffre ?? rOffre)!.category,
        price,
        left: lOffre,
        right: rOffre,
        betterSide,
      });
    }
    return pairs;
  }

  get voixChartBars(): ChartBar[] {
    return this.filteredOffres
      .filter(o => o.volume_recu)
      .map(o => ({
        label: `${o.operator} · ${this.formatPrice(o.price)}`,
        value: Number(o.volume_recu),
        color: getOpMeta(o.operator).color,
        sublabel: this.categoryLabel(o.category),
      }));
  }

  countByCategory(cat: VoixCategory | 'all'): number {
    if (cat === 'all') return this.filteredOffres.length;
    return this.filteredOffres.filter(o => o.category === cat).length;
  }

  onCategoryChange(cat: string): void {
    this.activeCategory = cat as VoixCategory | 'all';
  }

  // ─── Helpers communs ─────────────────────────────────────────────────────

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

  categoryLabel(cat: string): string {
    return cat === 'JOUR' ? '24h' : cat === 'HEBDO' ? '7 jours' : '30 jours';
  }

  formatPrice(v: number | null): string {
    if (v === null || v === undefined) return '—';
    return `${Number(v).toLocaleString('fr-FR')} FCFA`;
  }

  voixRatio(offre: OffreVoix): string {
    if (!offre.volume_recu || Number(offre.price) === 0) return '—';
    return (Number(offre.volume_recu) / Number(offre.price)).toFixed(2);
  }

  getOpColor(name: string): string { return getOpMeta(name).color; }
  getOpLogo(name: string): string  { return getOpMeta(name).logo; }

  getOperatorCountry(operatorId: string): string {
    return this.filteredOperators.find(op => op.id === operatorId)?.country || '—';
  }
}
