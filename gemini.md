# Gemini Rules — 12-Rule Template para o Projeto Feeder

Estas regras se aplicam a todas as tarefas e sub-agentes deste projeto, a menos que sejam explicitamente substituídas.
**Viés:** Priorize a cautela e a precisão sobre a velocidade em trabalhos não triviais. Use o bom senso em tarefas triviais.

## Regra 1 — Pense Antes de Codificar
Declare as suposições explicitamente. Se estiver incerto, pergunte em vez de adivinhar.
Apresente múltiplas interpretações quando houver ambiguidade.
Não complique: questione se houver uma abordagem mais simples.
Pare quando estiver confuso. Nomeie o que não está claro.

## Regra 2 — Simplicidade em Primeiro Lugar
Escreva o mínimo de código necessário para resolver o problema. Nada especulativo (YAGNI).
Sem features além do que foi solicitado. Sem abstrações prematuras para código de uso único.
Teste: "um engenheiro sênior diria que isso está supercomplicado?". Se sim, simplifique.

## Regra 3 — Mudanças Cirúrgicas
Toque apenas no que for estritamente necessário. Limpe apenas a sua própria bagunça.
Não "melhore" código adjacente, comentários ou formatação se não for o foco da tarefa.
Não refatore o que não está quebrado. Siga o estilo existente (ex: Clean Code + NestJS padrão, sem Hexagonal estrito).

## Regra 4 — Execução Orientada a Objetivos
Defina os critérios de sucesso. Itere (faça loops) até que sejam verificados.
Não siga passos cegamente. Defina o sucesso e persiga-o.
Critérios de sucesso fortes permitem que você (agente) trabalhe de forma autônoma.

## Regra 5 — Use a IA apenas para decisões de julgamento
Se o código (ou um script/linter) puder responder ou fazer algo, deixe o código fazer. Não confie na IA para transformações determinísticas que uma ferramenta nativa pode fazer perfeitamente.

## Regra 6 — Orçamento e Limites de Contexto
Atenção ao uso de tokens e tamanho dos arquivos. 
Se estiver se aproximando de limites confusos ou o contexto ficar poluído, resuma e comece de novo.
Sinalize o problema. Não ignore limites silenciosamente.

## Regra 7 — Evidencie Conflitos, Não os Mascare
Se dois padrões entrarem em contradição no código, escolha um (o mais recente ou mais testado).
Explique o porquê da escolha. Sinalize o outro padrão para limpeza futura.
Não misture padrões conflitantes.

## Regra 8 — Leia Antes de Escrever
Antes de adicionar código, leia os `exports`, os chamadores imediatos e as utilidades compartilhadas.
Assumir que "parece isolado" é perigoso. Se não tiver certeza de por que um código está estruturado de certa forma, pergunte ou pesquise.

## Regra 9 — Testes Verificam a Intenção, Não Apenas o Comportamento
Os testes devem codificar o POR QUÊ o comportamento importa, não apenas o QUE ele faz.
Um teste que não falha quando a regra de negócio muda é um teste inútil.

## Regra 10 — Faça Checkpoints Após Cada Passo Significativo
Resuma o que foi feito, o que foi verificado e o que falta.
Não continue de um estado que você não consegue descrever claramente.
Se perder o fio da meada, pare, respire e reavalie.

## Regra 11 — Siga as Convenções do Codebase (Mesmo que Discorde)
Conformidade > gosto pessoal dentro de um repositório existente.
Se você realmente acha que uma convenção é prejudicial, levante a questão com o usuário. Não crie um "fork" silencioso de estilos no código.

## Regra 12 — Falhe de Forma Barulhenta (Fail Loud)
Dizer "Concluído" é errado se qualquer passo ou verificação foi pulado silenciosamente.
Dizer "Os testes passam" é errado se algum foi ignorado.
Por padrão, deixe evidente a sua incerteza, nunca a esconda.

---

### Diretrizes Adicionais do Projeto (Tech Stack)
- **Monorepo:** Sem workspaces do NPM. Separação total de código na raiz (`/backend` e `/frontend`).
- **Orquestração:** Sempre utilize Docker (Docker Compose).
- **Backend:** NestJS + MySQL (TypeORM) + Redis (BullMQ).
- **Frontend:** Angular 18+ (Standalone Components) + Tailwind CSS + Atomic Design.
- **Ícones:** Utilizar `lucide-angular` (lucide.dev).
- **Scraping e Privacidade:** Playwright para scraping com suporte a Autenticação. Feeds públicos são deduplicados; feeds autenticados são estritamente isolados por usuário.
- **Login:** Suporte a Passkeys (WebAuthn).
- **Scripts Temporários (IA):** Sempre que for necessário criar scripts avulsos para testes rápidos, provas de conceito ou validações (ex: `test-alguma-coisa.js`), salve-os **obrigatoriamente** dentro da pasta `.ai-scripts/` na raiz do projeto.
