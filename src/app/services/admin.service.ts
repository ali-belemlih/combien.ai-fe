import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Website, WebsiteCreate, WebsiteUpdate,
  Job, JobCreate,
  OffreInternet,
} from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ── Websites ─────────────────────────────────────────────────────────────────

  getWebsites(): Observable<Website[]> {
    return this.http.get<Website[]>(`${this.base}/websites`).pipe(catchError(this._handleError));
  }

  createWebsite(data: WebsiteCreate): Observable<Website> {
    return this.http.post<Website>(`${this.base}/websites`, data).pipe(catchError(this._handleError));
  }

  updateWebsite(id: string, data: WebsiteUpdate): Observable<Website> {
    return this.http.put<Website>(`${this.base}/websites/${id}`, data).pipe(catchError(this._handleError));
  }

  deleteWebsite(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/websites/${id}`).pipe(catchError(this._handleError));
  }

  autoFillPays(): Observable<Website[]> {
    return this.http.put<Website[]>(`${this.base}/websites/auto-pays`, {}).pipe(catchError(this._handleError));
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────────

  getJobs(): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.base}/jobs`).pipe(catchError(this._handleError));
  }

  getJob(id: string): Observable<Job> {
    return this.http.get<Job>(`${this.base}/jobs/${id}`).pipe(catchError(this._handleError));
  }

  createJob(data: JobCreate): Observable<Job> {
    return this.http.post<Job>(`${this.base}/jobs`, data).pipe(catchError(this._handleError));
  }

  rerunJob(id: string): Observable<Job> {
    return this.http.post<Job>(`${this.base}/jobs/${id}/run`, {}).pipe(catchError(this._handleError));
  }

  deleteJob(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/jobs/${id}`).pipe(catchError(this._handleError));
  }

  getJobOffres(jobId: string): Observable<OffreInternet[]> {
    return this.http.get<OffreInternet[]>(`${this.base}/jobs/${jobId}/offres`).pipe(catchError(this._handleError));
  }

  // ── Offres ────────────────────────────────────────────────────────────────────

  getAllOffres(): Observable<OffreInternet[]> {
    return this.http.get<OffreInternet[]>(`${this.base}/offres-internet`).pipe(catchError(this._handleError));
  }

  getOffresByOperator(operator: string): Observable<OffreInternet[]> {
    return this.http
      .get<OffreInternet[]>(`${this.base}/offres-internet/by-operator/${encodeURIComponent(operator)}`)
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
