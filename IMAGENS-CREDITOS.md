# Créditos das imagens

Fotos de banco vêm do Unsplash, sob a [Licença Unsplash](https://unsplash.com/license): uso comercial livre, sem atribuição obrigatória. O crédito fica aqui como boa prática. As versões ficam em `assets/img/`, em WebP de 1600 e 900 px de largura (qualidade 78).

## Fotos de banco (Unsplash)

| Arquivo | O que mostra | Fotógrafo | Link |
|---|---|---|---|
| `obra-paineis-{1600,900}.webp` | Painéis de parede em steel frame: perfis escuros parafusados, com treliças | Anton Maksimov 5642.su (@juvnsky) | https://unsplash.com/photos/0KpU4Z4gfCo |
| `obra-tesouras-{1600,900}.webp` | Tesouras treliçadas de perfil galvanizado, em preto e branco | Anton Maksimov 5642.su (@juvnsky) | https://unsplash.com/photos/ieFQLMfamIo |
| `obra-casa-aerea-{1600,900}.webp` | Vista aérea de uma casa térrea em steel frame (perfis azuis) sobre o radier | Iain (@photoken123) | https://unsplash.com/photos/h39G3kOSLLA |
| `casa-entardecer-madeira-{1600,900}.webp` | Casa contemporânea com fachada de madeira em silhueta, céu laranja e roxo | Shot By Joe (@shotbyjoe) | https://unsplash.com/photos/BZhO1Os2iWE |
| `casa-pedra-vidro-{1600,900}.webp` | Casa térrea de vidro, madeira e pedra na hora azul, interior aceso e espelho d'água | Diego Marín (@diegosmarines) | https://unsplash.com/photos/mH_A2dRbuWw |
| `casa-volume-vidro-{1600,900}.webp` | Volume reto de laje plana com brises escuros e vidro do piso ao teto, aceso ao anoitecer | Alexander Faé (@alexfae) | https://unsplash.com/photos/SN0mu2M_Va0 |
| `engenharia-prancheta-{1600,900}.webp` | Mãos desenhando em prancha com escalímetro sobre mesa de madeira escura | Daniel McCullough (@d_mccullough) | https://unsplash.com/photos/-FPFq_trr2Y |
| `engenharia-cad-{1600,900}.webp` | Monitor com modelo 3D de estrutura metálica, mão no mouse ao fundo (a marca do monitor foi retocada) | Evgeniy Surzhan (@followtherabbit) | https://unsplash.com/photos/lVWozBOVY2M |
| `execucao-montagem-{1600,900}.webp` | Montador fixando perfis de uma estrutura metálica leve de dois pavimentos, contra o céu | Ben Koorengevel (@benkoorengevel) | https://unsplash.com/photos/JJ8dVYbVU_U |

## Material do cliente (City Steel)

| Arquivo | Origem |
|---|---|
| `loja-fachada-{1600,900}.webp` | `assets/src/loja-fachada.jpg` (o original tem 1341 px, por isso a versão "1600" ficou com 1341 px: não foi ampliada) |
| `home-office-{1600,900}.webp` | `assets/src/home-office-notebook.jpg` |
| `logo-mark.svg`, `logo-full.svg`, `logo-header.svg`, `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `og-image.jpg` | Vetorizados a partir de `assets/src/logo-original.jpg` |
| `engenharia-capacete-{1600,900}.webp` | `assets/src/engenharia-capacete.jpg` (WhatsApp, 04/11; 1254 px, não ampliada) |
| `equipe-city-steel-{1600,900}.webp` | `assets/src/equipe-city-steel.png` (WhatsApp, 04/11; 933 px, não ampliada) |
| `obra-condominio-{1600,900}.webp`, `obra-residencia-…`, `obra-comercial-…` | `assets/src/obra-*.jpg` (WhatsApp, 04/11; 1280 px). Fotos e textos dos cards de soluções |

## Páginas de obras
`/obras/<categoria>` sai do `RAIL` no `build.py` (template `_src/obra.html`): o último item de cada card é o slug e a lista de fotos do álbum.
Hoje os álbuns misturam a foto do cliente com fotos de banco da mesma categoria. Trocar pelas obras reais quando chegarem:
basta salvar `assets/img/<nome>-{1600,900}.webp`, pôr o nome na lista do card e a legenda em `ALT_ALBUM`.
