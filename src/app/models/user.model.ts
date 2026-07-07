/**
 * Réponse de l'endpoint GET /users/me — aligné sur UserProfileResponse du backend.
 * Champ 'enabled' remplace 'is_active' pour correspondre au modèle digi-auth.
 */
export interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
  email_verified: boolean;
  first_name: string | null;
  last_name: string | null;
  roles: string[];
  enabled: boolean;
  totp_enabled: boolean;
  totp_required: boolean;
  first_seen_at: string;
  last_seen_at: string;

  // Compat backward — certains endroits peuvent encore utiliser is_active
  is_active?: boolean;
}
