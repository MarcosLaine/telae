# Telaé — loja virtual

Loja: https://telaebolsas.vercel.app/
Painel admin: https://telaebolsas.vercel.app/admin.html

## Como funciona
- **Site estático** (HTML/CSS/JS, sem build) hospedado de graça na Vercel (deploy automático a cada push no GitHub).
- **Supabase** (plano grátis) guarda produtos, categorias, pedidos, cupons e configurações; também faz o login do painel e guarda as fotos enviadas.
- **Compra pelo WhatsApp**: não há carrinho nem pedido no site. Cada bolsa tem o botão "Quero esta", que abre o WhatsApp da loja (+55 37 99198-5435) com a mensagem pronta "Olá! Gostei da Bolsa X" + link da peça. Pagamento e entrega são combinados na conversa.

## Liberar o primeiro administrador
1. Abra o painel e clique em **Primeiro acesso? Criar conta** → confirme pelo e-mail recebido.
2. No Supabase (projeto `telae-bolsas`) → **Table Editor → admins → Insert row** → coloque o mesmo e-mail → Save.
3. Recarregue o painel. Daí em diante, novos admins podem ser adicionados pela aba **Admins**.

## O que dá para alterar no painel
Produtos (fotos, preço, oferta, cores, sob encomenda ou pronta entrega, visível, destaque) · Categorias · Loja (textos, número do WhatsApp, Instagram, prazo de produção) · Admins.

## Observações
- Os preços cadastrados inicialmente são **provisórios** — ajuste no painel.
- No plano grátis, o Supabase pausa o projeto após 7 dias sem nenhum acesso; basta reativar no dashboard.
- Banco: `supabase/schema.sql` (estrutura e segurança) e `supabase/seed.sql` (dados iniciais).
