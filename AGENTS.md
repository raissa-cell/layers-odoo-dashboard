<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Odoo: SOMENTE LEITURA (READ-ONLY)

REGRA CRÍTICA E INEGOCIÁVEL: este projeto **NUNCA** escreve nem executa nada que
altere dados no Odoo. Toda interação com o Odoo é estritamente de leitura.

- Permitido: `search_read`, `read`, `read_group`, `search_count`, `fields_get`.
- PROIBIDO: `create`, `write`, `unlink`, `copy`, `action_*`, workflows, ou qualquer
  `execute_kw` que modifique/dispare algo no Odoo.

O client fica em `src/lib/odoo.ts` (`odooCall`). Ao adicionar novas features, use
apenas os métodos de leitura acima.

## Contexto de pré-vendas (SDR)
- Campo `crm.lead.sdr_id` (many2one → res.users) identifica o SDR.
- SDRs atuais: Luanna Santos de Almeida (id 103), Douglas da Costa Junior (id 104).
- Reuniões de qualificação: `sdr_meeting_start` (agendada) e `sdr_meeting_attended` (check-in/realizada).
- Time dedicado: `crm.team` "Pré-vendas" (id 4).
- Ordem do funil (stages): Novo → Sem contato → Contato → Agendado → NoShow →
  Qualified → Cotação Enviada → Proposta Visualizada → Pagamento confirmado (won) → Pedido Confirmado (won).
