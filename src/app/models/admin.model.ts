// ─── Pays ─────────────────────────────────────────────────────────────────────
// Le backend retourne { id: number, label: string }

export interface Pays {
  id: number;
  label: string;
  code_iso2?: string | null;
  indicatif?: string | null;
  drapeau?: string | null;
  region?: string | null;
}

export interface PaysCreate {
  label: string;
  code_iso2?: string;
  indicatif?: string;
  drapeau?: string;
  region?: string;
}

export interface PaysUpdate {
  label?: string;
  code_iso2?: string;
  indicatif?: string;
  drapeau?: string;
  region?: string;
}

// ─── Currency ─────────────────────────────────────────────────────────────────
// Le backend retourne { id: number, label: string }

export interface Currency {
  id: number;
  label: string;
}

export interface CurrencyCreate {
  label: string;
}

export interface CurrencyUpdate {
  label?: string;
}

// ─── Operateur ────────────────────────────────────────────────────────────────
// Le backend retourne { id: number, label: string } via /operators

export interface Operateur {
  id: number;
  label: string;
}

export interface OperateurCreate {
  label: string;
}

export interface OperateurUpdate {
  label?: string;
}

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

// ─── Fetch Website ────────────────────────────────────────────────────────────

export interface FetchWebsiteRequest {
  url: string;
  /** Si true, utilise Playwright (JS rendu). Défaut : false. */
  js_enabled?: boolean;
  /** Taille max du HTML retourné en caractères. 0 = illimité. Défaut : 50000. */
  max_length?: number;
}

export interface FetchWebsiteResponse {
  url: string;
  status_code: number | null;
  content_type: string | null;
  html: string;
  html_length: number;
  truncated: boolean;
  title: string | null;
  links_count: number;
  tables_count: number;
  js_enabled: boolean;
}
