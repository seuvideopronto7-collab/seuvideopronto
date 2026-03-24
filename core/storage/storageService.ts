const STORAGE_KEY = "darkflow_projects";

export type Projeto = {
  id: string;
  nome: string;
  tipo: string;
  data: string;
  dados: Record<string, unknown>;
};

const readAll = (): Projeto[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
};

const saveAll = (projetos: Projeto[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projetos));
};

export const salvarProjeto = (dados: Omit<Projeto, "id" | "data">): Projeto => {
  const projetos = readAll();
  const novo = {
    ...dados,
    id: String(Date.now()),
    data: new Date().toISOString()
  };
  projetos.push(novo);
  saveAll(projetos);
  return novo;
};

export const buscarProjetos = (): Projeto[] => readAll();

export const buscarProjetoPorId = (id: string): Projeto | undefined =>
  readAll().find((projeto) => projeto.id === id);

export const atualizarProjeto = (id: string, dados: Partial<Projeto>): Projeto | undefined => {
  const projetos = readAll();
  const index = projetos.findIndex((projeto) => projeto.id === id);
  if (index === -1) return undefined;
  projetos[index] = { ...projetos[index], ...dados };
  saveAll(projetos);
  return projetos[index];
};
