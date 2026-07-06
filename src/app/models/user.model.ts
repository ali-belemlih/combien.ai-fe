/**
 * Réponse de l'endpoint GET /users/me — aligné sur UserProfileResponse du backend.
 */
export interface UserProfile {
  keycloak_id: string;
  username: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  roles: string[];
  is_active: boolean;
  first_seen_at: string; // ISO 8601
  last_seen_at: string;  // ISO 8601
}
