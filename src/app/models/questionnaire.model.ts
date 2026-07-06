export type UsageType = 'social' | 'streaming' | 'navigation' | 'work' | 'calls';
export type DurationPreference = 'daily' | 'weekly' | 'monthly' | 'any';
export type BudgetRange = 'low' | 'medium' | 'high' | 'any';
export type ForfaitTypeQuiz = 'internet' | 'voix' | 'roaming';

// ─── Internet ─────────────────────────────────────────────────────────────────

export interface QuestionnaireAnswers {
  country: string;
  duration: DurationPreference;
  budget: number | null;
  usages: UsageType[];
  estimatedData: number;
}

// ─── Voix ─────────────────────────────────────────────────────────────────────

export type VoixUsageType = 'calls_local' | 'calls_intl' | 'sms' | 'bonus_credit';
export type VoixDuration = 'JOUR' | 'HEBDO' | 'MOIS' | 'any';

export interface QuestionnaireVoixAnswers {
  country: string;
  duration: VoixDuration;
  budget: number | null;
  usages: VoixUsageType[];
}

// ─── Roaming ─────────────────────────────────────────────────────────────────

export type RoamingUsageType = 'calls' | 'sms' | 'data' | 'cheapest';

export interface QuestionnaireRoamingAnswers {
  destination: string;   // pays de destination ('all' = peu importe)
  operator:    string;   // opérateur ('all' = peu importe)
  budget:      number | null;
  usages:      RoamingUsageType[];
}

// ─── Étapes ───────────────────────────────────────────────────────────────────

export interface QuizStep {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
}

export const QUIZ_STEPS: QuizStep[] = [
  { id: 1, title: 'Votre pays',        subtitle: 'Où êtes-vous situé ?',                    icon: '🌍' },
  { id: 2, title: 'Durée du forfait',  subtitle: 'Quelle fréquence vous convient ?',         icon: '📅' },
  { id: 3, title: 'Votre budget',      subtitle: 'Combien souhaitez-vous dépenser ?',        icon: '💰' },
  { id: 4, title: 'Vos usages',        subtitle: 'Comment utilisez-vous internet ?',         icon: '📱' },
  { id: 5, title: 'Résultats',         subtitle: 'Les forfaits faits pour vous',             icon: '🎯' },
];

export const QUIZ_VOIX_STEPS: QuizStep[] = [
  { id: 1, title: 'Votre pays',        subtitle: 'Où êtes-vous situé ?',                    icon: '🌍' },
  { id: 2, title: 'Durée du forfait',  subtitle: 'Quelle fréquence vous convient ?',         icon: '📅' },
  { id: 3, title: 'Votre budget',      subtitle: 'Combien souhaitez-vous dépenser ?',        icon: '💰' },
  { id: 4, title: 'Vos besoins',       subtitle: 'Quel type d\'appels faites-vous ?',        icon: '📞' },
  { id: 5, title: 'Résultats',         subtitle: 'Les offres faites pour vous',              icon: '🎯' },
];

export const QUIZ_ROAMING_STEPS: QuizStep[] = [
  { id: 1, title: 'Destination',       subtitle: 'Dans quel pays voyagez-vous ?',            icon: '✈️' },
  { id: 2, title: 'Votre opérateur',   subtitle: 'Quel est votre opérateur local ?',         icon: '📡' },
  { id: 3, title: 'Votre budget',      subtitle: 'Combien souhaitez-vous dépenser ?',        icon: '💰' },
  { id: 4, title: 'Vos besoins',       subtitle: 'Comment allez-vous utiliser votre mobile ?', icon: '📱' },
  { id: 5, title: 'Résultats',         subtitle: 'Les meilleures offres roaming pour vous',  icon: '🎯' },
];

// ─── Options ──────────────────────────────────────────────────────────────────

export interface UsageOption {
  value: UsageType;
  label: string;
  icon: string;
  dataPerDay: number;
}

export const USAGE_OPTIONS: UsageOption[] = [
  { value: 'social',     label: 'Réseaux sociaux',    icon: '📲', dataPerDay: 150 },
  { value: 'streaming',  label: 'Vidéos / Streaming', icon: '🎬', dataPerDay: 700 },
  { value: 'navigation', label: 'Navigation web',     icon: '🌐', dataPerDay: 100 },
  { value: 'work',       label: 'Travail / Emails',   icon: '💼', dataPerDay: 200 },
  { value: 'calls',      label: 'Appels vidéo',       icon: '📞', dataPerDay: 300 },
];

export interface VoixUsageOption {
  value: VoixUsageType;
  label: string;
  icon: string;
  description: string;
}

export const VOIX_USAGE_OPTIONS: VoixUsageOption[] = [
  { value: 'calls_local', label: 'Appels locaux',          icon: '📱', description: 'Appeler dans le même pays' },
  { value: 'calls_intl',  label: 'Appels internationaux',  icon: '🌐', description: 'Appeler à l\'étranger'     },
  { value: 'sms',         label: 'SMS',                    icon: '💬', description: 'Envoyer des messages SMS'  },
  { value: 'bonus_credit',label: 'Maximiser le crédit',    icon: '💰', description: 'Obtenir le plus de crédit reçu' },
];

export interface BudgetOption {
  label: string;
  value: number | null;
  description: string;
}

export const BUDGET_OPTIONS: BudgetOption[] = [
  { label: 'Moins de 500 FCFA',   value: 500,  description: 'Petit budget' },
  { label: 'Moins de 1 000 FCFA', value: 1000, description: 'Budget modéré' },
  { label: 'Moins de 2 000 FCFA', value: 2000, description: 'Budget confortable' },
  { label: 'Moins de 5 000 FCFA', value: 5000, description: 'Budget large' },
  { label: 'Pas de limite',       value: null, description: 'Tous les forfaits' },
];

// ─── Options Roaming ──────────────────────────────────────────────────────────

export interface RoamingUsageOption {
  value: RoamingUsageType;
  label: string;
  icon: string;
  description: string;
}

export const ROAMING_USAGE_OPTIONS: RoamingUsageOption[] = [
  { value: 'calls',    label: 'Appels',          icon: '📞', description: 'Passer et recevoir des appels' },
  { value: 'sms',      label: 'SMS',             icon: '💬', description: 'Envoyer des messages texte'   },
  { value: 'data',     label: 'Internet / Data', icon: '📶', description: 'Navigation et réseaux sociaux' },
  { value: 'cheapest', label: 'Prix le plus bas', icon: '💸', description: 'Minimiser la facture roaming' },
];
