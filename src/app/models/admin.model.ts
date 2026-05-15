// ─── Website ──────────────────────────────────────────────────────────────────

export interface Website {
  id: string;
  operator: string;
  pays: string | null;
  url: string;
  is_active: boolean;
  created_at: string;
}

export interface WebsiteCreate {
  operator: string;
  pays?: string;
  url: string;
}

export interface WebsiteUpdate {
  operator?: string;
  pays?: string;
  url?: string;
  is_active?: boolean;
}

// ─── Job ──────────────────────────────────────────────────────────────────────

export type JobStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface Job {
  id: string;
  website_id: string | null;
  target_url: string;
  js_enabled: boolean;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export interface JobCreate {
  website_id?: string;
  target_url: string;
  js_enabled: boolean;
  extraction_rules: Record<string, unknown>;
  schema_definition: Record<string, unknown>;
}

// ─── Offre (vue admin) ────────────────────────────────────────────────────────

export interface OffreInternet {
  id: string;
  job_id: string;
  website_id: string | null;
  operator: string;
  categorie: string;
  plan_name: string | null;
  tarif_fcfa: number | null;
  volume: string | null;
  bonus: string | null;
  validite: string | null;
  actif: boolean;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}
