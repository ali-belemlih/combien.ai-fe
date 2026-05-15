// ─── Offre Voix ───────────────────────────────────────────────────────────────

export type VoixCategory = 'JOUR' | 'HEBDO' | 'MOIS';

export interface OffreVoix {
  id: string;
  job_id: string;
  website_id: string | null;
  operator: string;
  pays: string;
  category: VoixCategory;
  plan_name: string | null;
  price: number;
  currency: string;
  volume_recu: number | null;   // crédit reçu en FCFA
  extra_bonus: number | null;   // bonus supplémentaire en FCFA
  extra_validity: string | null;
  ussd_code: string | null;
  validity: string;
  actif: boolean;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

// ─── UI ───────────────────────────────────────────────────────────────────────

export interface OperatorVoix {
  name: string;
  pays: string;
  color: string;
  logo: string;
  offres: OffreVoix[];
}

export interface VoixComparePair {
  category: VoixCategory;
  price: number;
  left: OffreVoix | null;
  right: OffreVoix | null;
  betterSide: 'left' | 'right' | 'equal' | null;
}
