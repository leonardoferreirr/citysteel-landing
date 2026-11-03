# City Steel — site

Site estático da City Steel (steel frame, Alphaville/Barueri SP): home com a história em 3D (a planta que vira a loja), comparativo com alvenaria, soluções, tipos de obra, sede, franquia e contato; página `/franquia` (destino do link da bio do Instagram) e `/obrigado` (ponte para o WhatsApp).

## Como editar

- Textos e blocos repetidos: `build.py` (comparativo, cards de obra, modelos, pilares, passos) e `_src/*.html` (páginas).
- Estilo: `assets/css/site.css` (vai minificado para dentro do `<head>`).
- Comportamento: `assets/js/site.js`. O 3D é `assets/js/frame3d.js` (three.js via CDN, carregado na primeira interação; até lá aparece o pôster).
- Depois de qualquer mudança: `python3 build.py`.
- Prévia local: `python3 tools/serve.py 4180` (imita o cleanUrls da Vercel). Fotos de conferência: `python3 tools/shots.py <pasta>`.

## Antes de ir ao ar

- `WHATSAPP` em `build.py` (só dígitos, com 55). Vazio = os formulários levam para o Direct do Instagram.
- `INDEXAR = True` quando o domínio citysteel.com.br estiver ligado na Vercel.
- Confirmar com a City Steel: os 4 passos para virar franqueado, as outras unidades e as fotos de obra reais (as fotos de banco estão em `IMAGENS-CREDITOS.md`).
