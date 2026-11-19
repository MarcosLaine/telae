-- Dados iniciais (rodar depois do schema.sql)
insert into public.settings (id, data) values (1, '{
  "store_name": "Telaé",
  "tagline": "Bolsas artesanais em tela",
  "announcement": "Peças feitas à mão, sob encomenda • Enviamos para todo o Brasil",
  "whatsapp": "5537991985435",
  "instagram": "telaebolsas",
  "email": "",
  "pix_key": "",
  "pix_name": "Raquel Júnia",
  "city": "Bom Despacho - MG",
  "pickup_address": "Bom Despacho - MG (endereço combinado pelo WhatsApp)",
  "shipping_flat": 35,
  "free_shipping_over": 0,
  "production_note": "Cada peça é tecida à mão. Prazo de produção de até 15 dias úteis + envio.",
  "hero_title": "Uma joia em forma de bolsa",
  "hero_subtitle": "Bolsas tecidas à mão em tela, peça por peça, por Raquel Júnia. Exclusividade real, em quantidade limitada.",
  "about": "A Telaé nasceu das mãos da Raquel Júnia, em Bom Despacho (MG). Depois de anos criando peças artesanais, ela transformou a tradição da tela plástica em bolsas com acabamento de alta-costura: trama firme, materiais escolhidos a dedo, impermeabilização e ferragens douradas. Cada bolsa é feita sob encomenda, desmanchada e refeita quantas vezes for preciso até ficar perfeita. Não é só uma bolsa: é identidade, elegância e propósito em cada detalhe."
}'::jsonb)
on conflict (id) do nothing;

insert into public.categories (name, slug, sort) values
  ('Bolsas de mão', 'bolsas-de-mao', 1),
  ('Ombro', 'ombro', 2),
  ('Tiracolo', 'tiracolo', 3),
  ('Franjas', 'franjas', 4),
  ('Sacolas & Cestas', 'sacolas-e-cestas', 5)
on conflict (slug) do nothing;

with c as (select slug, id from public.categories)
insert into public.products (name, slug, description, price, category_id, images, colors, featured, sort) values
 ('Bolsa Nácar', 'nacar', 'Delicada, sofisticada e cheia de detalhes. Trama geométrica em tons de cru e branco, moldura em acetato tartaruga e corrente de elos perolados. Uma joia em forma de bolsa — e cabe tudo o que você precisa no dia a dia.', 389, (select id from c where slug='ombro'), '{assets/products/nacar.jpg}', '{Cru e branco}', true, 1),
 ('Bolsa Prisma', 'prisma', 'A pretinha nada básica. Geometria, personalidade e sofisticação: trama em xadrez preto, alça trançada e lenço preto e branco que transforma qualquer produção.', 349, (select id from c where slug='ombro'), '{assets/products/prisma.jpg}', '{Preto}', true, 2),
 ('Bolsa Âmbar', 'ambar', 'Compacta no tamanho e gigante na praticidade. Listras em preto, marrom, caramelo e cru que valorizam a trama artesanal — marcante sem perder a elegância.', 289, (select id from c where slug='tiracolo'), '{assets/products/ambar.jpg}', '{Terrosos}', true, 3),
 ('Bolsa Azul Serenity', 'azul-serenity', 'Uma cor que transforma delicadeza em presença. Trama em folhas azul serenity, fecho dourado e alça de pérolas. Da coleção Primavera/Verão 26/27.', 349, (select id from c where slug='tiracolo'), '{assets/products/azul-serenity.jpg}', '{Azul serenity}', true, 4),
 ('Bolsa Amarelo Manteiga', 'amarelo-manteiga', 'A delicadeza que ilumina a estação. Trama texturizada amarelo manteiga, fecho de moldura dourado e corrente acrílica.', 329, (select id from c where slug='ombro'), '{assets/products/amarelo-manteiga.jpg}', '{Amarelo manteiga}', false, 5),
 ('Bolsa Rubra', 'rubra', 'A bolsa vermelha que não espera ocasião especial. Franjas com contas, alças de argola douradas e corrente para usar transversal.', 369, (select id from c where slug='franjas'), '{assets/products/rubra.jpg}', '{Vermelho}', true, 6),
 ('Bolsa Franja Caramelo', 'franja-caramelo', 'Franjas com contas em tom caramelo e alças de argola douradas. Um acessório de moda para compor seus looks.', 369, (select id from c where slug='franjas'), '{assets/products/franja-caramelo.jpg}', '{Caramelo}', false, 7),
 ('Bolsa Franja Terracota', 'franja-terracota', 'Trama em espinha e franjas com contas em terracota, alças de argola douradas. Feita especialmente para ela.', 369, (select id from c where slug='franjas'), '{assets/products/franja-terracota.jpg}', '{Terracota}', false, 8),
 ('Bolsa Verde Militar', 'verde-militar', 'A inspiração da linha: trama em folhas verde militar, fecho dourado e alça de contas em madeira e verde.', 319, (select id from c where slug='bolsas-de-mao'), '{assets/products/verde-militar.jpg}', '{Verde militar}', false, 9),
 ('Bolsa Preta Contas', 'preta-contas', 'A mesma essência da Verde Militar em preto absoluto, com alça de contas facetadas pretas. A escolha da cliente.', 319, (select id from c where slug='bolsas-de-mao'), '{assets/products/preta-perolada.jpg}', '{Preto}', false, 10),
 ('Bolsa Azul Royal', 'azul-royal', 'Formato meia-lua em azul royal, trama geométrica e alça de contas azuis. Assim como uma flor, a beleza aparece aos poucos.', 299, (select id from c where slug='bolsas-de-mao'), '{assets/products/azul-royal.jpg}', '{Azul royal}', false, 11),
 ('Bolsa Perlla', 'perlla', 'Feita à mão com delicadeza e sofisticação: trama bege e branca e alça de pérolas para usar no ombro.', 329, (select id from c where slug='ombro'), '{assets/products/perlla.jpg}', '{Bege e branco}', false, 12),
 ('Bolsa Esmeralda', 'esmeralda', 'Trama em folhas verde com alça de pedras verdes e contas de madeira. Para quem não quer nada comum.', 349, (select id from c where slug='tiracolo'), '{assets/products/esmeralda.jpg}', '{Verde}', false, 13),
 ('Bolsa Vermelha Clássica', 'vermelha-classica', 'Trama canelada vermelha, alça metálica dourada e corrente removível. Clássica e cheia de presença.', 319, (select id from c where slug='bolsas-de-mao'), '{assets/products/vermelha-classica.jpg}', '{Vermelho}', false, 14),
 ('Bolsa Marrom Estruturada', 'marrom-estruturada', 'Bolsa estruturada em trama marrom com relevo, alça e fecho dourados.', 329, (select id from c where slug='bolsas-de-mao'), '{assets/products/marrom-estruturada.jpg}', '{Marrom}', false, 15),
 ('Bolsa Floral Bordada', 'floral-bordada', 'Trama cru com flor rosa bordada à mão, fecho dourado e corrente fina para usar transversal.', 289, (select id from c where slug='tiracolo'), '{assets/products/floral-bordada.jpg}', '{Cru com rosa}', false, 16),
 ('Bolsa Preta com Tachas', 'preta-tachas', 'Meia-lua preta com tachas douradas, fecho dourado e corrente.', 279, (select id from c where slug='tiracolo'), '{assets/products/preta-tachas.jpg}', '{Preto}', false, 17),
 ('Bolsa Listrada P&B', 'listrada-pb', 'Listras em preto e cru com aba preta e corrente. Um clássico atemporal.', 279, (select id from c where slug='tiracolo'), '{assets/products/listrada-couro.jpg}', '{Preto e cru}', false, 18),
 ('Sacola Zigue-Zague Vinho', 'zigue-zague-vinho', 'Sacola espaçosa em zigue-zague vinho e preto, com alças trançadas. Do mercado ao trabalho, com estilo.', 359, (select id from c where slug='sacolas-e-cestas'), '{assets/products/zigue-zague.jpg}', '{Vinho e preto}', true, 19),
 ('Sacola Marrom & Cru', 'sacola-marrom-cru', 'Zigue-zague em marrom e cru com alças de acetato tartaruga.', 339, (select id from c where slug='sacolas-e-cestas'), '{assets/products/sacola-marrom-cru.jpg}', '{Marrom e cru}', false, 20),
 ('Cesta Listrada', 'cesta-listrada', 'Cesta com listras diagonais em verde, laranja, branco e marrom e alça de madeira com contas.', 299, (select id from c where slug='sacolas-e-cestas'), '{assets/products/cesta-listrada.jpg}', '{Colorida}', false, 21)
on conflict (slug) do nothing;
