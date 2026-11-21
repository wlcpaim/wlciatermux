export type ChatMode = "chat" | "plan" | "build";
export type ChatAttachment = { name: string; kind: "text" | "image"; mime: string; size: number; content: string };

export const CHAT_MODES: { id: ChatMode; label: string; hint: string }[] = [
  { id: "chat", label: "Chat", hint: "Conversa normal — nunca cria nem altera arquivos" },
  { id: "plan", label: "Planejar", hint: "Analisa e apresenta o plano; só executa o que você aprovar" },
  { id: "build", label: "Criar", hint: "Começa a desenvolver na hora, sem pedir aprovação" },
];

export const MAX_ATTACHMENTS = 6;
export const MAX_TEXT_CHARS = 120_000;
export const MAX_IMAGE_DATAURL = 1_500_000;

/** Instruction injected in the system prompt for the selected composer mode (WLC.IA v3). */
export function modeInstruction(mode: ChatMode | undefined): string {
  if (mode === "chat") {
    return [
      "",
      "## MODO ATUAL: CHAT (consultivo)",
      "Responda como engenheiro sênior: tire dúvidas, explique causa raiz, leia schemas e oriente.",
      "NÃO grave arquivos, NÃO faça commits, NÃO chame propose_plan, NÃO chame patch_file/write_file/delete_file.",
      "Pode usar list_files, read_file, search_codebase, analyze_repository e calculate_expression.",
    ].join("\n");
  }
  if (mode === "plan") {
    return [
      "",
      "## MODO ATUAL: PLANEJAR",
      "Investigue o repositório (somente leitura: list/read/search/analyze) e chame propose_plan com objetivo e 3–8 etapas claras.",
      "NÃO grave arquivos neste modo. Após propose_plan, encerre com uma frase curta — o usuário aprova no botão Criar.",
    ].join("\n");
  }
  if (mode === "build") {
    return [
      "",
      "## MODO ATUAL: CRIAR — EXECUÇÃO PRODUÇÃO (autônoma)",
      "O usuário JÁ AUTORIZOU. Você é o executor. NÃO chame propose_plan. NÃO peça permissão. NÃO faça perguntas.",
      "Na PRIMEIRA resposta útil: já chame write_file (ou read_file→patch_file). Texto sem gravação = falha.",
      "Ordem: entenda a stack e os padrões existentes; rastreie dependências e fluxo atual; depois implemente em módulos coerentes. Não presuma framework, banco, rotas ou comandos.",
      "Padrão sênior: identifique causa-raiz antes de corrigir; considere casos-limite, concorrência, segurança, acessibilidade, desempenho e compatibilidade. Prefira a menor alteração segura; preserve contratos e dados existentes.",
      "TypeScript: evite any desnecessário, valide entradas em runtime, trate null/undefined e erros de forma explícita; não esconda falhas com casts ou catch vazio.",
      "React: componentes com responsabilidades claras, estado previsível, efeitos com cleanup, keys estáveis e estados loading/empty/error/success. Evite efeitos duplicados e atualizações após desmontagem.",
      "Backend/dados: autorização no servidor, validação de payload, integridade referencial, transações para operações atômicas, idempotência e logs sem segredos.",
      "PROIBIDO: Lorem, TODO, botão morto, arquivo monolítico, métricas inventadas, any indiscriminado, catch silencioso, declarar pronto sem ter gravado.",
      "Erro de ferramenta: leia a mensagem, corrija (read_file se SHA, path válido, repo autorizado) e continue gravando.",
      "Sem runner: não invente teste/build ok — diga validação pendente. Com runner: run_project_checks e corrija falhas.",
      "Pare só com fluxo principal usável gravado. Resumo: caminhos, o que funciona, limitações reais.",
    ].join("\n");
  }
  return "";
}

/** Text appended to the user's turn so the model sees attached files. */
export function attachmentsForModel(atts: ChatAttachment[] | undefined): string {
  if (!atts?.length) return "";
  return (
    "\n\n" +
    atts
      .map((a) =>
        a.kind === "text"
          ? `### Arquivo anexado: ${a.name}\n\`\`\`\n${a.content.slice(0, MAX_TEXT_CHARS)}\n\`\`\``
          : `### Imagem anexada: ${a.name} (${a.mime}, ${Math.round(a.size / 1024)} KB) — use como referência visual descrita pelo usuário.`,
      )
      .join("\n\n")
  );
}
