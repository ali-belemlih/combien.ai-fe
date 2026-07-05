import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { UserProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /**
   * Retourne le profil de l'utilisateur connecté depuis le backend.
   * Déclenche aussi la synchronisation Keycloak → DB côté serveur.
   */
  getMe(): Observable<UserProfile> {
    return this.http
      .get<UserProfile>(`${this.base}/users/me`)
      .pipe(catchError(this._handleError));
  }

  private _handleError(error: HttpErrorResponse): Observable<never> {
    const detail =
      error.status === 0
        ? `Backend inaccessible (${environment.apiUrl})`
        : (error.error?.detail ?? error.message ?? 'Erreur inconnue');
    return throwError(() => new Error(`Erreur ${error.status} : ${detail}`));
  }
}
