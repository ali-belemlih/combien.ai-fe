import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  QuestionnaireAnswers,
  QUIZ_STEPS,
  USAGE_OPTIONS,
  BUDGET_OPTIONS,
  UsageType,
  DurationPreference,
  UsageOption,
  BudgetOption,
} from '../../models/questionnaire.model';
import { Operator, Plan } from '../../models/operator.model';
import { OperatorService } from '../../services/operator.service';

export interface RecommendedPlan {
  plan: Plan;
  operator: Operator;
  score: number;
  matchReasons: string[];
}

@Component({
  selector: 'app-questionnaire',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './questionnaire.component.html',
  styleUrl: './questionnaire.component.scss',
})
export class QuestionnaireComponent implements OnInit {
  // ─── État du quiz ────────────────────────────────────────────────────────────
  currentStep = 1;
  totalSteps = QUIZ_STEPS.length;
  steps = QUIZ_STEPS;

  answers: QuestionnaireAnswers = {
    country: 'all',
    duration: 'any',
    budget: null,
    usages: [],
    estimatedData: 0,
  };

  // ─── Données ─────────────────────────────────────────────────────────────────
  operators: Operator[] = [];
  loading = false;
  error: string | null = null;
  recommendations: RecommendedPlan[] = [];

  // ─── Options statiques ───────────────────────────────────────────────────────
  readonly usageOptions: UsageOption[] = USAGE_OPTIONS;
  readonly budgetOptions: BudgetOption[] = BUDGET_OPTIONS;

  readonly durationOptions = [
    { value: 'daily'   as DurationPreference, label: 'Journalier',    icon: '⏱', desc: 'Valable 24h' },
    { value: 'weekly'  as DurationPreference, label: 'Hebdomadaire',  icon: '📅', desc: 'Valable 7 jours' },
    { value: 'monthly' as DurationPreference, label: 'Mensuel',       icon: '🗓', desc: 'Valable 30 jours' },
    { value: 'any'     as DurationPreference, label: 'Peu importe',   icon: '🔄', desc: 'Toutes durées' },
  ];

  constructor(
    private svc: OperatorService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.svc.loadOperators().subscribe({
      next: (ops) => {
        this.operators = ops;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: Error) => {
        this.error = err.message || 'Impossible de charger les forfaits. Veuillez réessayer.';
        this.loading = false;
      },
    });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────
  get currentStepData() {
    return this.steps[this.currentStep - 1];
  }

  get progress(): number {
    return ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
  }

  get canGoNext(): boolean {
    switch (this.currentStep) {
      case 1: return true; // pays optionnel
      case 2: return this.answers.duration !== undefined;
      case 3: return true; // budget optionnel
      case 4: return this.answers.usages.length > 0;
      default: return true;
    }
  }

  next(): void {
    if (!this.canGoNext) return;
    if (this.currentStep === 4) {
      this.computeEstimatedData();
      this.computeRecommendations();
    }
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  prev(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  restart(): void {
    this.currentStep = 1;
    this.answers = { country: 'all', duration: 'any', budget: null, usages: [], estimatedData: 0 };
    this.recommendations = [];
  }

  goToComparison(): void {
    this.router.navigate(['/']);
  }

  // ─── Étape 1 : Pays ──────────────────────────────────────────────────────────
  get availableCountries(): string[] {
    const countries = [...new Set(this.operators.map(op => op.country).filter(Boolean))].sort();
    return countries;
  }

  selectCountry(country: string): void {
    this.answers.country = country;
  }

  // ─── Étape 2 : Durée ─────────────────────────────────────────────────────────
  selectDuration(duration: DurationPreference): void {
    this.answers.duration = duration;
  }

  // ─── Étape 3 : Budget ────────────────────────────────────────────────────────
  selectBudget(value: number | null): void {
    this.answers.budget = value;
  }

  // ─── Étape 4 : Usages ────────────────────────────────────────────────────────
  toggleUsage(usage: UsageType): void {
    const idx = this.answers.usages.indexOf(usage);
    if (idx === -1) {
      this.answers.usages = [...this.answers.usages, usage];
    } else {
      this.answers.usages = this.answers.usages.filter(u => u !== usage);
    }
  }

  isUsageSelected(usage: UsageType): boolean {
    return this.answers.usages.includes(usage);
  }

  // ─── Calcul de la data estimée ───────────────────────────────────────────────
  private computeEstimatedData(): void {
    const dailyMo = this.answers.usages.reduce((sum, u) => {
      const opt = this.usageOptions.find(o => o.value === u);
      return sum + (opt?.dataPerDay ?? 0);
    }, 0);

    switch (this.answers.duration) {
      case 'daily':   this.answers.estimatedData = dailyMo; break;
      case 'weekly':  this.answers.estimatedData = dailyMo * 7; break;
      case 'monthly': this.answers.estimatedData = dailyMo * 30; break;
      default:        this.answers.estimatedData = dailyMo * 30; // mensuel par défaut
    }
  }

  // ─── Algorithme de recommandation ────────────────────────────────────────────
  private computeRecommendations(): void {
    const results: RecommendedPlan[] = [];

    for (const op of this.operators) {
      // Filtre pays
      if (this.answers.country !== 'all' && op.country !== this.answers.country) continue;

      for (const plan of op.plans) {
        const reasons: string[] = [];
        let score = 0;

        // Filtre durée
        if (this.answers.duration !== 'any' && plan.duration !== this.answers.duration) continue;

        // Filtre budget
        if (this.answers.budget !== null && plan.price > this.answers.budget) continue;

        // Score data suffisante
        if (plan.data >= this.answers.estimatedData) {
          score += 30;
          reasons.push(`✅ ${this.formatData(plan.data)} de data suffisants`);
        } else if (plan.data >= this.answers.estimatedData * 0.7) {
          score += 15;
          reasons.push(`⚠️ Data légèrement insuffisante (${this.formatData(plan.data)})`);
        }

        // Score rapport qualité/prix
        if (plan.price > 0) {
          const ratio = plan.data / plan.price;
          score += Math.min(ratio * 10, 40);
          if (ratio > 1) reasons.push(`💡 Excellent rapport data/prix`);
        }

        // Bonus promo
        if (plan.promo) {
          score += 10;
          reasons.push(`🏷️ Offre promotionnelle`);
        }

        // Bonus réseau 4G
        if (plan.network === '4G') {
          score += 5;
          reasons.push(`📶 Réseau 4G`);
        }

        // Bonus usage streaming
        if (this.answers.usages.includes('streaming') && plan.data >= 1000) {
          score += 10;
          reasons.push(`🎬 Adapté au streaming`);
        }

        // Bonus usage travail
        if (this.answers.usages.includes('work') && plan.data >= 500) {
          score += 8;
          reasons.push(`💼 Adapté au travail`);
        }

        results.push({ plan, operator: op, score, matchReasons: reasons.slice(0, 3) });
      }
    }

    // Trier par score décroissant, garder les 6 meilleurs
    this.recommendations = results
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }

  // ─── Helpers d'affichage ─────────────────────────────────────────────────────
  formatData(mo: number): string {
    return mo >= 1000 ? `${(mo / 1000).toFixed(mo % 1000 === 0 ? 0 : 1)} Go` : `${mo} Mo`;
  }

  formatPrice(price: number): string {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  }

  getScoreLabel(score: number): string {
    if (score >= 70) return 'Excellent';
    if (score >= 50) return 'Très bon';
    if (score >= 30) return 'Bon';
    return 'Correct';
  }

  getScoreClass(score: number): string {
    if (score >= 70) return 'score--excellent';
    if (score >= 50) return 'score--good';
    if (score >= 30) return 'score--ok';
    return 'score--low';
  }

  get estimatedDataLabel(): string {
    return this.formatData(this.answers.estimatedData);
  }

  get selectedBudgetLabel(): string {
    const opt = this.budgetOptions.find(b => b.value === this.answers.budget);
    return opt?.label ?? 'Pas de limite';
  }
}
