# Auditoria técnica — Modo Criar WLC.IA

**Escopo:** fluxo do chat no modo `build`, execução de ferramentas, validação de alterações e padrões de engenharia injetados no modelo.

## Correções aplicadas

1. **Consulta de CI descartada no modo `all` (alta).** O agente consultava os checks do GitHub, mas depois ignorava o resultado e retornava somente a mensagem de validação local pendente. Agora a resposta preserva o SHA e o resultado real do CI junto dos comandos locais sugeridos.
2. **Comandos incompatíveis com o gerenciador do projeto (alta).** A geração de comandos assumia `npm` mesmo quando o repositório tinha `bun.lock`, `pnpm-lock.yaml` ou `yarn.lock`. Agora o gerenciador é detectado pelo lockfile e os comandos respeitam a suíte solicitada (`typecheck`, `test` ou `all`).
3. **CI ausente/pending podia ser contado como teste aprovado (alta).** A conclusão agora só considera validação confirmada quando o resultado do CI é `success` ou `failure`. `none` e `pending` não elevam o status para validado; falhas reais de CI são registradas como falha.
4. **Padrão de engenharia do modo Criar (média).** As instruções agora exigem investigação da causa-raiz, preservação de contratos, tipagem rigorosa, validação de entradas, tratamento explícito de erros, segurança no backend, integridade de dados e revisão de regressões.
5. **Descrição da ferramenta de validação (média).** Foi corrigida para não prometer execução local que o fluxo atual não realiza.

## Limitações identificadas que continuam abertas

- O adaptador `createRemoteRunnerAdapter` existe, mas não está conectado ao fluxo `run_project_checks` do agente. O agente ainda não provisiona um workspace, sincroniza o repositório para o sandbox e executa `install/typecheck/test`. A ferramenta agora informa explicitamente que a validação local não foi executada.
- A validação completa de TypeScript, lint, build e suíte Vitest não pôde ser executada nesta sessão porque as dependências do projeto não foram instaladas. As tentativas de instalação excederam o limite de tempo disponível.
- A auditoria estática de todo o código não equivale a uma execução real da aplicação nem substitui testes de integração com GitHub, Supabase e provedores de IA.

## Verificações realizadas

- 250 arquivos TypeScript/TSX percorridos pelo transpiler TypeScript: **0 erros de sintaxe**.
- Testes direcionados executados diretamente sobre as funções puras de detecção do package manager e geração de comandos: **aprovados**.
- Cenários verificados: Bun, pnpm, Yarn, npm; suites `all`, `typecheck` e `test`.

## Próxima evolução técnica recomendada

Conectar o runner remoto de ponta a ponta com isolamento por execução: criar sandbox, materializar a árvore/commit exato, instalar dependências pelo lockfile, executar typecheck/lint/test/build com timeout e limites, coletar stdout/stderr e destruir o ambiente em `finally`. Só então o Modo Criar poderá afirmar que executou validações locais.
