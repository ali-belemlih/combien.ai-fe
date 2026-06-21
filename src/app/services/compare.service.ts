import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CompareRequest, OffreAll, UserProfile, RoamingZone, RoamingZoneCompare } from '../models/compare.model';

@Injectable({ providedIn: 'root' })
export class CompareService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ── Compare / offres_all ──────────────────────────────────────────────────────

  /** Retourne les meilleures offres pour un budget + usage donné */
  getBestOffers(req: CompareRequest): Observable<OffreAll[]> {
    return this.http
      .post<OffreAll[]>(`${this.base}/compare/`, req)
      .pipe(catchError(this._handleError));
  }

  /** Liste toutes les offres triées par tarif */
  listAll(): Observable<OffreAll[]> {
    return this.http
      .get<OffreAll[]>(`${this.base}/compare/`)
      .pipe(catchError(this._handleError));
  }

  // ── Users (admin) ─────────────────────────────────────────────────────────────

  /** Liste tous les utilisateurs — admin seulement */
  getUsers(): Observable<UserProfile[]> {
    return this.http
      .get<UserProfile[]>(`${this.base}/users/`)
      .pipe(catchError(this._handleError));
  }

  /** Retourne le profil de l'utilisateur connecté */
  getMe(): Observable<UserProfile> {
    return this.http
      .get<UserProfile>(`${this.base}/users/me`)
      .pipe(catchError(this._handleError));
  }

  /** Désactive un utilisateur */
  deactivateUser(keycloakId: string): Observable<UserProfile> {
    return this.http
      .post<UserProfile>(`${this.base}/users/${keycloakId}/deactivate`, {})
      .pipe(catchError(this._handleError));
  }

  /** Réactive un utilisateur */
  activateUser(keycloakId: string): Observable<UserProfile> {
    return this.http
      .post<UserProfile>(`${this.base}/users/${keycloakId}/activate`, {})
      .pipe(catchError(this._handleError));
  }

  /** Sync tous les users depuis Keycloak */
  syncAllUsers(): Observable<{ synced: number }> {
    return this.http
      .post<{ synced: number }>(`${this.base}/users/sync-all`, {})
      .pipe(catchError(this._handleError));
  }

  // ── Roaming zones ─────────────────────────────────────────────────────────────

  /** Liste les zones roaming, filtrables par opérateur */
  getRoamingZones(operator?: string): Observable<RoamingZone[]> {
    const url = operator
      ? `${this.base}/roaming/zones?operator=${encodeURIComponent(operator)}`
      : `${this.base}/roaming/zones`;
    return this.http.get<RoamingZone[]>(url).pipe(catchError(this._handleError));
  }

  /** Compare les opérateurs pour une zone donnée */
  compareRoamingZone(zone: string): Observable<RoamingZoneCompare[]> {
    return this.http
      .get<RoamingZoneCompare[]>(`${this.base}/roaming/compare-zones?zone=${encodeURIComponent(zone)}`)
      .pipe(catchError(this._handleError));
  }

  /** Liste les types de roaming disponibles */
  getRoamingTypes(): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.base}/roaming/types`)
      .pipe(catchError(this._handleError));
  }

  // ── Gestion d'erreur ─────────────────────────────────────────────────────────

  private _handleError(error: HttpErrorResponse): Observable<never> {
    const detail = error.status === 0
      ? `Backend inaccessible (${environment.apiUrl})`
      : (error.error?.detail ?? error.message ?? 'Erreur inconnue');
    return throwError(() => new Error(`Erreur ${error.status} : ${detail}`));
  }
}
