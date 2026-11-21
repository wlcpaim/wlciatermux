# Correções — Modo Criar (WLC.IA)

Este pacote incorpora correções para os bugs críticos 1–4 do relatório `bugs-modo-criar.md`.

## Alterações

1. **Falhas de ferramentas no histórico:** falhas retornadas por validações antecipadas agora também entram no `toolLog`, sem duplicar falhas que já foram registradas pelo `catch`. Argumentos JSON inválidos também deixam registro.
2. **Detecção de pedido de autorização:** a regex foi restringida a frases que realmente pedem autorização. Resumos normais não disparam o nudge. A última tentativa de escrita é usada para identificar falhas; bloqueios de configuração não provocam tentativas repetidas.
3. **Continuidade do pedido original:** retomadas sintéticas são identificadas e não substituem a tarefa. O agente recupera o pedido original do checkpoint quando necessário, busca uma janela maior do histórico e mantém o pedido original dentro da janela enviada ao modelo.
4. **Retomada de checkpoint:** o modo original é salvo no estado e restaurado ao retomar. Checkpoints antigos tentam recuperar o modo dos metadados do último turno real do usuário. O checkpoint só é marcado como retomado depois que `runAgent` retorna; se o agente estiver ocupado ou a inicialização falhar, ele permanece aberto.

## Validação realizada

- Verificação sintática TypeScript (`transpileModule`) nos arquivos alterados: aprovada.
- Teste direto da nova regex com exemplos de encerramento e pedidos reais de autorização: resultados esperados.
- `tsc --noEmit` não pôde concluir porque o ZIP não contém dependências instaladas (`vite/client` e `vitest/globals` ausentes).
- A suíte Vitest não foi executada pela mesma ausência de dependências.

## Fora do escopo deste pacote

Os bugs 5–13 do relatório não foram alterados nesta entrega. Em particular, a retomada de um plano aprovado no modo Planejar (bug 5) permanece como item separado.
