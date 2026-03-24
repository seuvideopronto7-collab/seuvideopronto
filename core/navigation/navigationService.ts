export const navegar = (rota: string) => {
  if (typeof window === "undefined") return;
  window.location.href = rota;
};
