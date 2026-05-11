export interface Plan {
  id: string;
  name: string;
  data: number;       // en Mo
  unit: string;       // 'Mo' ou 'Go'
  price: number;      // en FCFA
  originalPrice: number | null;
  promo: boolean;
  calls: string;
  sms: string;
  network: string;
  duration: 'daily' | 'weekly' | 'monthly';
  features: string[];
}

export interface Operator {
  id: string;
  name: string;
  color: string;
  logo: string;
  country: string;   // pays de l'opérateur (ex: 'Bénin', 'Côte d\'Ivoire')
  plans: Plan[];
}

// ─── UI ───────────────────────────────────────────────────────────────────────

export interface FilterOption<T = string> {
  label: string;
  value: T;
}

export interface SortOption<T = string> {
  label: string;
  value: T;
  direction: 'asc' | 'desc';
}

export interface ChartBar {
  label: string;
  value: number;
  color: string;
  sublabel?: string;
}

export interface BestValue {
  plan: Plan;
  operatorName: string;
  operatorColor: string;
  ratio: number; // Mo par FCFA
}
