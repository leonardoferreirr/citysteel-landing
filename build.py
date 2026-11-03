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
WHATSAPP = ""            # [A PREENCHER] só dígitos com DDI, ex.: 5511999999999. Vazio = Direct do Instagram
INSTAGRAM = "https://www.instagram.com/citysteel.oficial/"
INSTAGRAM_DM = "https://ig.me/m/citysteel.oficial"
ENDERECO = ("Alameda Araguaia, 2190, 10º andar", "Alphaville, Barueri, SP")
MAPA = "https://www.google.com/maps/search/?api=1&query=Alameda+Araguaia+2190+Alphaville+Barueri+SP"
GEO = (-23.4988791, -46.8502101)   # OpenStreetMap
# trecho do scroll do 3D usado no topo da /franquia (da estrutura à empresa pronta)
FRANQUIA_MAP = "0.45,1"

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
    srcset = f'/assets/img/{base}-900.webp 900w, /assets/img/{base}-1600.webp 1600w' if p900.exists() else ""
    attrs = f'src="/assets/img/{base}-1600.webp"'
    if srcset:
        attrs += f' srcset="{srcset}" sizes="{sizes}"'
    lz = ' loading="lazy"' if lazy else ""
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

# (imagem base, alt, título, texto). Fotos de banco ilustram o tipo de obra; trocar
# pelas obras reais da City Steel quando chegarem.
RAIL = [
    ("casa-1", "Casa contemporânea ao entardecer, com fachada escura e luz quente", "Casas de alto padrão",
     "Projetos exclusivos, com grandes vãos, fachada contemporânea e obra limpa no seu terreno."),
    ("loja-fachada", "Fachada de uma loja City Steel com letreiro e frente de vidro", "Lojas, escritórios e clínicas",
     "O ponto comercial fica pronto antes, e o seu negócio abre as portas mais cedo."),
    ("obra-1", "Estrutura de steel frame de uma casa em montagem", "Ampliações e segundo andar",
     "Estrutura leve, que pesa pouco sobre o que já existe. Ideal para subir um andar ou fazer um anexo."),
    ("casa-2", "Casa moderna com madeira, vidro e iluminação quente", "Espaços de lazer",
     "Área gourmet, edícula ou casa de campo, com a mesma precisão de uma obra grande."),
]

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


def rail_cards():
    out = []
    for i, (base, alt, t, p) in enumerate(RAIL):
        out.append(f'<article class="card rv" data-d="{min(i,3)}"><div class="frame"><div class="ph">'
                   f'{img(base, alt, sizes="(max-width:860px) 78vw, 34vw")}</div></div><h3>{t}</h3><p>{p}</p></article>')
    out.append('<article class="card card--cta rv" data-d="3"><div class="card__cta">'
               '<h3>Tem um projeto em mente?</h3><p>Mande a planta, o terreno ou só a ideia. '
               'A engenharia da City Steel mostra o caminho em aço.</p>'
               f'<a class="btn btn--pri" href="#contato">Falar com a engenharia {ARROW}</a></div></article>')
    return "\n        ".join(out)


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
    """Prancha de localização da sede: régua, anéis, varredura e coordenadas reais."""
    t = []
    for k in range(20, 581, 20):
        L = 14 if k % 100 == 0 else 6
        t += [f"M{k} 20v{L}", f"M{k} 580v-{L}", f"M20 {k}h{L}", f"M580 {k}h-{L}"]
    ticks = " ".join(t)
    lat, lon = dms(GEO[0], "N", "S"), dms(GEO[1], "L", "O")
    return f'''<svg viewBox="0 0 600 600" role="img" aria-label="Localização da sede da City Steel em Alphaville, Barueri">
<defs><linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF6A13"/><stop offset="1" stop-color="#FFA31A"/></linearGradient>
<radialGradient id="wedge" cx="300" cy="300" r="262" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FF6A13" stop-opacity=".22"/><stop offset="1" stop-color="#FF6A13" stop-opacity="0"/></radialGradient></defs>
<rect class="m-line" x="20" y="20" width="560" height="560"/>
<path class="m-line" d="{ticks}"/>
<path class="m-line" d="M20 300H580M300 20V580" stroke-dasharray="4 6"/>
<circle class="m-ring" cx="300" cy="300" r="70"/><circle class="m-ring" cx="300" cy="300" r="140"/><circle class="m-ring" cx="300" cy="300" r="210"/>
<circle class="m-ring" cx="300" cy="300" r="262" stroke-dasharray="2 8"/>
<g class="sweep"><path d="M300 300L300 38A262 262 0 0 1 431 73Z" fill="url(#wedge)"/><path class="m-acc" d="M300 300V38"/></g>
<circle class="m-acc pulse" cx="300" cy="300" r="60"/><circle class="m-acc pulse" cx="300" cy="300" r="60"/>
<rect x="293" y="293" width="14" height="14" fill="#FF6A13" transform="rotate(45 300 300)"/>
<text class="m-txt" x="40" y="58">{lat}</text><text class="m-txt" x="40" y="78">{lon}</text>
<text class="m-txt" x="560" y="58" text-anchor="end">N ↑</text>
<text class="m-big" x="40" y="548">Alphaville, Barueri</text><text class="m-txt" x="40" y="566">SEDE CITY STEEL</text>
</svg>'''


def schema(pagina):
    org = {
        "@context": "https://schema.org", "@type": "GeneralContractor",
        "name": "City Steel", "alternateName": "City Steel Steel Frame",
        "description": "Construção em steel frame do projeto à entrega, com engenharia que acompanha toda a obra e equipe de execução em todas as etapas. Franquia City Steel.",
        "url": DOMINIO + "/", "logo": DOMINIO + "/assets/img/logo-full.svg", "image": DOMINIO + "/assets/img/og-image.jpg",
        "address": {"@type": "PostalAddress", "streetAddress": ENDERECO[0], "addressLocality": "Barueri",
                    "addressRegion": "SP", "addressCountry": "BR"},
        "geo": {"@type": "GeoCoordinates", "latitude": GEO[0], "longitude": GEO[1]},
        "sameAs": [INSTAGRAM],
    }
    return f'<script type="application/ld+json">{json.dumps(org, ensure_ascii=False, separators=(",", ":"))}</script>'


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
        title="City Steel | Construção em steel frame, do projeto à entrega",
        desc="Construção em steel frame em Alphaville, Barueri e região: engenharia que projeta e acompanha toda a obra e equipe de execução em todas as etapas. Seja também um franqueado City Steel.",
        preload='<link rel="preload" as="image" href="/assets/img/hero-frame-poster.webp" media="(min-width:861px)" fetchpriority="high">\n'
                '<link rel="preload" as="image" href="/assets/img/hero-frame-poster-m.webp" media="(max-width:860px)" fetchpriority="high">',
        nav_franquia="", cta=("Fale com a gente", "/#contato")),
    "franquia": dict(
        arquivo="franquia.html", path="/franquia",
        title="Franquia City Steel | Empreenda no steel frame",
        desc="Abra uma unidade City Steel: modelo loja ou escritório (investimento de R$ 120.000) ou home office (R$ 9.900), com a engenharia e a execução da marca por trás.",
        preload='<link rel="preload" as="image" href="/assets/img/franquia-poster.webp" media="(min-width:861px)" fetchpriority="high">\n'
                '<link rel="preload" as="image" href="/assets/img/franquia-poster-m.webp" media="(max-width:860px)" fetchpriority="high">',
        nav_franquia=' aria-current="page"', cta=("Quero ser franqueado", "#form")),
    "obrigado": dict(
        arquivo="obrigado.html", path="/obrigado",
        title="City Steel | Abrindo a conversa", desc="Estamos abrindo a conversa com a equipe da City Steel.",
        preload="", nav_franquia="", cta=("", ""), robots="noindex,nofollow"),
}


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
        "IMG_ENG": "", "ALT_ENG": "", "IMG_EXE": "", "ALT_EXE": "",
    }
    # imagens das soluções (src cru porque ficam dentro de <img> no template)
    for chave, base, alt in (("ENG", "engenharia-1", "Projeto técnico de engenharia sobre a mesa"),
                             ("EXE", "execucao-1", "Equipe montando a estrutura de aço de uma obra")):
        blocos[f"IMG_{chave}"] = f"/assets/img/{base}-1600.webp"
        blocos[f"ALT_{chave}"] = alt
    jsv = hash_de(JS)
    for nome, pg in PAGINAS.items():
        robots = pg.get("robots") or ("index,follow" if INDEXAR else "noindex,nofollow")
        head = (head_t.replace("{{CSS}}", css).replace("{{TITLE}}", pg["title"]).replace("{{DESC}}", pg["desc"])
                .replace("{{URL}}", DOMINIO + pg["path"]).replace("{{DOMINIO}}", DOMINIO).replace("{{ROBOTS}}", robots)
                .replace("{{PRELOAD}}", pg["preload"]).replace("{{SCHEMA}}", schema(nome) if nome != "obrigado" else ""))
        top = (top_t.replace("{{NAV_FRANQUIA}}", pg["nav_franquia"])
               .replace("{{TOP_CTA}}", pg["cta"][0]).replace("{{TOP_CTA_HREF}}", pg["cta"][1]))
        foot = foot_t.replace("{{JSV}}", jsv).replace("{{MARQUEE}}", marquee())
        html = (SRC / f"{nome}.html").read_text()
        html = html.replace("{{HEAD}}", head).replace("{{TOP}}", top).replace("{{FOOT}}", foot)
        for k, v in blocos.items():
            html = html.replace("{{" + k + "}}", v)
        sobra = re.findall(r"\{\{[A-Z_0-9]+\}\}", html)
        if sobra:
            print(f"  ! {nome}: marcadores sem valor {sorted(set(sobra))}")
        (RAIZ / pg["arquivo"]).write_text(html)
        print(f"  {pg['arquivo']}: {len(html.encode())/1024:.1f} KB")

    # buscadores e assistentes de IA
    (RAIZ / "robots.txt").write_text(
        "User-agent: *\n" + ("Allow: /\n" if INDEXAR else "Disallow: /\n") + f"\nSitemap: {DOMINIO}/sitemap.xml\n")
    hoje = date.today().isoformat()
    urls = "".join(f"<url><loc>{DOMINIO}{p}</loc><lastmod>{hoje}</lastmod></url>" for p in ("/", "/franquia"))
    (RAIZ / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n')
    (RAIZ / "llms.txt").write_text(f"""# City Steel

> Construção em steel frame do projeto à entrega, com sede em Alphaville, Barueri (SP). Engenharia que projeta e acompanha toda a obra e equipe de execução em todas as etapas. A City Steel também é uma franquia.

## Páginas
- [Início]({DOMINIO}/): steel frame comparado à alvenaria, soluções de engenharia e execução, tipos de obra, sede e contato.
- [Franquia]({DOMINIO}/franquia): modelos loja ou escritório (investimento de R$ 120.000) e home office (R$ 9.900), e como virar franqueado.

## Sede
{ENDERECO[0]}, {ENDERECO[1]}
Instagram: {INSTAGRAM}
""")
    print(f"  site.js v={jsv}  frame3d.js v={hash_de(F3D)}  indexar={INDEXAR}  whatsapp={'sim' if WHATSAPP else 'NÃO (vai para o Direct)'}")


if __name__ == "__main__":
    main()
