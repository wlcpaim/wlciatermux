/**
 * WLC.IA v3 — Ferramentas cirúrgicas: patch contextual e busca no codebase.
 * Funções puras, testáveis sem GitHub/rede.
 */

export type PatchHunk = {
  /** Trecho exato a localizar no arquivo (contexto âncora). */
  old_text: string;
  /** Substituição completa do trecho. */
  new_text: string;
};

export type PatchResult =
  | { ok: true; content: string; replacements: number }
  | { ok: false; error: string };

/** Aplica um ou mais hunks por correspondência exata de texto. Falha se âncora ambígua ou ausente. */
export function applyContextualPatch(original: string, hunks: PatchHunk[]): PatchResult {
  if (!hunks.length) return { ok: false, error: "Nenhum hunk informado." };
  let content = original;
  let replacements = 0;
  for (let i = 0; i < hunks.length; i++) {
    const h = hunks[i]!;
    if (!h.old_text) return { ok: false, error: `Hunk ${i + 1}: old_text vazio.` };
    if (h.old_text === h.new_text) continue;
    const count = content.split(h.old_text).length - 1;
    if (count === 0) {
      return {
        ok: false,
        error: `Hunk ${i + 1}: trecho não encontrado. Leia o arquivo novamente e use old_text idêntico ao conteúdo atual.`,
      };
    }
    if (count > 1) {
      return {
        ok: false,
        error: `Hunk ${i + 1}: trecho ambíguo (${count} ocorrências). Amplie o contexto em old_text até ficar único.`,
      };
    }
    content = content.replace(h.old_text, h.new_text);
    replacements += 1;
  }
  return { ok: true, content, replacements };
}

export type SearchHit = {
  path: string;
  line: number;
  text: string;
};

const DEFAULT_IGNORE = /(^|\/)(node_modules|\.git|dist|build|\.next|coverage|vendor|\.turbo|\.cache)\//;

/**
 * Busca regex (ou texto literal se regex inválida) em mapa path→conteúdo.
 * Limita hits por arquivo e no total para não estourar contexto.
 */
export function searchCodebase(
  files: Record<string, string>,
  pattern: string,
  opts?: { maxHits?: number; maxPerFile?: number; caseInsensitive?: boolean },
): { hits: SearchHit[]; truncated: boolean; pattern: string; fileCount: number } {
  const maxHits = opts?.maxHits ?? 40;
  const maxPerFile = opts?.maxPerFile ?? 8;
  const flags = opts?.caseInsensitive === false ? "g" : "gi";
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags);
  } catch {
    re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
  }
  const hits: SearchHit[] = [];
  let truncated = false;
  let fileCount = 0;
  for (const [path, content] of Object.entries(files)) {
    if (DEFAULT_IGNORE.test(path)) continue;
    fileCount += 1;
    const lines = content.split(/\r?\n/);
    let perFile = 0;
    for (let i = 0; i < lines.length; i++) {
      if (hits.length >= maxHits) {
        truncated = true;
        break;
      }
      if (perFile >= maxPerFile) break;
      const line = lines[i] ?? "";
      re.lastIndex = 0;
      if (re.test(line)) {
        hits.push({ path, line: i + 1, text: line.slice(0, 240) });
        perFile += 1;
      }
    }
    if (truncated) break;
  }
  return { hits, truncated, pattern, fileCount };
}

/** Detects the repository package manager from its lockfile, never from the host machine. */
export function detectPackageManager(paths: string[]): "npm" | "bun" | "pnpm" | "yarn" {
  const normalized = new Set(paths.map((path) => path.replace(/^\.\//, "")));
  if (normalized.has("bun.lock") || normalized.has("bun.lockb")) return "bun";
  if (normalized.has("pnpm-lock.yaml")) return "pnpm";
  if (normalized.has("yarn.lock")) return "yarn";
  return "npm";
}

/** Comandos de validação sugeridos para a stack real do repositório (sem shell chaining). */
export function suggestedValidationCommands(stack: {
  hasPackageJson?: boolean;
  hasTsConfig?: boolean;
  hasPython?: boolean;
  packageManager?: "npm" | "bun" | "pnpm" | "yarn";
  suite?: "typecheck" | "test" | "all";
}): string[] {
  const cmds: string[] = [];
  const pm = stack.packageManager ?? "npm";
  const wantsTypecheck = stack.suite !== "test";
  const wantsTests = stack.suite !== "typecheck";
  if (stack.hasPackageJson) {
    if (pm === "bun") {
      cmds.push("bun install");
      if (wantsTypecheck && stack.hasTsConfig) cmds.push("bunx tsc --noEmit");
      if (wantsTests) cmds.push("bun test");
    } else {
      cmds.push(`${pm} install`);
      if (wantsTypecheck && stack.hasTsConfig) cmds.push(pm === "npm" ? "npx tsc --noEmit" : `${pm} exec tsc --noEmit`);
      if (wantsTests) cmds.push(`${pm} test`);
    }
  }
  if (stack.hasPython && wantsTests) {
    cmds.push("python -m pytest");
  }
  return cmds;
}

export const SELF_HEALING_PROTOCOL = `
## PROTOCOLO DE PROGRAMAÇÃO (obrigatório em MODO CRIAR)

### Arquivo NOVO vs EXISTENTE — escolha correta da ferramenta
- Arquivo ainda NÃO existe no repo → write_file com o conteúdo COMPLETO. Não precisa de read_file.
- Arquivo JÁ existe → SEMPRE read_file primeiro (guarda SHA). Depois:
  - mudança pequena/local → patch_file (old_text deve ser cópia literal e única do conteúdo lido)
  - reescrita total necessária → write_file com conteúdo completo (ainda exige read_file antes)
- NUNCA chame write_file em path existente sem read_file → a ferramenta retorna erro de propósito.
- NUNCA invente old_text de memória → copie do resultado de read_file. Se patch falhar, read_file de novo.

### Disciplina de programação
1. list_files / analyze_repository no início se o repo não for vazio — saiba o que já existe.
2. Crie estrutura modular: ex. index.html + css/styles.css + js/store.js + js/app.js (não um único arquivo monolítico).
3. Cada write_file deve deixar HTML/CSS/JS válidos e coerentes (tags fechadas, imports corretos, paths que existem).
4. Ao editar: search_codebase para achar símbolo/rota → read_file → patch_file → confira verified.
5. Se write/patch falhar: leia a mensagem de erro, corrija a causa (path, SHA, old_text, autorização) e tente de novo — não desista nem só explique.
6. Após gravar o núcleo, se houver runner use run_project_checks; senão declare validação pendente. Nunca invente build/teste ok.
7. Preserve código que funciona. Não reescreva arquivo inteiro para mudar 3 linhas.
`.trim();
