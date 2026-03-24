// Admin authentication is handled server-side via Supabase Auth and user_roles table.
// Do NOT store credentials in client-side code.

export type AccountStatus = "ATIVO" | "INATIVO" | "PENDENTE";
export type AccessLevel = "ADMIN_MASTER" | "USER";

export type AdminAuthResult = {
  acesso: AccessLevel;
  status: AccountStatus;
};

// These functions are kept for type compatibility but should not be used for actual auth.
// Admin access is determined by the user_roles table checked via useAuth hook.
export const canUserLogin = () => true;
export const canToggleAccounts = (acesso: AccessLevel) => acesso === "ADMIN_MASTER";
