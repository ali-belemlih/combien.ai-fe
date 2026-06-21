// ─── Roaming ──────────────────────────────────────────────────────────────────

export interface OffreRoaming {
  id: string;
  operator: string;
  zone_operateur: string | null;
  pays_destination: string;
  code_pays: string | null;
  tarif_appel: number | null;
  tarif_sms: number | null;
  tarif_data: number | null;
  unite_data: string | null;
  validite: string | null;
  type_roaming: string;  // 'international' | 'free_roaming' | 'internet'
}

export interface RoamingCompareItem {
  operator: string;
  zone_operateur: string | null;
  tarif_appel: number | null;
  tarif_sms: number | null;
  tarif_data: number | null;
  unite_data: string | null;
  validite: string | null;
  type_roaming: string;
  avantage: string | null;
}

export interface RoamingJobCreate {
  website_id?: string;
  target_url: string;
  js_enabled: boolean;
  source_type: 'html' | 'pdf';
  extraction_rules: Record<string, unknown>;
}
