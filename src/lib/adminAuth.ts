export type AccountStatus = "ATIVO" | "INATIVO" | "PENDENTE";
export type AccessLevel = "ADMIN_MASTER" | "USER";

export const ADMIN_LOGIN = "CEO-Leandro";
export const ADMIN_EMAIL = "seuvideopronta7@gmail.com";
export const ADMIN_PASSWORD = "Ll102030@";

export type AdminAuthResult = {
  acesso: AccessLevel;
  status: AccountStatus;
};

export const resolveAdminLogin = (login: string, senha: string): AdminAuthResult | null => {
  if (login === ADMIN_LOGIN && senha === ADMIN_PASSWORD) {
    return { acesso: "ADMIN_MASTER", status: "ATIVO" };
  }

  return null;
};

export const canUserLogin = () => true;

export const canToggleAccounts = (acesso: AccessLevel) => acesso === "ADMIN_MASTER";
