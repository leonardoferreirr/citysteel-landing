#!/usr/bin/env python3
"""Monta o site da City Steel a partir de _src/ e gera os arquivos da raiz.

    python3 build.py

- Junta head, cabeçalho e rodapé em cada página (index, franquia, obrigado).
- Minifica assets/css/site.css e injeta no <head>: servido como arquivo, o CSS
  segura a primeira pintura no celular.
- Carimba site.js e frame3d.js com o hash do conteúdo (o Vercel guarda /assets/
  em cache; nome com versão evita visitante preso no JS velho).
- Gera robots.txt, sitemap.xml, llms.txt e o schema (JSON-LD).

Os dados da empresa moram aqui em cima. O que ainda falta do cliente está
marcado com [A PREENCHER].
"""
import hashlib, json, re
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).parent
SRC = RAIZ / "_src"
CSS = RAIZ / "assets/css/site.css"
JS = RAIZ / "assets/js/site.js"
F3D = RAIZ / "assets/js/frame3d.js"
IMG = RAIZ / "assets/img"

DOMINIO = "https://www.citysteel.com.br"
INDEXAR = False          # True só quando o domínio estiver ligado na Vercel
WHATSAPP = "5524998593556"  # só dígitos com DDI. Vazio = Direct do Instagram
INSTAGRAM = "https://www.instagram.com/citysteel.oficial/"
INSTAGRAM_DM = "https://ig.me/m/citysteel.oficial"
ENDERECO = ("Alameda Araguaia, 2190, 10º andar", "Alphaville, Barueri, SP")
MAPA = "https://www.google.com/maps/search/?api=1&query=Alameda+Araguaia+2190+Alphaville+Barueri+SP"
GEO = (-23.5013991, -46.8408001)   # Alameda Araguaia, 2190 (Google Maps); o mapa usa o mesmo ponto
# trecho do scroll do 3D usado no topo da /franquia (da estrutura à empresa pronta)
FRANQUIA_MAP = "0.45,1"
# Endereço da Vercel. Com INDEXAR = True, ele ganha redirect permanente para o DOMINIO no vercel.json.
VERCEL = "citysteel.vercel.app"
# Imagem de compartilhamento: enquanto o domínio não responde, ela sai do endereço da Vercel, senão a
# prévia do link no WhatsApp fica sem foto. Com INDEXAR = True, tudo sai do DOMINIO.
OG_BASE = DOMINIO if INDEXAR else f"https://{VERCEL}"
# robôs de IA que ficam fora enquanto INDEXAR = False (o Google lê para enxergar o noindex)
ROBOS_IA = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User",
            "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot", "meta-externalagent"]

ARROW = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5"/></svg>'


# ---------------------------------------------------------------- imagens
def img(base, alt, sizes="(max-width:860px) 92vw, 46vw", w=1600, h=1067, lazy=True):
    """<img> responsivo a partir de base-900.webp e base-1600.webp em assets/img."""
    p900, p1600 = IMG / f"{base}-900.webp", IMG / f"{base}-1600.webp"
    if not p1600.exists():
        print(f"  ! imagem faltando: {base}-1600.webp")
    try:
        from PIL import Image
        with Image.open(p1600) as im:
            w, h = im.size
    except Exception:
        pass
    # o descritor do srcset usa a largura real (a fachada do cliente tem 1341 px, não 1600)
    srcset = f'/assets/img/{base}-900.webp 900w, /assets/img/{base}-1600.webp {w}w' if p900.exists() else ""
    attrs = f'src="/assets/img/{base}-1600.webp"'
    if srcset:
        attrs += f' srcset="{srcset}" sizes="{sizes}"'
    lz = ' loading="lazy"' if lazy else (' fetchpriority="high"' if lazy is None else "")
    return f'<img {attrs} alt="{alt}" width="{w}" height="{h}"{lz} decoding="async">'


# ---------------------------------------------------------------- conteúdo
CMP = [
    ("Prazo da obra", "Depende de tijolo, massa e tempo de secagem.",
     "Estrutura cortada na medida e montada a seco: a obra anda mais rápido."),
    ("Canteiro", "Caçamba na porta, entulho e muito desperdício.",
     "Obra limpa, com pouco entulho e material na medida."),
    ("Precisão", "Prumo e esquadro dependem da mão de cada pedreiro.",
     "Perfis de fábrica, no prumo e no esquadro desde a primeira peça."),
    ("Água na obra", "Muita água para massa, reboco e concreto.",
     "Montagem a seco, com pouca água."),
    ("Orçamento", "Surpresas no meio do caminho.",
     "Projeto fechado antes de começar, com menos imprevisto."),
    ("Conforto", "Isolamento térmico e acústico só com reforço extra.",
     "Paredes em camadas, com isolamento térmico e acústico."),
]

# (imagem base, alt, título, texto, fotos da página de obras, slug em /obras/<slug>). As fotos principais e os textos vieram do
# cliente em 04/11; os álbuns ainda têm foto de banco. Trocar pelas obras reais quando chegarem.
# Em 05/11 o cliente pediu para tirar "Ampliações e segundo andar" e "Espaços de lazer" (as URLs antigas redirecionam no vercel.json).
RAIL = [
    ("obra-condominio", "Portaria de um condomínio residencial com paisagismo iluminado ao entardecer", "Empreendimentos imobiliários",
     "Realizamos empreendimentos imobiliários desenvolvidos com tecnologia Steel Frame.",
     ["obra-condominio", "obra-casa-aerea", "execucao-montagem", "obra-paineis"], "empreendimentos"),
    ("obra-residencia", "Residência contemporânea de dois pavimentos com pedra, vidro e garagem coberta, iluminada à noite", "Residências exclusivas",
     "Construímos residências exclusivas, unindo arquitetura sofisticada, tecnologia construtiva, precisão e excelência em cada detalhe.",
     ["obra-residencia", "casa-volume-vidro", "casa-entardecer-madeira", "obra-casa-aerea"], "residencias"),
    ("obra-comercial", "Prédio comercial de dois andares com fachada de vidro, madeira e pedra, iluminado ao anoitecer", "Projetos comerciais",
     "Transformamos projetos comerciais em realidade através da tecnologia Steel Frame. Construímos lojas, escritórios, galpões e "
     "espaços corporativos com agilidade, precisão, eficiência e alto padrão de acabamento, oferecendo soluções modernas para empresas e investidores.",
     ["obra-comercial", "loja-fachada", "engenharia-cad", "obra-tesouras"], "comerciais"),
]
# legenda de cada foto dentro do álbum
ALT_ALBUM = {
    "obra-condominio": "Portaria de condomínio residencial ao entardecer",
    "obra-residencia": "Residência contemporânea de dois pavimentos, iluminada à noite",
    "obra-comercial": "Prédio comercial com fachada de vidro e madeira",
    "obra-casa-aerea": "Vista aérea de uma casa térrea com a estrutura em steel frame montada",
    "execucao-montagem": "Montagem dos perfis de aço de uma estrutura de dois pavimentos",
    "obra-paineis": "Painéis de parede em steel frame, com perfis parafusados",
    "obra-tesouras": "Tesouras treliçadas de perfil de aço galvanizado",
    "casa-volume-vidro": "Casa de laje plana com brises e vidro do piso ao teto",
    "casa-entardecer-madeira": "Casa contemporânea com fachada de madeira ao entardecer",
    "loja-fachada": "Fachada de loja City Steel com letreiro iluminado",
    "engenharia-cad": "Modelo 3D da estrutura metálica no computador",
    "casa-pedra-vidro": "Casa térrea de vidro, madeira e pedra na hora azul",
}

MODELOS = [
    {
        "img": "loja-fachada", "alt": "Loja City Steel com letreiro iluminado e frente de vidro",
        "nome": "Loja ou escritório",
        "texto": "Para quem deseja uma presença física, com espaço para atendimento, relacionamento e desenvolvimento de negócios locais.",
        "itens": ["Loja ou escritório para atendimento presencial", "Presença comercial na região de atuação",
                  "Ambiente para reuniões e relacionamento com clientes", "Modelo para quem busca uma estrutura física"],
        "preco": "R$ 120.000",
    },
    {
        "img": "home-office", "alt": "Notebook com a marca City Steel numa mesa de escritório em casa",
        "nome": "Home office",
        "texto": "Uma alternativa para começar com estrutura mais leve e flexibilidade para desenvolver clientes e oportunidades comerciais.",
        "itens": ["Operação sem loja aberta ao público", "Mais flexibilidade de local de trabalho",
                  "Foco em prospecção e relacionamento comercial", "Modelo pensado para iniciar com menor investimento"],
        "preco": "R$ 9.900",
    },
]

PILARES = [
    ("Negócio escalável", "O steel frame é usado há décadas em outros países e cresce rápido no Brasil. "
     "É um método que se repete com o mesmo padrão em qualquer cidade."),
    ("Alta demanda", "Quem vai construir quer obra mais rápida, mais limpa e com prazo. "
     "Esse cliente já está na sua região, procurando quem faça."),
    ("Suporte completo", "Da implantação ao crescimento da sua unidade, você tem a City Steel do lado."),
    ("Engenharia e obra por trás", "A sua unidade conta com a engenharia que projeta e acompanha toda a obra "
     "e com a equipe que executa todas as etapas."),
]

# [A PREENCHER] confirmar o processo com a City Steel
PASSOS = [
    ("Você manda seus dados", "Preencha o formulário com a sua cidade e o modelo que te interessa."),
    ("Conversa com o nosso time", "Apresentamos o modelo de negócio e tiramos as suas dúvidas."),
    ("Circular de Oferta", "Você recebe a Circular de Oferta de Franquia, com as regras e os números, para avaliar com calma."),
    ("Contrato e implantação", "Assinatura do contrato e início da sua unidade, com o suporte da City Steel."),
]

MARQ = [("City Steel", "f"), ("Steel Frame", "o"), ("Engenharia", ""), ("Execução", ""), ("Franquia", "o")]


# ---------------------------------------------------------------- blocos
def cota(medida):
    lado = ('<svg viewBox="0 0 100 14" preserveAspectRatio="none"><line class="cota__l" x1="0" y1="7" x2="100" y2="7" pathLength="1"/>'
            '<line x1="0" y1="0" x2="0" y2="14"/><line x1="100" y1="0" x2="100" y2="14"/></svg>')
    return f'<div class="cota" aria-hidden="true">{lado}<span>{medida}</span>{lado}</div>'


def cmp_rows():
    return "\n        ".join(
        f'<div class="cmp__row rv" role="row"><span class="cmp__k" role="rowheader">{k}</span>'
        f'<span class="cmp__a" role="cell">{a}</span><span class="cmp__b" role="cell">{b}</span></div>'
        for k, a, b in CMP)


def album_json(bases):
    """Fotos do álbum para o data-album: grande, média, legenda e largura real."""
    from PIL import Image
    fotos = []
    for base in bases:
        p = IMG / f"{base}-1600.webp"
        if not p.exists():
            print(f"  ! álbum: falta {base}-1600.webp")
            continue
        with Image.open(p) as im:
            w, h = im.size
        fotos.append({"s": f"/assets/img/{base}-1600.webp", "m": f"/assets/img/{base}-900.webp", "a": ALT_ALBUM.get(base, ""), "w": w, "h": h})
    return json.dumps(fotos, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


ALBUM_HTML = """<dialog class="album" id="album" aria-label="Fotos da obra">
  <div class="album__topo"><p><span class="album__titulo"></span><span class="album__n"></span></p>
    <button class="album__fecha" type="button" aria-label="Fechar álbum"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.5"/></svg></button></div>
  <div class="album__palco">
    <button class="album__seta album__seta--ant" type="button" aria-label="Foto anterior"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M14 8H3M7 4L3 8l4 4" stroke="currentColor" stroke-width="1.5"/></svg></button>
    <img alt="" decoding="async">
    <button class="album__seta album__seta--prox" type="button" aria-label="Próxima foto"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5"/></svg></button>
  </div>
  <p class="album__legenda"></p>
  <div class="album__miniaturas"></div>
</dialog>"""


def rail_cards():
    out = []
    for i, (base, alt, t, p, _fotos, slug) in enumerate(RAIL):
        ver = (f'<a class="btn btn--pri card__ver" href="/obras/{slug}" target="_blank" rel="noopener" '
               f'aria-label="Ver obras de {t.lower()} (abre em outra guia)">Ver obras {ARROW}</a>')
        out.append(f'<article class="card rv" data-d="{min(i,3)}"><div class="frame"><div class="ph">'
                   f'{img(base, alt, sizes="(max-width:860px) 78vw, 34vw")}</div></div><h3>{t}</h3><p>{p}</p>{ver}</article>')
    return "\n        ".join(out)


def obra_blocos(i):
    """Marcadores da página /obras/<slug>: título, texto, galeria, outras categorias e o visualizador."""
    base, alt, titulo, texto, fotos, slug = RAIL[i]
    galeria = []
    for k, f in enumerate(fotos):
        legenda = ALT_ALBUM.get(f, alt)
        galeria.append(f'<button class="galeria__item rv" data-d="{min(k,3)}" type="button" data-foto="{k}" aria-label="Ampliar: {legenda}">'
                       f'{img(f, legenda, sizes="(max-width:860px) 92vw, 60vw" if k == 0 else "(max-width:860px) 92vw, 40vw", lazy=True if k else None)}</button>')
    outras = []
    for j, (b2, a2, t2, _p2, _f2, s2) in enumerate(RAIL):
        if j == i:
            continue
        outras.append(f'<a class="outra rv" data-d="{min(len(outras),3)}" href="/obras/{s2}"><div class="ph">'
                      f'{img(b2, a2, sizes="(max-width:860px) 46vw, 22vw")}</div><span>{t2} {ARROW}</span></a>')
    dados = f'<script type="application/json" id="album-fotos">{album_json(fotos)}</script>'
    return {"OBRA_TITULO": titulo, "OBRA_TEXTO": texto, "OBRA_FOTOS": "\n        ".join(galeria),
            "OBRA_OUTRAS": "\n        ".join(outras), "ALBUM": ALBUM_HTML + "\n" + dados}


def models(completo):
    out = []
    for i, m in enumerate(MODELOS):
        lista = ""
        if completo:
            lista = '<ul class="model__list">' + "".join(f"<li>{x}</li>" for x in m["itens"]) + "</ul>"
            cta = f'<a class="btn btn--pri" href="#form" data-modelo="{m["nome"]}">Quero este modelo {ARROW}</a>'
        else:
            cta = f'<a class="btn btn--line" href="/franquia#modelos">Ver a franquia {ARROW}</a>'
        out.append(
            f'<article class="model rv" data-d="{i}"><div class="ph">{img(m["img"], m["alt"], sizes="(max-width:860px) 92vw, 46vw")}</div>'
            f'<div class="model__body"><h3>{m["nome"]}</h3><p>{m["texto"]}</p>{lista}'
            f'<div class="model__price"><small>Investimento</small><strong>{m["preco"]}</strong></div>{cta}</div></article>')
    return "\n        ".join(out)


def pilares():
    return "\n        ".join(
        f'<article class="pil" style="--i:{i}"><b>{i+1:02d}</b><h3>{t}</h3><p>{p}</p></article>'
        for i, (t, p) in enumerate(PILARES))


def passos():
    return "\n        ".join(
        f'<div class="step rv" data-d="{i}"><b>{i+1:02d}</b><h3>{t}</h3><p>{p}</p></div>'
        for i, (t, p) in enumerate(PASSOS))


def marquee():
    seq = "".join(f'<span class="{c}">{t}</span>' for t, c in MARQ)
    return seq + seq


def dms(v, pos, neg):
    s = pos if v >= 0 else neg
    v = abs(v); d = int(v); m = int((v - d) * 60); sec = round(((v - d) * 60 - m) * 60)
    return f"{d}°{m:02d}′{sec:02d}″{s}"


def mira():
    """Prancha da sede: ruas reais de Alphaville (OpenStreetMap) em linha fina,
    régua, varredura e coordenadas. A sede fica no centro (300,300)."""
    import sys
    sys.path.insert(0, str(RAIZ / "tools"))
    from mapa_osm import mapa
    t = []
    for k in range(20, 581, 20):
        L = 14 if k % 100 == 0 else 6
        t += [f"M{k} 20v{L}", f"M{k} 580v-{L}", f"M20 {k}h{L}", f"M580 {k}h-{L}"]
    ticks = " ".join(t)
    lat, lon = dms(GEO[0], "N", "S"), dms(GEO[1], "L", "O")
    return f'''<svg viewBox="0 0 600 600" role="img" aria-label="Mapa de Alphaville com a sede da City Steel na Alameda Araguaia">
<defs><linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF6A13"/><stop offset="1" stop-color="#FFA31A"/></linearGradient>
<radialGradient id="wedge" cx="300" cy="300" r="262" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FF6A13" stop-opacity=".2"/><stop offset="1" stop-color="#FF6A13" stop-opacity="0"/></radialGradient>
<radialGradient id="vinheta" cx="300" cy="300" r="300" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="#0A0A0B" stop-opacity="0"/><stop offset="1" stop-color="#0A0A0B" stop-opacity=".85"/></radialGradient>
<clipPath id="quadro"><rect x="20" y="20" width="560" height="560"/></clipPath></defs>
{mapa()}
<rect x="20" y="20" width="560" height="560" fill="url(#vinheta)"/>
<rect class="m-line" x="20" y="20" width="560" height="560"/>
<path class="m-line" d="{ticks}"/>
<path class="m-line m-cross" d="M20 300H580M300 20V580" stroke-dasharray="4 6"/>
<circle class="m-ring" cx="300" cy="300" r="120"/>
<circle class="m-ring" cx="300" cy="300" r="262" stroke-dasharray="2 8"/>
<g class="sweep"><path d="M300 300L300 38A262 262 0 0 1 431 73Z" fill="url(#wedge)"/><path class="m-acc" d="M300 300V38"/></g>
<circle class="m-acc pulse" cx="300" cy="300" r="60"/><circle class="m-acc pulse" cx="300" cy="300" r="60"/>
<rect x="293" y="293" width="14" height="14" fill="#FF6A13" transform="rotate(45 300 300)"/>
<g class="m-tag"><rect x="40" y="36" width="150" height="54" fill="#0A0A0B" fill-opacity=".8"/><text class="m-txt" x="48" y="58">{lat}</text><text class="m-txt" x="48" y="78">{lon}</text></g>
<text class="m-txt" x="560" y="58" text-anchor="end">N ↑</text>
<g class="m-tag"><rect x="34" y="520" width="232" height="56" fill="#0A0A0B" fill-opacity=".8"/><text class="m-big" x="40" y="548">Alphaville, Barueri</text><text class="m-txt" x="40" y="566">SEDE CITY STEEL</text></g>
</svg>'''


def texto(frag):
    from html import unescape
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", "", frag))).strip()


def fone():
    """WHATSAPP (5524998593556) no formato +55 24 99859-3556."""
    w = WHATSAPP
    return f"+{w[:2]} {w[2:4]} {w[4:-4]}-{w[-4:]}" if len(w) >= 12 else ""


def solucoes():
    """Engenharia e execução, lidas do _src/index.html: (título, texto, itens)."""
    src = (SRC / "index.html").read_text()
    return [(texto(h), texto(p), [texto(re.sub(r"<b>.*?</b>", "", li)) for li in re.findall(r"<li>(.*?)</li>", ul)])
            for h, p, ul in re.findall(r'<article class="sol[^"]*">.*?<h3>(.*?)</h3>\s*<p>(.*?)</p>\s*<ul class="sol__list">(.*?)</ul>',
                                       src, flags=re.S)]


def schema(nome, pg):
    """Grafo JSON-LD: a marca (Organization, com a franquia), a sede que constrói (GeneralContractor),
    o site e a página. Sem FAQPage: o site não mostra perguntas e respostas."""
    S, url = DOMINIO, DOMINIO + pg["path"]
    org, sede = {"@id": f"{S}/#organizacao"}, {"@id": f"{S}/#sede"}
    bairro, cidade = ENDERECO[1].split(",")[0].strip(), "Barueri"
    endereco = {"@type": "PostalAddress", "streetAddress": f"{ENDERECO[0]}, {bairro}", "addressLocality": cidade,
                "addressRegion": "SP", "addressCountry": "BR"}
    oferta = lambda nome_, desc, tipo, quem: {"@type": "Offer", "itemOffered": {
        "@type": "Service", "name": nome_, "description": desc, "serviceType": tipo, "provider": quem}}
    franquia = []
    for m in MODELOS:
        o = oferta(f"Franquia City Steel, modelo {m['nome'].lower()}", m["texto"], "Franquia de construção em steel frame", org)
        o.update({"name": f"Investimento na franquia City Steel, modelo {m['nome'].lower()}",
                  "price": re.sub(r"\D", "", m["preco"]), "priceCurrency": "BRL", "url": f"{S}/franquia#modelos",
                  "category": "Franquia", "seller": org})
        franquia.append(o)
    obras = [oferta(t, p, "Construção em steel frame", sede) for _, _, t, p, *_ in RAIL]
    servicos = [oferta(h.rstrip("."), f"{p} Inclui: {'; '.join(i).lower()}.", "Construção em steel frame", sede) for h, p, i in solucoes()]
    marca = {"@type": "Organization", **org, "name": "City Steel", "alternateName": "City Steel Steel Frame",
             "description": "Construção em steel frame do projeto à entrega e franquia de construção em steel frame, "
                            "com sede em Alphaville, Barueri (SP).",
             "url": f"{S}/", "logo": {"@type": "ImageObject", "url": f"{S}/assets/img/logo-full.svg"},
             "image": f"{S}/assets/img/og-image.jpg", "address": endereco, "sameAs": [INSTAGRAM],
             "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Franquia City Steel", "itemListElement": franquia}}
    obra = {"@type": "GeneralContractor", **sede, "name": "City Steel", "parentOrganization": org,
            "description": "Construção em steel frame do projeto à entrega: engenharia que projeta e acompanha toda a obra "
                           "e equipe de execução em todas as etapas.",
            "url": f"{S}/", "image": f"{S}/assets/img/og-image.jpg", "logo": f"{S}/assets/img/logo-full.svg",
            "address": endereco, "geo": {"@type": "GeoCoordinates", "latitude": GEO[0], "longitude": GEO[1]},
            "hasMap": MAPA, "sameAs": [INSTAGRAM], "knowsAbout": ["Steel frame", "Construção a seco", "Estrutura em aço"],
            "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Construção em steel frame",
                                "itemListElement": servicos + obras}}
    if WHATSAPP:
        obra["telephone"] = fone()
        marca["contactPoint"] = {"@type": "ContactPoint", "telephone": fone(), "contactType": "sales",
                                 "availableLanguage": "pt-BR"}
    pagina = {"@type": "WebPage", "@id": f"{url}#pagina", "url": url, "name": pg["title"], "description": pg["desc"],
              "isPartOf": {"@id": f"{S}/#site"}, "about": org if nome == "franquia" else sede, "inLanguage": "pt-BR",
              "primaryImageOfPage": {"@type": "ImageObject", "url": f"{S}/assets/img/og-image.jpg", "width": 1200, "height": 630}}
    grafo = [marca, obra, {"@type": "WebSite", "@id": f"{S}/#site", "url": f"{S}/", "name": "City Steel",
                           "inLanguage": "pt-BR", "publisher": org}, pagina]
    if pg["path"] != "/":
        pagina["breadcrumb"] = {"@id": f"{url}#trilha"}
        grafo.append({"@type": "BreadcrumbList", "@id": f"{url}#trilha", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Início", "item": f"{S}/"},
            {"@type": "ListItem", "position": 2, "name": pg["trilha"], "item": url}]})
    js = json.dumps({"@context": "https://schema.org", "@graph": grafo}, ensure_ascii=False, separators=(",", ":"))
    return '<script type="application/ld+json">' + js.replace("</", "<\\/") + "</script>"


def llms():
    """Fatos do site para assistentes de IA, nas mesmas palavras das páginas."""
    S = DOMINIO
    idx, fra = (SRC / "index.html").read_text(), (SRC / "franquia.html").read_text()
    abre = lambda h: texto(re.search(r'<div class="beat beat--0"[^>]*>.*?<p>(.*?)</p>', h, flags=re.S).group(1))
    por_que = texto(re.search(r'Por que abrir uma.*?<p[^>]*>(.*?)</p>', fra, flags=re.S).group(1))
    lin = ["# City Steel", "",
           f"> {abre(idx)} Sede em {ENDERECO[0]}, {ENDERECO[1]}. A City Steel também é uma franquia: "
           + " ou ".join(f"{m['nome'].lower()} ({m['preco']})" for m in MODELOS) + ".", "",
           "## Em poucas palavras", "",
           "- Empresa: City Steel (no logo, City Steel Steel Frame).",
           "- O que faz: construção em steel frame do projeto à entrega, com engenharia que projeta e acompanha "
           "toda a obra e equipe de execução em todas as etapas.",
           "- Tipos de obra: " + "; ".join(t.lower() for _, _, t, *_ in RAIL) + ".",
           f"- Sede: {ENDERECO[0]}, {ENDERECO[1]}.",
           "- Unidades: a sede fica em Alphaville, Barueri, e a rede de unidades está começando agora.",
           "- Franquia: " + "; ".join(f"{m['nome'].lower()}, investimento de {m['preco']}" for m in MODELOS) + ".",
           "- Preço de obra: não é publicado no site.",
           f"- Contato: WhatsApp {fone()}, Instagram @citysteel.oficial." if WHATSAPP else "- Contato: Instagram @citysteel.oficial.",
           "", "## Construção em steel frame", ""]
    for h, p, itens in solucoes():
        lin += [f"### {h.rstrip('.')}", "", p, ""] + [f"- {i}" for i in itens] + [""]
    lin += ["### Steel frame comparado à alvenaria", ""]
    lin += [f"- **{k}:** alvenaria: {a} Steel frame City Steel: {b}" for k, a, b in CMP]
    lin += ["", "### Tipos de obra", ""] + [f"- **{t}:** {p}" for _, _, t, p, *_ in RAIL]
    lin += ["", "## Franquia City Steel", "", abre(fra), "", "### Modelos", ""]
    for m in MODELOS:
        lin += [f"- **{m['nome']}, investimento de {m['preco']}:** {m['texto']} Pontos do modelo: " + "; ".join(i.lower() for i in m["itens"]) + "."]
    lin += ["", "### Por que abrir uma City Steel", "", por_que, ""] + [f"- **{t}:** {p}" for t, p in PILARES]
    lin += ["", "### Como virar franqueado", ""] + [f"{i}. **{t}.** {p}" for i, (t, p) in enumerate(PASSOS, 1)]
    lin += ["", "## Páginas", "",
            f"- [Início]({S}/): steel frame comparado à alvenaria, engenharia e execução, tipos de obra, sede e contato.",
            f"- [Franquia]({S}/franquia): modelos, investimento e como virar franqueado.",
            "", "## Contato", ""]
    if WHATSAPP:
        lin += [f"- WhatsApp: {fone()} (https://wa.me/{WHATSAPP})"]
    lin += [f"- Construir com a City Steel: {S}/#contato", f"- Ser franqueado: {S}/franquia#form",
            f"- Instagram: {INSTAGRAM}", f"- Sede: {ENDERECO[0]}, {ENDERECO[1]} ({MAPA})", ""]
    return "\n".join(lin)


def robots_txt():
    if INDEXAR:
        corpo = ("# Buscadores e assistentes de IA podem ler o site inteiro.\n"
                 "# A /obrigado fica fora do índice pelo noindex dela, não por aqui.\n"
                 "User-agent: *\nAllow: /\n\n")
    else:
        # Disallow geral esconderia o noindex do Google, e a página podia aparecer sem descrição
        corpo = ("# Pré-lançamento (INDEXAR = False): o Google lê as páginas para ver o noindex delas,\n"
                 "# e os robôs de IA ficam fora até o domínio entrar no ar.\n"
                 "User-agent: *\nAllow: /\n\n" + "".join(f"User-agent: {b}\nDisallow: /\n\n" for b in ROBOS_IA))
    return corpo + f"Sitemap: {DOMINIO}/sitemap.xml\n"


def vercel_json():
    """Com INDEXAR = True: redirect permanente do .vercel.app para o DOMINIO (308, que o Google trata como 301).
    Com INDEXAR = False: cabeçalho X-Robots-Tag noindex em tudo (vale também para llms.txt e imagens)."""
    arq = RAIZ / "vercel.json"
    atual = arq.read_text()
    cfg = json.loads(atual)
    redir = [r for r in cfg.get("redirects", []) if not any(h.get("value") == VERCEL for h in r.get("has", []))]
    if INDEXAR and VERCEL not in DOMINIO:
        host = [{"type": "host", "value": VERCEL}]
        # a raiz vai à parte: na Vercel o "/:path*" não pega a página inicial
        redir += [{"source": "/", "has": host, "destination": f"{DOMINIO}/", "permanent": True},
                  {"source": "/:path*", "has": host, "destination": f"{DOMINIO}/:path*", "permanent": True}]
    if redir:
        cfg["redirects"] = redir
    else:
        cfg.pop("redirects", None)
    cab = [h for h in cfg.get("headers", []) if not any(x["key"] == "X-Robots-Tag" for x in h["headers"])]
    if not INDEXAR:
        cab.append({"source": "/(.*)", "headers": [{"key": "X-Robots-Tag", "value": "noindex"}]})
    cfg["headers"] = cab
    if cfg != json.loads(atual):
        arq.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n")


# ---------------------------------------------------------------- montagem
def minificar(css):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = re.sub(r"\s*\n\s*", "\n", css)
    css = re.sub(r"\s*([{}:;,>])\s*", r"\1", css)
    css = re.sub(r";}", "}", css)
    css = re.sub(r"\n+", "", css)
    return css.replace("../fonts/", "/assets/fonts/").strip()


def hash_de(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()[:10] if p.exists() else "0"


def carimbar_f3d():
    """Grava em site.js o caminho do frame3d.js com a versão atual."""
    if not JS.exists():
        return
    js = JS.read_text()
    novo = re.sub(r"/assets/js/frame3d\.js(\?v=[a-z0-9]+)?", f"/assets/js/frame3d.js?v={hash_de(F3D)}", js)
    if novo != js:
        JS.write_text(novo)


PAGINAS = {
    "index": dict(
        arquivo="index.html", path="/",
        title="Construção em steel frame em Alphaville e Barueri | City Steel",
        desc="Construção em steel frame em Alphaville, Barueri (SP): engenharia que projeta e acompanha toda a obra e equipe de execução, do projeto à entrega.",
        preload='<link rel="preload" as="image" href="/assets/img/hero-frame-poster.webp" media="(min-width:861px)" fetchpriority="high">\n'
                '<link rel="preload" as="image" href="/assets/img/hero-frame-poster-m.webp" media="(max-width:860px)" fetchpriority="high">',
        nav_franquia="", cta=("Fale com a gente", "/#contato")),
    "franquia": dict(
        arquivo="franquia.html", path="/franquia",
        title="Franquia de steel frame a partir de R$ 9.900 | City Steel", trilha="Franquia",
        desc="Franquia de construção em steel frame: loja ou escritório (R$ 120.000) ou home office (R$ 9.900), com a engenharia e a execução da City Steel por trás.",
        preload='<link rel="preload" as="image" href="/assets/img/franquia-poster.webp" media="(min-width:861px)" fetchpriority="high">\n'
                '<link rel="preload" as="image" href="/assets/img/franquia-poster-m.webp" media="(max-width:860px)" fetchpriority="high">',
        nav_franquia=' aria-current="page"', cta=("Quero ser franqueado", "#form")),
    "obrigado": dict(
        arquivo="obrigado.html", path="/obrigado",
        title="City Steel | Abrindo a conversa", desc="Estamos abrindo a conversa com a equipe da City Steel.",
        preload="", nav_franquia="", cta=("", ""), robots="noindex,nofollow"),
}

def preload_img(base, sizes):
    from PIL import Image
    with Image.open(IMG / f"{base}-1600.webp") as im:
        w = im.size[0]
    return (f'<link rel="preload" as="image" imagesrcset="/assets/img/{base}-900.webp 900w, /assets/img/{base}-1600.webp {w}w" '
            f'imagesizes="{sizes}" fetchpriority="high">')


for _i, (_b, _a, _t, _p, _f, _s) in enumerate(RAIL):
    PAGINAS[f"obra-{_s}"] = dict(
        arquivo=f"obras/{_s}.html", path=f"/obras/{_s}", tpl="obra", obra=_i,
        title=f"{_t} em steel frame | Obras City Steel", trilha=_t, desc=_p if len(_p) <= 160 else _p[:157].rsplit(" ", 1)[0] + "...",
        preload=preload_img(_f[0], "(max-width:860px) 92vw, 60vw"), nav_franquia="", cta=("Fale com a gente", "/#contato"))


def main():
    carimbar_f3d()
    css = minificar(CSS.read_text())
    head_t, top_t, foot_t = (SRC / "head.html").read_text(), (SRC / "top.html").read_text(), (SRC / "foot.html").read_text()
    end_html = f"{ENDERECO[0]}<br>{ENDERECO[1]}"
    blocos = {
        "ARROW": ARROW, "CMP_ROWS": cmp_rows(), "RAIL_CARDS": rail_cards(), "MIRA": mira(),
        "MODELS_HOME": models(False), "MODELS_FULL": models(True), "PILARES": pilares(), "STEPS": passos(),
        "COTA_1": cota("12 000"), "COTA_2": cota("8 400"), "COTA_3": cota("6 000"),
        "ENDERECO_HTML": end_html, "MAPA": MAPA, "INSTAGRAM": INSTAGRAM, "INSTAGRAM_DM": INSTAGRAM_DM,
        "WHATSAPP": WHATSAPP, "FRANQUIA_MAP": FRANQUIA_MAP, "ANO": str(date.today().year),
        "IMG_ENG": "", "IMG_EXE": "",
    }
    # imagens das soluções (src cru porque ficam dentro de <img> no template)
    for chave, base, alt in (("ENG", "engenharia-capacete", "Capacete da City Steel sobre o projeto da estrutura em steel frame, com a obra ao fundo"),
                             ("EXE", "equipe-city-steel", "Equipe da City Steel de uniforme e capacete diante de uma obra em steel frame")):
        blocos[f"IMG_{chave}"] = img(base, alt, sizes="(max-width:860px) 92vw, 46vw")
    jsv = hash_de(JS)
    mudou = set()
    for nome, pg in PAGINAS.items():
        robots = pg.get("robots") or ("index,follow,max-image-preview:large" if INDEXAR else "noindex,nofollow")
        head = (head_t.replace("{{CSS}}", css).replace("{{TITLE}}", pg["title"]).replace("{{DESC}}", pg["desc"])
                .replace("{{URL}}", DOMINIO + pg["path"]).replace("{{DOMINIO}}", DOMINIO).replace("{{ROBOTS}}", robots)
                .replace("{{OG_BASE}}", OG_BASE)
                .replace("{{PRELOAD}}", pg["preload"]).replace("{{SCHEMA}}", schema(nome, pg) if nome != "obrigado" else ""))
        top = (top_t.replace("{{NAV_FRANQUIA}}", pg["nav_franquia"])
               .replace("{{TOP_CTA}}", pg["cta"][0]).replace("{{TOP_CTA_HREF}}", pg["cta"][1]))
        foot = foot_t.replace("{{JSV}}", jsv).replace("{{MARQUEE}}", marquee())
        html = (SRC / f"{pg.get('tpl', nome)}.html").read_text()
        html = html.replace("{{HEAD}}", head).replace("{{TOP}}", top).replace("{{FOOT}}", foot)
        proprios = obra_blocos(pg["obra"]) if "obra" in pg else {}
        for k, v in {**blocos, **proprios}.items():
            html = html.replace("{{" + k + "}}", v)
        sobra = re.findall(r"\{\{[A-Z_0-9]+\}\}", html)
        if sobra:
            print(f"  ! {nome}: marcadores sem valor {sorted(set(sobra))}")
        destino = RAIZ / pg["arquivo"]
        destino.parent.mkdir(parents=True, exist_ok=True)
        if not destino.exists() or destino.read_text() != html:
            mudou.add(pg["path"])
            destino.write_text(html)
        print(f"  {pg['arquivo']}: {len(html.encode())/1024:.1f} KB")

    # buscadores e assistentes de IA: tudo sai do DOMINIO
    (RAIZ / "robots.txt").write_text(robots_txt())
    mapa = RAIZ / "sitemap.xml"
    antes = dict(re.findall(r"<loc>https?://[^/<]+(/[^<]*)</loc><lastmod>([\d-]+)</lastmod>", mapa.read_text())) if mapa.exists() else {}
    hoje = date.today().isoformat()
    urls = "".join(f"  <url><loc>{DOMINIO}{p}</loc><lastmod>{hoje if p in mudou or p not in antes else antes[p]}</lastmod></url>\n"
                   for p in ["/", "/franquia"] + [f"/obras/{r[-1]}" for r in RAIL])
    mapa.write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
    (RAIZ / "llms.txt").write_text(llms())
    vercel_json()
    print(f"  site.js v={jsv}  frame3d.js v={hash_de(F3D)}  indexar={INDEXAR}  whatsapp={'sim' if WHATSAPP else 'NÃO (vai para o Direct)'}")


if __name__ == "__main__":
    main()
