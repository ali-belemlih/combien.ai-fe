// ─── Modèles pour le module Recommandation (backend /recommend) ────────────────

export interface OptionOut {
  id: string;
  label: string;
  value: string;
}

export interface QuestionOut {
  id: string;
  order: number;
  text: string;
  field_key: string;
  input_type: string; // "select" | "number" | "text" | "multi_select"
  options: OptionOut[];
  condition: { depends_on: string; show_when: string[] } | null;
}

export interface QuestionCreate {
  order: number;
  text: string;
  field_key: string;
  input_type: string;
  condition: { depends_on: string; show_when: string[] } | null;
  dynamic_options: string | null;
  options: { label: string; value: string }[];
}

export interface AnswerStep {
  field_key: string;
  value: string;
}

export interface SessionState {
  answers: AnswerStep[];
}

export interface RecommendationItem {
  rank: number;
  score: number;         // 0–100
  source_id: string;
  plan_name: string | null;
  categorie: string | null;
  tarif: number | null;
  data_mo: number | null;
  credit_recu: number | null;
  validite: string | null;
  ussd_code: string | null;
  reason: string;
}

export interface NextStepOut {
  finished: boolean;
  progress: number;         // 0.0 → 1.0
  next_question: QuestionOut | null;
  recommendations: RecommendationItem[] | null;
  explanation: string | null;
}

export interface SeedResult {
  message: string;
  count: number;
}
