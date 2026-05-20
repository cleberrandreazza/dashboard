# Manual operacional — analistas Multiplan

## Objetivo

Garantir que o dashboard **não quebre** e que a base histórica permaneça consistente.

## Formato das planilhas

1. **Uma planilha por shopping** (PKB, BSS, PCN) — nome do arquivo deve conter o código do shopping.
2. **Abas matriciais**: métricas nas linhas, meses nas colunas (ex.: `Jan.26`, `Fev.26`).
3. **Não criar** aba separada para cada mês — o sistema faz o unpivot automaticamente.
4. **Append mensal**: envie o arquivo atualizado no mês; dados anteriores permanecem na base (use **Remover** em Uploads só para corrigir envios errados).

## Governança automática (sistema)

| Regra | Comportamento |
|-------|----------------|
| Duplicidade | Mesma métrica + período + plataforma + aba → mantém o maior valor |
| Período ausente | Aviso no upload; registro pode ser ignorado em agregações |
| Shopping desconhecido | Aceito com aviso (expansão regional) |
| Plataformas | Aliases no perfil (ex.: `ig` → Instagram) |

## Boas práticas (equivalente a dropdowns / campos bloqueados)

Use **nomes padronizados** nas métricas da planilha:

- Investimento, Impressões, Alcance, Sessões, GMV, Leads, Engajamento, Seguidores

Plataformas de mídia sugeridas:

- Meta, TikTok, Google, Programática, Streaming, Uber, Spotify, iFood

## Perfis de abas

Em **Perfis** no app:

- Edite regras por padrão de nome de aba (`Redes Sociais` → social, `Influs` → influencers).
- Não altere o perfil padrão `multiplan_regional_sul` sem alinhamento com BI.

## Dashboard — filtros globais

- **Comparação**: Mensal / Trimestral / Anual
- **Shopping**: vazio = visão regional com benchmark
- **Ano / Mês / Trimestre**: recorte da base; vazio = histórico completo

## Abas do dashboard executivo

| Aba | Conteúdo |
|-----|----------|
| Regional | KPIs totais, ranking shoppings, MoM e YoY |
| Por shopping | PKB, BSS, PCN individual |
| Evolução histórica | Série contínua + sazonalidade |
| Mídia | Plataformas e benchmark de canais |
| Social & creators | Redes, top creators |
| Executivo | Alertas, insights, KPIs do período |
| CRM / Operacional | Domínios multi e shopping |

## Quando remover um upload

Use **Uploads → lixeira** apenas se o arquivo foi enviado por engano. A remoção apaga métricas daquele envio na base histórica.

## Suporte

Diagnóstico das planilhas: `docs/MULTIPLAN_DIAGNOSTIC.md`  
Arquitetura: `docs/ARCHITECTURE.md`
