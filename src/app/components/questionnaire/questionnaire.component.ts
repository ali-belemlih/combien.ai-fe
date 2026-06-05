import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { DividerModule } from 'primeng/divider';
import { forkJoin } from 'rxjs';

import {
  QuestionnaireAnswers,
  QuestionnaireVoixAnswers,
  QUIZ_STEPS,
  QUIZ_VOIX_STEPS,
  USAGE_OPTIONS,
  VOIX_USAGE_OPTIONS,
  BUDGET_OPTIONS,
  UsageType,
  VoixUsageType,
  DurationPreference,
  VoixDuration,
  UsageOption,
  VoixUsageOption,
  BudgetOption,
  ForfaitTypeQuiz,
} from '../../models/questionnaire.model';
import { Operator, Plan } from '../../models/operator.model';
import { OperatorService } from '../../services/operator.service';
import { OffreVoix } from '../../models/voix.model';
import { VoixService } from '../../services/voix.service';

export interface RecommendedPlan {
  plan: Plan;
  operator: Operator;
  score: number;
  matchReasons: string[];
}

export interface RecommendedVoix {
  offre: OffreVoix;
  score: number;
  matchReasons: string[];
}

@Component({
  selector: 'app-questionnaire',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CardModule, TagModule, ProgressBarModule, DividerModule],
  templateUrl: './questionnaire.component.html',
  styleUrl: './questionnaire.component.scss',
})
export class QuestionnaireComponent implements OnInit {
  forfaitType: ForfaitTypeQuiz = 'internet';
  currentStep = 0;
  loading = false;
  error: string | null = null;

  operators: Operator[] = [];
  recommendations: RecommendedPlan[] = [];

  readonly internetSteps = QUIZ_STEPS;
  answers: QuestionnaireAnswers = {
    country: 'all',
    duration: 'any',
    budget: null,
    usages: [],
    estimatedData: 0,
  };

  readonly usageOptions: UsageOption[] = USAGE_OPTIONS;
  readonly durationOptions = [
    { value: 'daily'   as DurationPreference, label: 'Journalier',   icon: '⏱', desc: 'Valable 24h' },
    { value: 'weekly'  as DurationPreference, label: 'Hebdomadaire', icon: '📅', desc: 'Valable 7 jours' },
    { value: 'monthly' as DurationPreference, label: 'Mensuel',      icon: '🗓', desc: 'Valable 30 jours' },
    { value: 'any'     as DurationPreference, label: 'Peu importe',  icon: '🔄', desc: 'Toutes durées' },
  ];

  allOffresVoix: OffreVoix[] = [];
  recommendationsVoix: RecommendedVoix[] = [];

  readonly voixSteps = QUIZ_VOIX_STEPS;
  voixAnswers: QuestionnaireVoixAnswers = {
    country: 'all',
    duration: 'any',
    budget: null,
    usages: [],
  };

  readonly voixUsageOptions: VoixUsageOption[] = VOIX_USAGE_OPTIONS;
  readonly voixDurationOptions = [
    { value: 'JOUR'  as VoixDuration, label: 'Journalier',   icon: '⏱', desc: 'Valable 24h' },
    { value: 'HEBDO' as VoixDuration, label: 'Hebdomadaire', icon: '📅', desc: 'Valable 7 jours' },
    { value: 'MOIS'  as VoixDuration, label: 'Mensuel',      icon: '🗓', desc: 'Valable 30 jours' },
    { value: 'any'   as VoixDuration, label: 'Peu importe',  icon: '🔄', desc: 'Toutes durées' },
  ];

  readonly budgetOptions: BudgetOption[] = BUDGET_OPTIONS;

  constructor(
    private svc: OperatorService,
    private voixSvc: VoixService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    forkJoin({
      operators: this.svc.loadOperators(),
      offres: this.voixSvc.getAll(),
    }).subscribe({
      next: ({ operators, offres }) => {
        this.operators = operators;
        this.allOffresVoix = offres.filter(o => o.actif);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: Error) => {
        this.error = err.message || 'Impossible de charger les forfaits. Veuillez réessayer.';
        this.loading = false;
      },
    });
  }

  selectType(type: ForfaitTypeQuiz): void {
    this.forfaitType = type;
    this.currentStep = 1;
    this.recommendations = [];
    this.recommendationsVoix = [];
  }

  get steps() {
    return this.forfaitType === 'internet' ? this.internetSteps : this.voixSteps;
  }

  get totalSteps(): number {
    return this.steps.length;
  }

  get currentStepData() {
    return this.steps[this.currentStep - 1];
  }

  get progress(): number {
    if (this.currentStep === 0) return 0;
    return ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
  }

  get canGoNext(): boolean {
    if (this.forfaitType === 'internet') {
      switch (this.currentStep) {
        case 2: return this.answers.duration !== undefined;
        case 4: return this.answers.usages.length > 0;
        default: return true;
      }
    } else {
      switch (this.currentStep) {
        case 2: return this.voixAnswers.duration !== undefined;
        case 4: return this.voixAnswers.usages.length > 0;
        default: return true;
      }
    }
  }

  next(): void {
    if (!this.canGoNext) return;
    if (this.currentStep === 4) {
      if (this.forfaitType === 'internet') {
        this._computeEstimatedData();
        this._computeRecommendations();
      } else {
        this._computeRecommendationsVoix();
      }
    }
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  prev(): void {
    if (this.currentStep > 1) this.currentStep--;
    else this.currentStep = 0;
  }

  restart(): void {
    this.currentStep = 0;
    this.answers = { country: 'all', duration: 'any', budget: null, usages: [], estimatedData: 0 };
    this.voixAnswers = { country: 'all', duration: 'any', budget: null, usages: [] };
    this.recommendations = [];
    this.recommendationsVoix = [];
  }

  goToComparison(): void {
    this.router.navigate(['/']);
  }

  get availableCountries(): string[] {
    if (this.forfaitType === 'internet') {
      return [...new Set(this.operators.map(op => op.country).filter(Boolean))].sort();
    }
    return [...new Set(this.allOffresVoix.map(o => o.pays).filter(Boolean))].sort();
  }

  selectCountry(country: string): void {
    if (this.forfaitType === 'internet') this.answers.country = country;
    else this.voixAnswers.country = country;
  }

  isCountrySelected(country: string): boolean {
    return this.forfaitType === 'internet'
      ? this.answers.country === country
      : this.voixAnswers.country === country;
  }

  selectDuration(duration: DurationPreference): void {
    this.answers.duration = duration;
  }

  selectVoixDuration(duration: VoixDuration): void {
    this.voixAnswers.duration = duration;
  }

  selectBudget(value: number | null): void {
    if (this.forfaitType === 'internet') this.answers.budget = value;
    else this.voixAnswers.budget = value;
  }

  isBudgetSelected(value: number | null): boolean {
    return this.forfaitType === 'internet'
      ? this.answers.budget === value
      : this.voixAnswers.budget === value;
  }

  toggleUsage(usage: UsageType): void {
    const idx = this.answers.usages.indexOf(usage);
    this.answers.usages = idx === -1
      ? [...this.answers.usages, usage]
      : this.answers.usages.filter(u => u !== usage);
  }

  isUsageSelected(usage: UsageType): boolean {
    return this.answers.usages.includes(usage);
  }

  toggleVoixUsage(usage: VoixUsageType): void {
    const idx = this.voixAnswers.usages.indexOf(usage);
    this.voixAnswers.usages = idx === -1
      ? [...this.voixAnswers.usages, usage]
      : this.voixAnswers.usages.filter(u => u !== usage);
  }

  isVoixUsageSelected(usage: VoixUsageType): boolean {
    return this.voixAnswers.usages.includes(usage);
  }

  private _computeEstimatedData(): void {
    const dailyMo = this.answers.usages.reduce((sum, u) => {
      const opt = this.usageOptions.find(o => o.value === u);
      return sum + (opt?.dataPerDay ?? 0);
    }, 0);
    switch (this.answers.duration) {
      case 'daily':   this.answers.estimatedData = dailyMo; break;
      case 'weekly':  this.answers.estimatedData = dailyMo * 7; break;
      default:        this.answers.estimatedData = dailyMo * 30;
    }
  }

  private _computeRecommendations(): void {
    const results: RecommendedPlan[] = [];
    for (const op of this.operators) {
      if (this.answers.country !== 'all' && op.country !== this.answers.country) continue;
      for (const plan of op.plans) {
        const reasons: string[] = [];
        let score = 0;
        if (this.answers.duration !== 'any' && plan.duration !== this.answers.duration) continue;
        if (this.answers.budget !== null && plan.price > this.answers.budget) continue;
        if (plan.data >= this.answers.estimatedData) {
          score += 30;
          reasons.push(`✅ ${this.formatData(plan.data)} de data suffisants`);
        } else if (plan.data >= this.answers.estimatedData * 0.7) {
          score += 15;
          reasons.push(`⚠️ Data légèrement insuffisante (${this.formatData(plan.data)})`);
        }
        if (plan.price > 0) {
          const ratio = plan.data / plan.price;
          score += Math.min(ratio * 10, 40);
          if (ratio > 1) reasons.push(`💡 Excellent rapport data/prix`);
        }
        if (plan.promo) { score += 10; reasons.push(`🏷️ Offre promotionnelle`); }
        if (plan.network === '4G') { score += 5; reasons.push(`📶 Réseau 4G`); }
        if (this.answers.usages.includes('streaming') && plan.data >= 1000) { score += 10; reasons.push(`🎬 Adapté au streaming`); }
        if (this.answers.usages.includes('work') && plan.data >= 500) { score += 8; reasons.push(`💼 Adapté au travail`); }
        results.push({ plan, operator: op, score, matchReasons: reasons.slice(0, 3) });
      }
    }
    this.recommendations = results.sort((a, b) => b.score - a.score).slice(0, 6);
  }

  private _computeRecommendationsVoix(): void {
    const results: RecommendedVoix[] = [];
    const wantCredit = this.voixAnswers.usages.includes('bonus_credit');

    for (const offre of this.allOffresVoix) {
      if (this.voixAnswers.country !== 'all' && offre.pays !== this.voixAnswers.country) continue;
      if (this.voixAnswers.duration !== 'any' && offre.category !== this.voixAnswers.duration) continue;
      if (this.voixAnswers.budget !== null && offre.price > this.voixAnswers.budget) continue;

      const reasons: string[] = [];
      let score = 0;

      if (offre.volume_recu && offre.price > 0) {
        const ratio = Number(offre.volume_recu) / offre.price;
        score += Math.min(ratio * 20, 40);
        if (ratio >= 2) reasons.push(`💰 ${ratio.toFixed(1)}x votre mise en crédit`);
        else if (ratio >= 1) reasons.push(`✅ Crédit reçu : ${this.formatPrice(offre.volume_recu)}`);
      }

      if (offre.extra_bonus) {
        score += 15;
        reasons.push(`🎁 Bonus ${this.formatPrice(offre.extra_bonus)}`);
      }

      if (wantCredit && offre.volume_recu && Number(offre.volume_recu) > offre.price) {
        score += 20;
      }

      if (offre.ussd_code) {
        score += 5;
        reasons.push(`📲 Code USSD : ${offre.ussd_code}`);
      }

      const validLow = offre.validity?.toLowerCase() ?? '';
      if (validLow.includes('mois') || validLow.includes('30')) {
        score += 8;
        reasons.push(`🗓 Validité : ${offre.validity}`);
      } else if (validLow.includes('7') || validLow.includes('semaine')) {
        score += 4;
      }

      results.push({ offre, score, matchReasons: reasons.slice(0, 3) });
    }

    this.recommendationsVoix = results.sort((a, b) => b.score - a.score).slice(0, 6);
  }

  get voixDurationLabel(): string {
    return this.voixDurationOptions.find(d => d.value === this.voixAnswers.duration)?.label ?? 'Toutes durées';
  }

  get voixBudgetLabel(): string {
    return this.budgetOptions.find(b => b.value === this.voixAnswers.budget)?.label ?? 'Pas de limite';
  }

  get voixUsagesLabel(): string {
    if (this.voixAnswers.usages.length === 0) return '—';
    return this.voixAnswers.usages
      .map(u => this.voixUsageOptions.find(o => o.value === u)?.label ?? u)
      .join(', ');
  }

  formatData(mo: number): string {
    return mo >= 1000 ? `${(mo / 1000).toFixed(mo % 1000 === 0 ? 0 : 1)} Go` : `${mo} Mo`;
  }

  formatPrice(price: number | null): string {
    if (price === null) return '—';
    return `${Number(price).toLocaleString('fr-FR')} FCFA`;
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
    return this.budgetOptions.find(b => b.value === this.answers.budget)?.label ?? 'Pas de limite';
  }

  voixRatio(offre: OffreVoix): string {
    if (!offre.volume_recu || offre.price === 0) return '—';
    return (Number(offre.volume_recu) / offre.price).toFixed(2) + ' FCFA/FCFA';
  }
}
