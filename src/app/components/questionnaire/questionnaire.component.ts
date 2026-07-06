import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { DividerModule } from 'primeng/divider';
import { KnobModule } from 'primeng/knob';
import { RatingModule } from 'primeng/rating';

import { RecommendService } from '../../services/recommend.service';
import {
  AnswerStep,
  NextStepOut,
  QuestionOut,
  RecommendationItem,
} from '../../models/recommend.model';

@Component({
  selector: 'app-questionnaire',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CardModule, TagModule, ProgressBarModule, DividerModule, KnobModule, RatingModule],
  templateUrl: './questionnaire.component.html',
  styleUrl: './questionnaire.component.scss',
})
export class QuestionnaireComponent implements OnInit {

  // ── État global ─────────────────────────────────────────────────────────────
  loading = false;
  error: string | null = null;

  /** Mode : 0 = accueil (sélection type), 1+ = questions en cours, -1 = résultats */
  currentStep = 0;

  // ── Questionnaire adaptatif (backend) ───────────────────────────────────────
  answers: AnswerStep[] = [];
  currentQuestion: QuestionOut | null = null;
  progress = 0;
  selectedValue = '';

  // ── Résultats ────────────────────────────────────────────────────────────────
  finished = false;
  recommendations: RecommendationItem[] = [];
  explanation: string | null = null;

  constructor(
    private recommendSvc: RecommendService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Rien à charger au démarrage — le questionnaire démarre à la demande
  }

  // ── Démarrage du questionnaire ───────────────────────────────────────────────

  startQuestionnaire(): void {
    this.answers = [];
    this.currentQuestion = null;
    this.progress = 0;
    this.finished = false;
    this.recommendations = [];
    this.explanation = null;
    this.selectedValue = '';
    this.error = null;
    this.currentStep = 1;
    this._fetchNextStep();
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  /** Soumettre la réponse à la question courante et passer à la suivante */
  submitAnswer(): void {
    if (!this.currentQuestion || !this.selectedValue) return;

    this.answers = [
      ...this.answers,
      { field_key: this.currentQuestion.field_key, value: this.selectedValue },
    ];
    this.selectedValue = '';
    this._fetchNextStep();
  }

  /** Revenir à la question précédente (supprime la dernière réponse) */
  prev(): void {
    if (this.answers.length === 0) {
      // Retour à l'accueil
      this.currentStep = 0;
      this.currentQuestion = null;
      this.finished = false;
      return;
    }
    this.answers = this.answers.slice(0, -1);
    this.finished = false;
    this.recommendations = [];
    this._fetchNextStep();
  }

  restart(): void {
    this.currentStep = 0;
    this.answers = [];
    this.currentQuestion = null;
    this.finished = false;
    this.recommendations = [];
    this.explanation = null;
    this.selectedValue = '';
    this.error = null;
  }

  goToComparison(): void {
    this.router.navigate(['/']);
  }

  // ── Appel backend ─────────────────────────────────────────────────────────────

  private _fetchNextStep(): void {
    this.loading = true;
    this.error = null;

    this.recommendSvc.nextStep({ answers: this.answers }).subscribe({
      next: (result: NextStepOut) => {
        this.progress = Math.round(result.progress * 100);
        if (result.finished) {
          this.finished = true;
          this.recommendations = result.recommendations ?? [];
          this.explanation = result.explanation ?? null;
          this.currentStep = -1; // étape résultats
        } else {
          this.currentQuestion = result.next_question;
          this.currentStep = this.answers.length + 1;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: Error) => {
        this.error = err.message;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Helpers affichage ────────────────────────────────────────────────────────

  get canSubmit(): boolean {
    return !!this.selectedValue;
  }

  selectOption(value: string): void {
    this.selectedValue = value;
  }

  isSelected(value: string): boolean {
    return this.selectedValue === value;
  }

  /** Libellé de la réponse précédente pour affichage */
  getAnswerLabel(fieldKey: string): string {
    const answer = this.answers.find(a => a.field_key === fieldKey);
    return answer?.value ?? '—';
  }

  /** Résumé des réponses données */
  get answersSummary(): { key: string; value: string }[] {
    return this.answers.map(a => ({ key: a.field_key, value: a.value }));
  }

  formatData(mo: number): string {
    if (!mo) return '—';
    return mo >= 1000 ? `${(mo / 1000).toFixed(mo % 1000 === 0 ? 0 : 1)} Go` : `${mo} Mo`;
  }

  formatPrice(v: number | null): string {
    if (v === null || v === undefined) return '—';
    return `${Number(v).toLocaleString('fr-FR')} FCFA`;
  }

  getScoreLabel(score: number): string {
    if (score >= 75) return 'Excellent';
    if (score >= 55) return 'Très bon';
    if (score >= 35) return 'Bon';
    return 'Correct';
  }

  getScoreSeverity(score: number): 'success' | 'info' | 'warn' | 'danger' {
    if (score >= 75) return 'success';
    if (score >= 55) return 'info';
    if (score >= 35) return 'warn';
    return 'danger';
  }

  getKnobColor(score: number): string {
    if (score >= 75) return '#16a34a';
    if (score >= 55) return '#2563eb';
    if (score >= 35) return '#d97706';
    return '#dc2626';
  }

  /** Convertit un score 0-100 en étoiles 0-5 pour p-rating */
  getStars(score: number): number {
    return Math.round((score / 100) * 5);
  }

  getCategorieLabel(cat: string | null): string {
    if (!cat) return '—';
    switch (cat.toUpperCase()) {
      case 'JOUR':    return '⏱ Journalier';
      case 'HEBDO':   return '📅 Hebdomadaire';
      case 'MOIS':    return '🗓 Mensuel';
      case 'ILLIMITE': return '♾️ Illimité';
      default:        return cat;
    }
  }
}
