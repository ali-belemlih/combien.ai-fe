import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Website, WebsiteCreate, WebsiteUpdate,
  Job, JobCreate,
  OffreInternet,
  Pays, PaysCreate, PaysUpdate,
  Currency, CurrencyCreate, CurrencyUpdate,
  Operateur, OperateurCreate, OperateurUpdate,
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

  // ── Pays ──────────────────────────────────────────────────────────────────────

  getPays(): Observable<Pays[]> {
    return this.http.get<Pays[]>(`${this.base}/pays/`).pipe(catchError(this._handleError));
  }

  createPays(data: PaysCreate): Observable<Pays> {
    return this.http.post<Pays>(`${this.base}/pays/`, data).pipe(catchError(this._handleError));
  }

  updatePays(id: number, data: PaysUpdate): Observable<Pays> {
    return this.http.put<Pays>(`${this.base}/pays/${id}`, data).pipe(catchError(this._handleError));
  }

  deletePays(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/pays/${id}`).pipe(catchError(this._handleError));
  }

  // ── Currencies ────────────────────────────────────────────────────────────────

  getCurrencies(): Observable<Currency[]> {
    return this.http.get<Currency[]>(`${this.base}/currencies/`).pipe(catchError(this._handleError));
  }

  createCurrency(data: CurrencyCreate): Observable<Currency> {
    return this.http.post<Currency>(`${this.base}/currencies/`, data).pipe(catchError(this._handleError));
  }

  updateCurrency(id: number, data: CurrencyUpdate): Observable<Currency> {
    return this.http.put<Currency>(`${this.base}/currencies/${id}`, data).pipe(catchError(this._handleError));
  }

  deleteCurrency(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/currencies/${id}`).pipe(catchError(this._handleError));
  }

  // ── Opérateurs ────────────────────────────────────────────────────────────────
  // Endpoint backend : /operators (pas /operateurs)

  getOperateurs(): Observable<Operateur[]> {
    return this.http.get<Operateur[]>(`${this.base}/operators/`).pipe(catchError(this._handleError));
  }

  createOperateur(data: OperateurCreate): Observable<Operateur> {
    return this.http.post<Operateur>(`${this.base}/operators/`, data).pipe(catchError(this._handleError));
  }

  updateOperateur(id: number, data: OperateurUpdate): Observable<Operateur> {
    return this.http.put<Operateur>(`${this.base}/operators/${id}`, data).pipe(catchError(this._handleError));
  }

  deleteOperateur(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/operators/${id}`).pipe(catchError(this._handleError));
  }

  // ── Gestion d'erreur ─────────────────────────────────────────────────────────

  private _handleError(error: HttpErrorResponse): Observable<never> {
    const detail = error.status === 0
      ? `Backend inaccessible (${environment.apiUrl})`
      : (error.error?.detail ?? error.message ?? 'Erreur inconnue');
    return throwError(() => new Error(`Erreur ${error.status} : ${detail}`));
  }
}
