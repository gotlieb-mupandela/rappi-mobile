/** Website route. `auth: true` makes apiFetch send `Authorization: Bearer <access token>`. */
export const DELETE_ACCOUNT_PATH = '/api/account';
export const DELETE_ACCOUNT_METHOD = 'DELETE' as const;
export const DELETE_ACCOUNT_AUTH = true;

export function bearerAuthorization(accessToken: string): string {
  return `Bearer ${accessToken}`;
}
