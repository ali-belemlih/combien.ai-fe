import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Operator } from '../models/operator.model';

// ─── Modèles de réponse backend ───────────────────────────────────────────────

export interface RoamingCompareItem {
  operator: string;
  zone_operateur: string | null;
  tarif_appel: number | null;
  tarif_sms: number | null;
  tarif_data: number | null;
  unite_data: string | null;
  validite: string | null;
  avantage: string | null;
}

export interface HealthStatus {
  status: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ── Offres Internet ──────────────────────────────────────────────────────────

  /**
   * Retourne tous les opérateurs avec leurs forfaits actifs,
   * formatés pour le frontend (Operator[]).
   */
  getOperators(): Observable<Operator[]> {
    return this.http
      .get<Operator[]>(`${this.base}/offres-internet/operators`)
      .pipe(retry(1), catchError(this._handleError));
  }

  // ── Roaming ──────────────────────────────────────────────────────────────────

  /**
   * Compare les tarifs roaming de tous les opérateurs pour un pays donné.
   * @param pays Nom du pays (ex: "France") ou code ISO (ex: "FR")
   */
  compareRoaming(pays: string): Observable<RoamingCompareItem[]> {
    return this.http
      .get<RoamingCompareItem[]>(`${this.base}/roaming/compare`, {
        params: { pays },
      })
      .pipe(retry(1), catchError(this._handleError));
  }

  /**
   * Retourne la liste des pays disponibles pour le roaming.
   */
  getRoamingCountries(): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.base}/roaming/pays`)
      .pipe(retry(1), catchError(this._handleError));
  }

  // ── Health ───────────────────────────────────────────────────────────────────

  /** Vérifie que le backend est disponible. */
  health(): Observable<HealthStatus> {
    return this.http
      .get<HealthStatus>(`${this.base}/health`)
      .pipe(catchError(this._handleError));
  }

  // ── Gestion d'erreur ─────────────────────────────────────────────────────────

  private _handleError(error: HttpErrorResponse): Observable<never> {
    let message: string;

    if (error.status === 0) {
      // Erreur réseau / CORS / backend inaccessible
      message = `Impossible de joindre le serveur (${environment.apiUrl}). Vérifiez que le backend est démarré.`;
    } else {
      // Erreur HTTP du backend
      const detail = error.error?.detail ?? error.message ?? 'Erreur inconnue';
      message = `Erreur ${error.status} : ${detail}`;
    }

    return throwError(() => new Error(message));
  }
}
