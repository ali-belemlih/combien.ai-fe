import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoixService } from '../../services/voix.service';
import { OffreVoix, OperatorVoix, VoixCategory, VoixComparePair } from '../../models/voix.model';

const OP_META: Record<string, { color: string; logo: string }> = {
  'moov':        { color: '#0066cc', logo: '🔵' },
  'moov africa': { color: '#0066cc', logo: '🔵' },
  'mtn':         { color: '#ffcc00', logo: '🟡' },
  'orange':      { color: '#ff6600', logo: '🟠' },
  'glo':         { color: '#00aa44', logo: '🟢' },
};

function getMeta(name: string): { color: string; logo: string } {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(OP_META)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return { color: '#6c63ff', logo: '📶' };
}

export type VoixView = 'cards' | 'compare' | 'table';

@Component({
  selector: 'app-voix',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './voix.component.html',
  styleUrl: './voix.component.scss',
})
export class VoixComponent implements OnInit {
  private readonly svc = inject(VoixService);
  private readonly cdr = inject(ChangeDetectorRef);

  allOffres: OffreVoix[] = [];
  loading = true;
  error: string | null = null;

  activeCategory: VoixCategory | 'all' = 'all';
  activePays = 'all';
  search = '';
  viewMode: VoixView = 'cards';

  compareLeft = '';
  compareRight = '';

  readonly categories: { label: string; value: VoixCategory | 'all' }[] = [
    { label: 'Tous', value: 'all' },
    { label: '⏱ Journalier', value: 'JOUR' },
    { label: '📅 Hebdomadaire', value: 'HEBDO' },
    { label: '🗓 Mensuel', value: 'MOIS' },
  ];

  ngOnInit(): void {
    this.svc.getAll().subscribe({
      next: (data) => {
        this.allOffres = data.filter(o => o.actif);
        this._initCompare();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (e: Error) => {
        this.error = e.message;
        this.loading = false;
      },
    });
  }

  get availablePays(): string[] {
    return [...new Set(this.allOffres.map(o => o.pays).filter(Boolean))].sort();
  }

  get filteredOffres(): OffreVoix[] {
    return this.allOffres.filter(o => {
      const matchPays   = this.activePays === 'all' || o.pays === this.activePays;
      const matchCat    = this.activeCategory === 'all' || o.category === this.activeCategory;
      const matchSearch = !this.search
        || o.operator.toLowerCase().includes(this.search.toLowerCase())
        || (o.plan_name ?? '').toLowerCase().includes(this.search.toLowerCase())
        || o.pays.toLowerCase().includes(this.search.toLowerCase());
      return matchPays && matchCat && matchSearch;
    });
  }

  get operatorGroups(): OperatorVoix[] {
    const map = new Map<string, OffreVoix[]>();
    for (const o of this.filteredOffres) {
      const key = `${o.operator}|${o.pays}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return Array.from(map.entries()).map(([key, offres]) => {
      const [name, pays] = key.split('|');
      const meta = getMeta(name);
      return { name, pays, color: meta.color, logo: meta.logo, offres };
    });
  }

  get totalOperators(): number { return this.operatorGroups.length; }
  get totalOffres(): number    { return this.filteredOffres.length; }

  get bestRatio(): { offre: OffreVoix; operator: string; ratio: number } | null {
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

  get compareOperators(): { label: string; value: string }[] {
    return this.operatorGroups.map(g => ({
      label: `${g.logo} ${g.name} (${g.pays})`,
      value: `${g.name}|${g.pays}`,
    }));
  }

  get leftGroup(): OperatorVoix | undefined {
    const [name, pays] = this.compareLeft.split('|');
    return this.operatorGroups.find(g => g.name === name && g.pays === pays);
  }

  get rightGroup(): OperatorVoix | undefined {
    const [name, pays] = this.compareRight.split('|');
    return this.operatorGroups.find(g => g.name === name && g.pays === pays);
  }

  get comparePairs(): VoixComparePair[] {
    const left  = this.leftGroup;
    const right = this.rightGroup;
    if (!left || !right) return [];

    const prices = new Set<number>([
      ...left.offres.map(o => Number(o.price)),
      ...right.offres.map(o => Number(o.price)),
    ]);

    return [...prices].sort((a, b) => a - b).map(price => {
      const lOffre = left.offres.find(o => Number(o.price) === price) ?? null;
      const rOffre = right.offres.find(o => Number(o.price) === price) ?? null;

      let betterSide: VoixComparePair['betterSide'] = null;
      if (lOffre && rOffre) {
        const lVal = Number(lOffre.volume_recu ?? 0);
        const rVal = Number(rOffre.volume_recu ?? 0);
        betterSide = lVal > rVal ? 'left' : rVal > lVal ? 'right' : 'equal';
      }

      return { category: (lOffre ?? rOffre)!.category, price, left: lOffre, right: rOffre, betterSide };
    });
  }

  categoryLabel(cat: string): string {
    return cat === 'JOUR' ? '24h' : cat === 'HEBDO' ? '7 jours' : '30 jours';
  }

  formatPrice(v: number | null): string {
    if (v === null || v === undefined) return '—';
    return `${Number(v).toLocaleString('fr-FR')} FCFA`;
  }

  ratio(offre: OffreVoix): string {
    if (!offre.volume_recu || Number(offre.price) === 0) return '—';
    return (Number(offre.volume_recu) / Number(offre.price)).toFixed(2);
  }

  getColor(name: string): string { return getMeta(name).color; }
  getLogo(name: string): string  { return getMeta(name).logo; }

  countByCategory(cat: VoixCategory | 'all'): number {
    if (cat === 'all') return this.filteredOffres.length;
    return this.filteredOffres.filter(o => o.category === cat).length;
  }

  onPaysChange(pays: string): void {
    this.activePays = pays;
    this._initCompare();
  }

  private _initCompare(): void {
    const ops = this.operatorGroups;
    this.compareLeft  = ops[0] ? `${ops[0].name}|${ops[0].pays}` : '';
    this.compareRight = ops[1] ? `${ops[1].name}|${ops[1].pays}` : '';
  }
}
