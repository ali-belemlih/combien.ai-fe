export type UsageType = 'social' | 'streaming' | 'navigation' | 'work' | 'calls';
export type DurationPreference = 'daily' | 'weekly' | 'monthly' | 'any';
export type BudgetRange = 'low' | 'medium' | 'high' | 'any';

export interface QuestionnaireAnswers {
  country: string;           // 'all' ou nom du pays
  duration: DurationPreference;
  budget: number | null;     // budget max en FCFA, null = pas de limite
  usages: UsageType[];       // usages sélectionnés
  estimatedData: number;     // Mo estimés par mois
}

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

export interface UsageOption {
  value: UsageType;
  label: string;
  icon: string;
  dataPerDay: number; // Mo par jour estimé
}

export const USAGE_OPTIONS: UsageOption[] = [
  { value: 'social',     label: 'Réseaux sociaux',  icon: '📲', dataPerDay: 150  },
  { value: 'streaming',  label: 'Vidéos / Streaming', icon: '🎬', dataPerDay: 700  },
  { value: 'navigation', label: 'Navigation web',   icon: '🌐', dataPerDay: 100  },
  { value: 'work',       label: 'Travail / Emails',  icon: '💼', dataPerDay: 200  },
  { value: 'calls',      label: 'Appels vidéo',     icon: '📞', dataPerDay: 300  },
];

export interface BudgetOption {
  label: string;
  value: number | null;
  description: string;
}

export const BUDGET_OPTIONS: BudgetOption[] = [
  { label: 'Moins de 500 FCFA',  value: 500,   description: 'Petit budget' },
  { label: 'Moins de 1 000 FCFA', value: 1000,  description: 'Budget modéré' },
  { label: 'Moins de 2 000 FCFA', value: 2000,  description: 'Budget confortable' },
  { label: 'Moins de 5 000 FCFA', value: 5000,  description: 'Budget large' },
  { label: 'Pas de limite',       value: null,  description: 'Tous les forfaits' },
];
