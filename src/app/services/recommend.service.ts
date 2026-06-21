import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  NextStepOut,
  QuestionOut,
  QuestionCreate,
  SessionState,
  SeedResult,
} from '../models/recommend.model';

@Injectable({ providedIn: 'root' })
export class RecommendService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/recommend`;

  // ── Flow questionnaire adaptatif ────────────────────────────────────────────

  /** Envoie les réponses accumulées et reçoit la prochaine question ou les résultats. */
  nextStep(state: SessionState): Observable<NextStepOut> {
    return this.http
      .post<NextStepOut>(`${this.base}/next`, state)
      .pipe(catchError(this._handleError));
  }

  // ── CRUD questions (admin) ───────────────────────────────────────────────────

  /** Liste toutes les questions actives. */
  listQuestions(): Observable<QuestionOut[]> {
    return this.http
      .get<QuestionOut[]>(`${this.base}/questions`)
      .pipe(catchError(this._handleError));
  }

  /** Crée une nouvelle question (admin). */
  createQuestion(data: QuestionCreate): Observable<QuestionOut> {
    return this.http
      .post<QuestionOut>(`${this.base}/questions`, data)
      .pipe(catchError(this._handleError));
  }

  /** Supprime une question par son ID (admin). */
  deleteQuestion(questionId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/questions/${questionId}`)
      .pipe(catchError(this._handleError));
  }

  /** Insère les questions par défaut si la table est vide (admin). */
  seedQuestions(): Observable<SeedResult> {
    return this.http
      .post<SeedResult>(`${this.base}/seed`, {})
      .pipe(catchError(this._handleError));
  }

  // ── Gestion erreurs ─────────────────────────────────────────────────────────

  private _handleError(error: HttpErrorResponse): Observable<never> {
    let message: string;
    if (error.status === 0) {
      message = `Impossible de joindre le serveur. Vérifiez que le backend est démarré.`;
    } else {
      const detail = error.error?.detail ?? error.message ?? 'Erreur inconnue';
      message = `Erreur ${error.status} : ${detail}`;
    }
    return throwError(() => new Error(message));
  }
}
