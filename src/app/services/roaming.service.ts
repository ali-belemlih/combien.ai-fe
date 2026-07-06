import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { OffreRoaming, RoamingCompareItem, RoamingJobCreate } from '../models/roaming.model';
import { Job } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class RoamingService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Liste toutes les offres roaming (filtrable par opérateur) */
  getAll(operator?: string): Observable<OffreRoaming[]> {
    const url = operator
      ? `${this.base}/roaming/?operator=${encodeURIComponent(operator)}`
      : `${this.base}/roaming/`;
    return this.http.get<OffreRoaming[]>(url).pipe(catchError(this._handleError));
  }

  /** Comparaison par pays */
  compareByPays(pays: string): Observable<RoamingCompareItem[]> {
    return this.http
      .get<RoamingCompareItem[]>(`${this.base}/roaming/compare?pays=${encodeURIComponent(pays)}`)
      .pipe(catchError(this._handleError));
  }

  /** Liste des pays disponibles */
  getPays(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/roaming/pays`).pipe(catchError(this._handleError));
  }

  /** Liste des types de roaming */
  getTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/roaming/types`).pipe(catchError(this._handleError));
  }

  /** Crée et lance un job de scraping roaming */
  createJob(data: RoamingJobCreate): Observable<Job> {
    return this.http
      .post<Job>(`${this.base}/roaming/jobs`, data)
      .pipe(catchError(this._handleError));
  }

  /** Relance un job roaming existant */
  rerunJob(jobId: string): Observable<Job> {
    return this.http
      .post<Job>(`${this.base}/roaming/jobs/${jobId}/run`, {})
      .pipe(catchError(this._handleError));
  }

  private _handleError(error: HttpErrorResponse): Observable<never> {
    const detail = error.status === 0
      ? `Backend inaccessible (${environment.apiUrl})`
      : (error.error?.detail ?? error.message ?? 'Erreur inconnue');
    return throwError(() => new Error(`Erreur ${error.status} : ${detail}`));
  }
}
