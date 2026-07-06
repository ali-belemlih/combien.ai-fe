// ─── Compare / offres_all ─────────────────────────────────────────────────────

export type UsageType = 'internet' | 'voix' | 'roaming';

export interface CompareRequest {
  budget: number;
  usage: UsageType;
}

export interface OffreAll {
  id: string;
  type_id: number | null;
  source_id: string;
  operator_id: number | null;
  pays_id: number | null;
  pays_name: string | null;
  currency_id: number | null;
  plan_name: string | null;
  categorie: string | null;
  tarif: number | null;
  data_mo: number | null;
  credit_recu: number | null;
  tarif_appel: number | null;
  tarif_sms: number | null;
  validite: string | null;
  validite_jours: number | null;
  ussd_code: string | null;
  actif: boolean;
  synced_at: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  keycloak_id: string;
  username: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  roles: string[];
  is_active: boolean;
  first_seen_at: string;
  last_seen_at: string;
}

// ─── Roaming zones ────────────────────────────────────────────────────────────

export interface RoamingZone {
  zone: string;
  operator: string;
  tarif_appel: number | null;
  tarif_sms: number | null;
  tarif_data: number | null;
  pays: string[];
}

export interface RoamingZoneCompare extends RoamingZone {
  nb_pays: number;
  avantage: string | null;
}
