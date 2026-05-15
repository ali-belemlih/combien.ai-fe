import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { OffreVoix } from '../models/voix.model';

@Injectable({ providedIn: 'root' })
export class VoixService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getAll(): Observable<OffreVoix[]> {
    return this.http
      .get<OffreVoix[]>(`${this.base}/offres-voix`)
      .pipe(catchError(this._handleError));
  }

  getByOperator(operator: string): Observable<OffreVoix[]> {
    return this.http
      .get<OffreVoix[]>(`${this.base}/offres-voix/by-operator/${encodeURIComponent(operator)}`)
      .pipe(catchError(this._handleError));
  }

  getByPays(pays: string): Observable<OffreVoix[]> {
    return this.http
      .get<OffreVoix[]>(`${this.base}/offres-voix/by-pays/${encodeURIComponent(pays)}`)
      .pipe(catchError(this._handleError));
  }

  getByCategory(category: string): Observable<OffreVoix[]> {
    return this.http
      .get<OffreVoix[]>(`${this.base}/offres-voix/by-category/${category}`)
      .pipe(catchError(this._handleError));
  }

  private _handleError(error: HttpErrorResponse): Observable<never> {
    const msg = error.status === 0
      ? `Backend inaccessible (${environment.apiUrl})`
      : (error.error?.detail ?? error.message ?? 'Erreur inconnue');
    return throwError(() => new Error(`Erreur ${error.status} : ${msg}`));
  }
}
