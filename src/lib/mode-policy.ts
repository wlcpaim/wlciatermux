// Per-mode policy for the dev chat. Each mode has its own identity, tools and
// flow; the selected mode only changes when the user picks another one.
import type { ChatMode } from "./chat-modes";

export const MODE_STORAGE_KEY = "wlc.chat-mode";
export const DEFAULT_MODE: ChatMode = "chat";
/** An approval only unlocks execution in Planejar for this long after the click. */
export const PLAN_APPROVAL_WINDOW_MS = 15 * 60 * 1000;

export function parseMode(v: unknown): ChatMode {
  return v === "chat" || v === "plan" || v === "build" ? v : DEFAULT_MODE;
}

const READ_ONLY = ["calculate_expression", "analyze_repository", "list_files", "read_file", "search_codebase", "list_commits", "check_ci", "compare_versions"];
const PLAN_TOOLS = [...READ_ONLY, "propose_plan"];
const BUILD_TOOLS = [...READ_ONLY, "write_file", "patch_file", "delete_file", "create_branch", "save_memory", "update_task", "run_project_checks"];

/**
 * Tools the server allows. Planejar only executes the plan the user approved
 * (the approval message arrives with planApproved=true); it never switches mode.
 */
export function allowedTools(mode: ChatMode, planApproved = false): Set<string> {
  if (mode === "chat") return new Set(READ_ONLY);
  if (mode === "plan") return new Set(planApproved ? BUILD_TOOLS : PLAN_TOOLS);
  return new Set(BUILD_TOOLS);
}

export function isApprovalMessage(msg: string | null | undefined): boolean {
  return !!msg && msg.trimStart().startsWith("✅ Aprovado");
}

/** Independent system prompt for each mode. Lean on purpose: no fixed rules, the model works freely. */
export function modeSystemPrompt(mode: ChatMode, planApproved = false): string {
  if (mode === "chat") return `## MODO CHAT
Converse como uma IA normal: livre, inteligente e direta. Responda ao que foi perguntado. Você pode ler o repositório se a pergunta pedir, mas neste modo não grava arquivos.`;
  if (mode === "plan" && planApproved) return `## MODO PLANEJAR — EXECUTANDO O PLANO APROVADO
O usuário aprovou o plano. Execute-o por completo com as ferramentas de gravação e relate o que foi feito de verdade.`;
  if (mode === "plan") return `## MODO PLANEJAR
Você planeja. Entenda o pedido, leia o repositório se ajudar e apresente um plano claro do que será feito. Depois chame propose_plan (objetivo + etapas) para o usuário aprovar. Não grave arquivos neste modo.`;
  return `## MODO CRIAR
Mão na massa. O usuário já autorizou: construa de verdade gravando os arquivos com write_file/patch_file, sem pedir confirmação. Você decide a melhor estrutura. Priorize que o resultado abra e funcione logo (comece pela tela principal). No fim, diga o que foi gravado e o que funciona.`;
}
