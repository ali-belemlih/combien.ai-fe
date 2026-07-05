import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

type LoginStep = 'credentials' | 'totp-setup' | 'totp-verify';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private fb     = inject(FormBuilder);

  // ── Formulaire credentials ────────────────────────────────────────────────────

  form: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  // ── Formulaire code TOTP (6 chiffres) ────────────────────────────────────────

  totpForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  // ── Signals d'état ────────────────────────────────────────────────────────────

  step          = signal<LoginStep>('credentials');
  loading       = signal(false);
  errorMessage  = signal<string | null>(null);
  showPassword  = signal(false);

  /** userId retourné par digi-auth pour les appels TOTP */
  private _userId   = '';
  /** Credentials mémorisés pour la 2ème étape TOTP */
  private _username = '';
  private _password = '';

  /** URI otpauth:// pour générer le QR code */
  qrCodeUri  = signal<string | null>(null);
  totpSecret = signal<string | null>(null);
  qrLoading  = signal(false);

  private returnUrl = '/';

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
      return;
    }
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
  }

  // ── Étape 1 : connexion avec identifiants ─────────────────────────────────────

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;

    this.errorMessage.set(null);
    this.loading.set(true);

    const { username, password } = this.form.value;
    const result = await this.auth.loginWithCredentials(username.trim(), password);

    this.loading.set(false);

    if (result.success) {
      this.router.navigate([this.returnUrl]);
      return;
    }

    // ── TOTP Setup requis ──────────────────────────────────────────────────────
    if (result.totpSetupRequired && result.userId) {
      this._userId   = result.userId;
      this._username = username.trim();
      this._password = password;
      this.step.set('totp-setup');
      this._loadTotpQrCode();
      return;
    }

    // ── TOTP Verify requis ─────────────────────────────────────────────────────
    if (result.totpRequired && result.userId) {
      this._userId   = result.userId;
      this._username = username.trim();
      this._password = password;
      this.step.set('totp-verify');
      return;
    }

    // ── Erreurs classiques ─────────────────────────────────────────────────────
    switch (result.error) {
      case 'invalid_credentials':
        this.errorMessage.set('Identifiant ou mot de passe incorrect.');
        break;
      case 'network_error':
        this.errorMessage.set('Impossible de contacter le serveur. Vérifiez votre connexion.');
        break;
      case 'account_disabled':
        this.errorMessage.set('Votre compte a été désactivé. Contactez un administrateur.');
        break;
      default:
        this.errorMessage.set('Une erreur est survenue. Veuillez réessayer.');
    }

    this.form.patchValue({ password: '' });
  }

  // ── Étape 2a : setup TOTP — charger le QR code ────────────────────────────────

  private async _loadTotpQrCode(): Promise<void> {
    this.qrLoading.set(true);
    const setup = await this.auth.getTotpSetup(this._userId);
    this.qrLoading.set(false);

    if (!setup) {
      this.errorMessage.set('Impossible de générer le QR code. Veuillez réessayer.');
      this.step.set('credentials');
      return;
    }

    this.qrCodeUri.set(setup.qrCodeUri);
    this.totpSecret.set(setup.secret);
  }

  /** URL image QR code via api.qrserver.com (pas de lib externe nécessaire) */
  get qrImageUrl(): string {
    const uri = this.qrCodeUri();
    if (!uri) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;
  }

  // ── Étape 2a : soumettre le code de confirmation du setup ─────────────────────

  async onTotpSetupSubmit(): Promise<void> {
    if (this.totpForm.invalid || this.loading()) return;

    this.errorMessage.set(null);
    this.loading.set(true);

    const code   = this.totpForm.value.code.trim();
    const result = await this.auth.totpCompleteSetup(this._username, this._password, code);

    this.loading.set(false);

    if (result.success) {
      this.router.navigate([this.returnUrl]);
      return;
    }

    switch (result.error) {
      case 'invalid_credentials':
        this.errorMessage.set('Code incorrect. Vérifiez votre application Authenticator et réessayez.');
        break;
      case 'network_error':
        this.errorMessage.set('Impossible de contacter le serveur.');
        break;
      default:
        this.errorMessage.set('Une erreur est survenue. Veuillez réessayer.');
    }

    this.totpForm.reset();
  }

  // ── Étape 2b : saisir le code TOTP (2FA déjà configuré) ──────────────────────

  async onTotpVerifySubmit(): Promise<void> {
    if (this.totpForm.invalid || this.loading()) return;

    this.errorMessage.set(null);
    this.loading.set(true);

    const code   = this.totpForm.value.code.trim();
    const result = await this.auth.totpLogin(this._username, this._password, code);

    this.loading.set(false);

    if (result.success) {
      this.router.navigate([this.returnUrl]);
      return;
    }

    switch (result.error) {
      case 'invalid_credentials':
        this.errorMessage.set('Code incorrect ou expiré. Réessayez.');
        break;
      case 'network_error':
        this.errorMessage.set('Impossible de contacter le serveur.');
        break;
      default:
        this.errorMessage.set('Une erreur est survenue. Veuillez réessayer.');
    }

    this.totpForm.reset();
  }

  // ── Retour à l'étape credentials ──────────────────────────────────────────────

  backToLogin(): void {
    this.step.set('credentials');
    this.errorMessage.set(null);
    this.totpForm.reset();
    this._userId   = '';
    this._username = '';
    this._password = '';
    this.qrCodeUri.set(null);
    this.totpSecret.set(null);
  }
}
