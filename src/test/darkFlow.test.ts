import { describe, expect, it, vi } from "vitest";

import {
  cleanAndParseDarkFlowResponse,
  createDarkFlowGenerator,
  type DarkFlowFormData,
} from "@/lib/darkFlow";

const form: DarkFlowFormData = {
  produto: "Curso Black",
  nicho: "Renda online",
  objetivo: "vendas",
  marca: "Dark Brand",
  publico: "Afiliados iniciantes",
  plataforma: "tiktok",
  checkout: "https://checkout.exemplo",
  landing: "https://landing.exemplo",
};

const logger = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe("cleanAndParseDarkFlowResponse", () => {
  it("remove markdown fences antes do parse", () => {
    const parsed = cleanAndParseDarkFlowResponse(````json
{"hook":"Teste","contexto":"Ctx"}
````);

    expect(parsed).toMatchObject({ hook: "Teste", contexto: "Ctx" });
  });

  it("repara vírgulas sobrando", () => {
    const parsed = cleanAndParseDarkFlowResponse('{"hook":"Teste","cenas":["Cena 1",],}');

    expect(parsed).toMatchObject({ hook: "Teste", cenas: ["Cena 1"] });
  });
});

describe("createDarkFlowGenerator", () => {
  it("retorna conteúdo real da IA no sucesso", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        hook: "Hook real",
        contexto: "Contexto real",
        tese: "Tese real",
        solucao: "Solução real",
        cta: "Clique agora",
        roteiro: "Roteiro completo",
        vozes: "Masculina brasileira",
        cenas: ["Cena 1", "Cena 2"],
      },
      error: null,
    });

    const generate = createDarkFlowGenerator({ invoke, timeoutMs: 50, logger });
    const outcome = await generate(form);

    expect(outcome.usedFallback).toBe(false);
    expect(outcome.result.hook).toBe("Hook real");
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("tenta novamente uma vez quando campos obrigatórios vêm incompletos", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          hook: "Hook parcial",
          contexto: "Contexto parcial",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          hook: "Hook final",
          contexto: "Contexto final",
          tese: "Tese final",
          solucao: "Solução final",
          cta: "CTA final",
          roteiro: "Roteiro final",
          vozes: "Voz final",
          cenas: ["Cena A"],
        },
        error: null,
      });

    const generate = createDarkFlowGenerator({ invoke, timeoutMs: 50, logger });
    const outcome = await generate(form);

    expect(outcome.usedFallback).toBe(false);
    expect(outcome.partial).toBe(false);
    expect(outcome.result.hook).toBe("Hook final");
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("usa fallback após erro real da API", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "Falha 500" } })
      .mockResolvedValueOnce({ data: null, error: { message: "Falha 500" } });

    const generate = createDarkFlowGenerator({ invoke, timeoutMs: 50, logger });
    const outcome = await generate(form);

    expect(outcome.usedFallback).toBe(true);
    expect(outcome.result.hook).toContain("Renda online");
  });

  it("usa fallback após timeout", async () => {
    const invoke = vi.fn(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              data: {
                hook: "Tardio",
              },
              error: null,
            });
          }, 30);
        }),
    );

    const generate = createDarkFlowGenerator({ invoke, timeoutMs: 5, logger });
    const outcome = await generate(form);

    expect(outcome.usedFallback).toBe(true);
    expect(outcome.error?.message).toContain("Timeout IA");
  });
});