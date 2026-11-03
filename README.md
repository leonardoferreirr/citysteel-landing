# City Steel — site

Site estático da City Steel (steel frame, Alphaville/Barueri SP): home com a história em 3D (a planta que vira a loja), comparativo com alvenaria, soluções, tipos de obra, sede, franquia e contato; página `/franquia` (destino do link da bio do Instagram) e `/obrigado` (ponte para o WhatsApp).

## Como editar

- Textos e blocos repetidos: `build.py` (comparativo, cards de obra, modelos, pilares, passos) e `_src/*.html` (páginas).
- Estilo: `assets/css/site.css` (vai minificado para dentro do `<head>`).
- Comportamento: `assets/js/site.js`. O 3D é `assets/js/frame3d.js` (three.js via CDN, carregado na primeira interação; até lá aparece o pôster).
- Depois de qualquer mudança: `python3 build.py`.
- Prévia local: `python3 tools/serve.py 4180` (imita o cleanUrls da Vercel). Fotos de conferência: `python3 tools/shots.py <pasta>`.

## Busca e IA (SEO, AEO e GEO)

- Tudo sai de `DOMINIO` no `build.py` (hoje `https://www.citysteel.com.br`): canonical, og:url, schema, `sitemap.xml`,
  `robots.txt` e `llms.txt`.
- Título e descrição do Google de cada página ficam em `PAGINAS` (`title` e `desc`). O h1 não muda.
- Schema (JSON-LD): Organization (a marca, com a franquia como Offer de R$ 120.000 e R$ 9.900, os preços que estão
  na página), GeneralContractor (a sede que constrói, com endereço, mapa, coordenadas e os serviços), WebSite, WebPage
  e BreadcrumbList na `/franquia`. Sem FAQPage, porque o site não mostra perguntas e respostas.
- O `llms.txt` repete os fatos do site (o que faz, tipos de obra, sede, comparativo, franquia, passos e contato),
  lidos das constantes do `build.py` e de `_src/index.html`.
- **Enquanto `INDEXAR = False`:** as páginas levam `noindex` (na meta e no cabeçalho `X-Robots-Tag` do `vercel.json`),
  o `robots.txt` deixa o Google ler (senão ele não enxerga o noindex) e barra os robôs de IA, e a imagem de
  compartilhamento sai do `citysteel.vercel.app` para a prévia do link no WhatsApp não ficar sem foto.
- **Busca local:** o endereço do schema é o mesmo do rodapé e da seção da sede (`ENDERECO`). O telefone do schema é o
  `WHATSAPP`, que hoje só aparece nos botões.

## Como trocar de domínio sem perder SEO

1. Ligue o domínio no projeto da Vercel (Settings, Domains), aponte o DNS como ela pedir e espere abrir com https.
   Faça isso ANTES do passo 3: com `INDEXAR = True`, o `citysteel.vercel.app` passa a redirecionar para o domínio.
2. Se o domínio for outro, troque `DOMINIO` no `build.py` (com `https://`, sem barra no fim).
3. Troque `INDEXAR = True` e rode `python3 build.py`. As páginas viram `index`, o `robots.txt` libera buscadores e IAs,
   o `X-Robots-Tag` sai do `vercel.json` e entra o redirect permanente do `citysteel.vercel.app` para o domínio
   (308, que o Google trata como 301).
4. Faça o push e confira, depois do deploy, que `https://citysteel.vercel.app/franquia` redireciona para o domínio.
5. No Google Search Console, cadastre o domínio e envie o `sitemap.xml`.

## Antes de ir ao ar

- `WHATSAPP` em `build.py` (só dígitos, com 55). Vazio = os formulários levam para o Direct do Instagram.
- Ligar citysteel.com.br e virar `INDEXAR = True` (passo a passo acima).
- Confirmar com a City Steel: os 4 passos para virar franqueado, as outras unidades e as fotos de obra reais (as fotos de banco estão em `IMAGENS-CREDITOS.md`).
