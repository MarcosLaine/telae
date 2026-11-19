# Telaé — loja virtual

Loja: https://marcoslaine.github.io/telae/
Painel admin: https://marcoslaine.github.io/telae/admin.html

## Como funciona
- **Site estático** (HTML/CSS/JS, sem build) hospedado de graça no GitHub Pages.
- **Supabase** (plano grátis) guarda produtos, categorias, pedidos, cupons e configurações; também faz o login do painel e guarda as fotos enviadas.
- **Checkout**: a cliente monta a sacola, informa dados e entrega (CEP preenchido automaticamente), escolhe Pix ou cartão por link. O pedido é gravado no painel com preços recalculados no servidor e ela envia o resumo pelo WhatsApp da loja. A página "Meu pedido" mostra o andamento (código + telefone).

## Liberar o primeiro administrador
1. Abra o painel e clique em **Primeiro acesso? Criar conta** → confirme pelo e-mail recebido.
2. No Supabase (projeto `telae-bolsas`) → **Table Editor → admins → Insert row** → coloque o mesmo e-mail → Save.
3. Recarregue o painel. Daí em diante, novos admins podem ser adicionados pela aba **Admins**.

## O que dá para alterar no painel
Pedidos (status, rastreio, notas, avisar cliente no WhatsApp) · Produtos (fotos, preço, oferta, cores, estoque ou sob encomenda, visível, destaque) · Categorias · Cupons · Loja (textos, WhatsApp, Instagram, **chave Pix**, frete fixo, frete grátis) · Admins.

## Observações
- Os preços cadastrados inicialmente são **provisórios** — ajuste no painel.
- No plano grátis, o Supabase pausa o projeto após 7 dias sem nenhum acesso; basta reativar no dashboard.
- Banco: `supabase/schema.sql` (estrutura e segurança) e `supabase/seed.sql` (dados iniciais).
