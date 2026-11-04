#!/usr/bin/env python3
"""Contornos da logo para o letreiro do 3D (assets/js/frame3d.js).

Lê assets/img/logo-full.svg (a logo vetorizada), achata as curvas em pontos e
separa o símbolo, CITY STEEL, STEEL FRAME e os dois traços laranja. Grava
tools/logo-contornos.json com coordenadas normalizadas: x de 0 a 1 na
largura da logo, y de baixo para cima na mesma escala.

    python3 tools/logo_contornos.py   (depois, colar o JSON na constante LOGO do frame3d.js)
"""
import json, math, re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SVG = RAIZ / "assets/img/logo-full.svg"
SAIDA = RAIZ / "tools/logo-contornos.json"
TOL = 0.35          # unidades do SVG (577,5 de largura): erro máximo ao simplificar


def tokens(d):
    return re.findall(r"[A-Za-z]|[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?", d)


def arco(p0, rx, ry, rot, grande, horario, p1, passos=12):
    """Arco elíptico do SVG (endpoint) em pontos, pela conversão para centro."""
    if rx == 0 or ry == 0:
        return [p1]
    phi = math.radians(rot)
    cp, sp = math.cos(phi), math.sin(phi)
    dx, dy = (p0[0] - p1[0]) / 2, (p0[1] - p1[1]) / 2
    x1, y1 = cp * dx + sp * dy, -sp * dx + cp * dy
    rx, ry = abs(rx), abs(ry)
    lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry)
    if lam > 1:
        rx, ry = rx * math.sqrt(lam), ry * math.sqrt(lam)
    num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
    den = rx * rx * y1 * y1 + ry * ry * x1 * x1
    co = math.sqrt(max(0, num / den)) * (-1 if grande == horario else 1)
    cx1, cy1 = co * rx * y1 / ry, -co * ry * x1 / rx
    cx = cp * cx1 - sp * cy1 + (p0[0] + p1[0]) / 2
    cy = sp * cx1 + cp * cy1 + (p0[1] + p1[1]) / 2
    ang = lambda ux, uy, vx, vy: math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
    t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry)
    dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry)
    if not horario and dt > 0:
        dt -= 2 * math.pi
    elif horario and dt < 0:
        dt += 2 * math.pi
    out = []
    for i in range(1, passos + 1):
        t = t1 + dt * i / passos
        x, y = rx * math.cos(t), ry * math.sin(t)
        out.append((cp * x - sp * y + cx, sp * x + cp * y + cy))
    return out


def cubica(p0, c1, c2, p1, passos=10):
    out = []
    for i in range(1, passos + 1):
        t = i / passos; u = 1 - t
        out.append((u**3 * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t**3 * p1[0],
                    u**3 * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t**3 * p1[1]))
    return out


def contornos(d):
    """Lista de contornos fechados (listas de pontos) de um atributo d."""
    tk, i = tokens(d), 0
    cmd, cur, ini, ultimo_c2 = None, (0.0, 0.0), (0.0, 0.0), None
    todos, atual = [], []
    num = lambda: float(tk[i])
    while i < len(tk):
        if re.match(r"[A-Za-z]", tk[i]):
            cmd = tk[i]; i += 1
            if cmd in "zZ":
                if atual:
                    todos.append(atual)
                atual, cur, ultimo_c2 = [], ini, None
                continue
        rel = cmd.islower()
        C = cmd.upper()
        ox, oy = cur if rel else (0.0, 0.0)
        if C == "M":
            x, y = float(tk[i]) + ox, float(tk[i + 1]) + oy; i += 2
            if atual:
                todos.append(atual)
            cur = ini = (x, y); atual = [cur]
            cmd = "l" if rel else "L"          # pares seguintes viram linha
        elif C == "L":
            cur = (float(tk[i]) + ox, float(tk[i + 1]) + oy); i += 2; atual.append(cur)
        elif C == "H":
            cur = (float(tk[i]) + (cur[0] if rel else 0), cur[1]); i += 1; atual.append(cur)
        elif C == "V":
            cur = (cur[0], float(tk[i]) + (cur[1] if rel else 0)); i += 1; atual.append(cur)
        elif C == "C":
            v = [float(t) for t in tk[i:i + 6]]; i += 6
            c1, c2, p = (v[0] + ox, v[1] + oy), (v[2] + ox, v[3] + oy), (v[4] + ox, v[5] + oy)
            atual += cubica(cur, c1, c2, p); cur, ultimo_c2 = p, c2
            continue
        elif C == "S":
            v = [float(t) for t in tk[i:i + 4]]; i += 4
            c1 = (2 * cur[0] - ultimo_c2[0], 2 * cur[1] - ultimo_c2[1]) if ultimo_c2 else cur
            c2, p = (v[0] + ox, v[1] + oy), (v[2] + ox, v[3] + oy)
            atual += cubica(cur, c1, c2, p); cur, ultimo_c2 = p, c2
            continue
        elif C == "A":
            v = [float(t) for t in tk[i:i + 7]]; i += 7
            p = (v[5] + ox, v[6] + oy)
            atual += arco(cur, v[0], v[1], v[2], int(v[3]), int(v[4]), p); cur = p
        else:
            raise ValueError(f"comando não tratado: {cmd}")
        ultimo_c2 = None
    if atual:
        todos.append(atual)
    return [c for c in todos if len(c) > 2]


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    dx, dy = bx - ax, by - ay
    n = math.hypot(dx, dy) or 1e-9
    k, dmax = 0, 0.0
    for j in range(1, len(pts) - 1):
        px, py = pts[j]
        dd = abs(dy * px - dx * py + bx * ay - by * ax) / n
        if dd > dmax:
            k, dmax = j, dd
    if dmax <= eps:
        return [pts[0], pts[-1]]
    return rdp(pts[:k + 1], eps)[:-1] + rdp(pts[k:], eps)


def simplificar(c):
    """Contorno fechado: divide no ponto mais distante do início para o RDP não colapsar."""
    if c[0] == c[-1]:
        c = c[:-1]
    longe = max(range(len(c)), key=lambda j: math.dist(c[0], c[j]))
    a, b = rdp(c[:longe + 1], TOL), rdp(c[longe:] + [c[0]], TOL)
    return a[:-1] + b[:-1]


def main():
    s = SVG.read_text()
    vb = [float(x) for x in re.search(r'viewBox="([^"]+)"', s).group(1).split()]
    W, H = vb[2], vb[3]
    grupos = {"simbolo": [], "city": [], "frame": [], "linhas": []}
    for attrs in re.findall(r"<path ([^>]*)>", s):
        fill = re.search(r'fill="([^"]*)"', attrs).group(1)
        d = re.search(r'\sd="([^"]*)"', attrs).group(1)
        for c in contornos(d):
            ys = [p[1] for p in c]
            if fill.startswith("url"):
                grupos["simbolo"].append(simplificar(c))
            elif fill.upper() == "#FF6A13":
                xs = [p[0] for p in c]
                y = (min(ys) + max(ys)) / 2
                grupos["linhas"].append([(min(xs), y), (max(xs), y)])   # traço fino: vira uma linha só
            else:
                grupos["city" if max(ys) < 285 else "frame"].append(simplificar(c))
    # da esquerda para a direita (a ordem em que o letreiro se desenha)
    for k in ("simbolo", "city", "frame"):
        grupos[k].sort(key=lambda c: min(p[0] for p in c))
    norm = lambda c: [[round(x / W, 4), round((H - y) / W, 4)] for x, y in c]
    saida = {"aspecto": round(H / W, 5), **{k: [norm(c) for c in v] for k, v in grupos.items()}}
    SAIDA.write_text(json.dumps(saida, separators=(",", ":")))
    tot = sum(len(c) for k in grupos for c in grupos[k])
    print({k: len(v) for k, v in grupos.items()}, "pontos:", tot, f"{SAIDA.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
