import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  private returnUrl = '/';

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
      return;
    }
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
  }

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
    } else {
      switch (result.error) {
        case 'invalid_credentials':
          this.errorMessage.set('Identifiant ou mot de passe incorrect.');
          break;
        case 'network_error':
          this.errorMessage.set('Impossible de contacter le serveur. Vérifiez votre connexion.');
          break;
        default:
          this.errorMessage.set('Une erreur est survenue. Veuillez réessayer.');
      }
      this.form.patchValue({ password: '' });
    }
  }
}
