import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Operator, Plan, BestValue } from '../models/operator.model';
import { ApiService, RoamingCompareItem } from './api.service';

export type DurationFilter = 'all' | 'daily' | 'weekly' | 'monthly';
export type SortKey = 'price_asc' | 'price_desc' | 'data_asc' | 'data_desc' | 'value_desc';

@Injectable({ providedIn: 'root' })
export class OperatorService {
  private readonly api = inject(ApiService);

  // ── Données opérateurs ───────────────────────────────────────────────────────

  /** Charge les opérateurs depuis l'API backend. */
  loadOperators(): Observable<Operator[]> {
    return this.api.getOperators();
  }

  // ── Roaming ──────────────────────────────────────────────────────────────────

  /** Compare les tarifs roaming pour un pays donné. */
  compareRoaming(pays: string): Observable<RoamingCompareItem[]> {
    return this.api.compareRoaming(pays);
  }

  /** Retourne la liste des pays disponibles pour le roaming. */
  getRoamingCountries(): Observable<string[]> {
    return this.api.getRoamingCountries();
  }

  // ── Logique métier ───────────────────────────────────────────────────────────

  /** Retourne le meilleur rapport data/prix toutes offres confondues. */
  getBestValue(operators: Operator[]): BestValue | null {
    let best: BestValue | null = null;
    for (const op of operators) {
      for (const plan of op.plans) {
        if (plan.price === 0) continue;
        const ratio = plan.data / plan.price;
        if (!best || ratio > best.ratio) {
          best = { plan, operatorName: op.name, operatorColor: op.color, ratio };
        }
      }
    }
    return best;
  }

  /** Recommande le forfait mensuel le plus adapté à une consommation (en Mo). */
  recommend(
    monthlyMo: number,
    operators: Operator[]
  ): { plan: Plan; operatorName: string; operatorColor: string } | null {
    const candidates: { plan: Plan; operatorName: string; operatorColor: string }[] = [];
    for (const op of operators) {
      const suitable = op.plans
        .filter(p => p.duration === 'monthly' && p.data >= monthlyMo && p.price > 0)
        .sort((a, b) => a.price - b.price);
      if (suitable.length) {
        candidates.push({ plan: suitable[0], operatorName: op.name, operatorColor: op.color });
      }
    }
    if (!candidates.length) return null;
    return candidates.sort((a, b) => a.plan.price - b.plan.price)[0];
  }

  // ── Filtrage & tri ───────────────────────────────────────────────────────────

  /** Filtre les forfaits d'un opérateur par durée. */
  filterByDuration(plans: Plan[], duration: DurationFilter): Plan[] {
    if (duration === 'all') return plans;
    return plans.filter(p => p.duration === duration);
  }

  /** Trie une liste de forfaits selon la clé donnée. */
  sortPlans(plans: Plan[], key: SortKey): Plan[] {
    return [...plans].sort((a, b) => {
      switch (key) {
        case 'price_asc':  return a.price - b.price;
        case 'price_desc': return b.price - a.price;
        case 'data_asc':   return a.data - b.data;
        case 'data_desc':  return b.data - a.data;
        case 'value_desc': {
          const ratioA = a.price > 0 ? a.data / a.price : 0;
          const ratioB = b.price > 0 ? b.data / b.price : 0;
          return ratioB - ratioA;
        }
        default: return 0;
      }
    });
  }
}
