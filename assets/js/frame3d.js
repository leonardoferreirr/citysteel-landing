// City Steel: a loja em prancha de engenharia, animada.
// Planta (0-0,25) -> estrutura (0,25-0,60) -> fachada (0,60-0,85) -> empresa pronta (0,85-1).
// Tudo e linha: um unico InstancedBufferGeometry com shader proprio de linha em pixels
// (largura constante, antisserrilhado, traçado progressivo por segmento). Nenhum addon.
//
// API: mountFrame(canvas, { mobile, reducedMotion, poster }) -> { setProgress, pause, resume, dispose, ready, info }
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

export const PHASES = {
  projeto: [0, 0.25],
  estrutura: [0.25, 0.6],
  fachada: [0.6, 0.85],
  pronta: [0.85, 1],
};

/** ate onde a introducao desenha sozinha (planta pronta + primeiras colunas subindo) */
export const INTRO_END = 0.25;
const INTRO_MS = 2400;

const TOKENS = {
  bg: '#0A0A0B',
  accent: '#FF6A13',
  accentHi: '#FFA31A',
  steel: '#8C939C',
  fg: '#F4F2EF',
};

// tipos de linha (iKind)
const K = { GRID: 0, STEEL: 1, ACCENT: 2, HI: 3, FG: 4 };

// ---------------------------------------------------------------------------
// fonte de traço (estilo plotter/CAD): caixa 4 x 6, origem embaixo a esquerda
const GLYPHS = {
  A: [[[0, 0], [2, 6], [4, 0]], [[0.8, 2.2], [3.2, 2.2]]],
  B: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]], [[3, 3], [4, 2], [4, 1], [3, 0], [0, 0]]],
  C: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1]]],
  D: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 1], [3, 0], [0, 0]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  G: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1], [4, 3], [2, 3]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[2, 0], [2, 6]], [[1, 6], [3, 6]], [[1, 0], [3, 0]]],
  J: [[[4, 6], [4, 1], [3, 0], [1, 0], [0, 1]]],
  K: [[[0, 0], [0, 6]], [[4, 6], [0, 2.4]], [[1.4, 3.4], [4, 0]]],
  L: [[[0, 6], [0, 0], [4, 0]]],
  M: [[[0, 0], [0, 6], [2, 3], [4, 6], [4, 0]]],
  N: [[[0, 0], [0, 6], [4, 0], [4, 6]]],
  O: [[[1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 1], [3, 0], [1, 0]]],
  P: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]]],
  Q: [[[1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 1], [3, 0], [1, 0]], [[2.5, 1.5], [4, 0]]],
  R: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]], [[2, 3], [4, 0]]],
  S: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 4], [1, 3], [3, 3], [4, 2], [4, 1], [3, 0], [1, 0], [0, 1]]],
  T: [[[0, 6], [4, 6]], [[2, 6], [2, 0]]],
  U: [[[0, 6], [0, 1], [1, 0], [3, 0], [4, 1], [4, 6]]],
  V: [[[0, 6], [2, 0], [4, 6]]],
  W: [[[0, 6], [1, 0], [2, 4], [3, 0], [4, 6]]],
  X: [[[0, 0], [4, 6]], [[0, 6], [4, 0]]],
  Y: [[[0, 6], [2, 3], [4, 6]], [[2, 3], [2, 0]]],
  Z: [[[0, 6], [4, 6], [0, 0], [4, 0]]],
  0: [[[1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 1], [3, 0], [1, 0]], [[0.6, 0.8], [3.4, 5.2]]],
  1: [[[0.8, 4.8], [2, 6], [2, 0]], [[1, 0], [3, 0]]],
  2: [[[0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [0, 0], [4, 0]]],
  3: [[[0, 6], [4, 6], [2, 3.4], [3, 3.4], [4, 2.4], [4, 1], [3, 0], [1, 0], [0, 1]]],
  4: [[[3, 0], [3, 6], [0, 2], [4, 2]]],
  5: [[[4, 6], [0, 6], [0, 3.2], [3, 3.2], [4, 2.2], [4, 1], [3, 0], [1, 0], [0, 1]]],
  6: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]]],
  7: [[[0, 6], [4, 6], [1.4, 0]]],
  8: [[[1, 3], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3]]],
  9: [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 4], [1, 3], [4, 3]]],
  '.': [[[0.7, 0], [1.3, 0], [1.3, 0.6], [0.7, 0.6], [0.7, 0]]],
  ',': [[[1.2, 0.6], [0.6, -0.7]]],
  ':': [[[0.7, 1], [1.3, 1], [1.3, 1.6], [0.7, 1.6], [0.7, 1]], [[0.7, 3.6], [1.3, 3.6], [1.3, 4.2], [0.7, 4.2], [0.7, 3.6]]],
  '-': [[[0.6, 3], [3.4, 3]]],
  '+': [[[2, 1.2], [2, 4.8]], [[0.2, 3], [3.8, 3]]],
  '/': [[[0.4, 0], [3.6, 6]]],
  '²': [[[0.3, 4.6], [0.8, 5.2], [1.8, 5.2], [2.3, 4.6], [2.3, 4.2], [0.3, 2.8], [2.3, 2.8]]],
};
// acentos: a base mais o traço acima da caixa alta (agudo, til, cedilha)
const ACUTE = [[1.6, 6.9], [2.6, 7.7]];
for (const [acc, base] of [['Á', 'A'], ['É', 'E'], ['Í', 'I'], ['Ó', 'O'], ['Ú', 'U']]) GLYPHS[acc] = [...GLYPHS[base], ACUTE];
GLYPHS['Ã'] = [...GLYPHS.A, [[1, 7], [1.6, 7.6], [2.4, 7], [3, 7.6]]];
GLYPHS['Ç'] = [...GLYPHS.C, [[2.3, 0], [2.3, -0.6], [1.6, -1]]];
const GLYPH_W = { '.': 2, ',': 2, ':': 2, ' ': 3, '²': 2.6 };
const GAP = 1.5;

// logo da City Steel em contornos, fiel ao logo-full.svg (gerado por tools/logo_contornos.py):
// x de 0 a 1 na largura da logo, y para cima na mesma escala; aspecto = altura / largura
const LOGO = {"aspecto":0.54459,"simbolo":[[[0.4222,0.4532],[0.2525,0.3654],[0.2525,0.2279],[0.4222,0.2279],[0.4222,0.27],[0.3011,0.27],[0.3011,0.3522],[0.4222,0.4102]],[[0.4724,0.5198],[0.4062,0.4802],[0.4062,0.4539],[0.4443,0.4741],[0.4443,0.2279],[0.4724,0.2279]],[[0.5138,0.5446],[0.488,0.5294],[0.488,0.2279],[0.5162,0.2279],[0.5162,0.5179],[0.5467,0.4987],[0.5467,0.4639],[0.565,0.4551],[0.565,0.5089]],[[0.5541,0.4525],[0.5505,0.4535],[0.5449,0.4527],[0.5404,0.4493],[0.5382,0.4441],[0.538,0.3394],[0.5388,0.3345],[0.5411,0.3301],[0.5446,0.3267],[0.5491,0.3245],[0.7022,0.2771],[0.7022,0.27],[0.538,0.27],[0.538,0.2279],[0.7359,0.2279],[0.7391,0.2283],[0.7433,0.2304],[0.7464,0.2339],[0.7479,0.2384],[0.7481,0.3001],[0.578,0.3602],[0.578,0.396],[0.7481,0.324],[0.7481,0.3631]]],"city":[[[0.0405,0.1716],[0.0284,0.1685],[0.0172,0.162],[0.0091,0.1536],[0.0028,0.142],[0.0,0.1299],[0.0002,0.1136],[0.0042,0.0997],[0.0083,0.0921],[0.0142,0.0853],[0.0203,0.0803],[0.0287,0.076],[0.0372,0.0738],[0.1129,0.0732],[0.1132,0.0945],[0.0445,0.0949],[0.0377,0.0966],[0.0326,0.0996],[0.0286,0.1037],[0.0246,0.1117],[0.0231,0.1222],[0.0248,0.134],[0.0285,0.1412],[0.0339,0.1464],[0.0412,0.1495],[0.1131,0.1501],[0.1129,0.1716]],[[0.1273,0.1716],[0.1273,0.0734],[0.1503,0.0732],[0.1508,0.1711]],[[0.1648,0.1718],[0.1642,0.1704],[0.1642,0.1501],[0.2036,0.1499],[0.2042,0.0732],[0.2277,0.0732],[0.2277,0.15],[0.2677,0.15],[0.2681,0.1714]],[[0.2771,0.1718],[0.275,0.1716],[0.2748,0.1707],[0.3229,0.1051],[0.3229,0.0732],[0.3468,0.0735],[0.3468,0.1055],[0.3955,0.1716],[0.3675,0.1712],[0.3352,0.1273],[0.3022,0.1718]],[[0.4682,0.1716],[0.4591,0.1697],[0.4527,0.1665],[0.4452,0.1584],[0.4432,0.1541],[0.4414,0.1477],[0.4413,0.1365],[0.4442,0.1274],[0.4473,0.1226],[0.4548,0.1163],[0.4654,0.1124],[0.5219,0.1121],[0.5254,0.1106],[0.5274,0.1084],[0.5283,0.1012],[0.5266,0.0975],[0.5219,0.0947],[0.4421,0.0947],[0.4426,0.0731],[0.5259,0.0733],[0.5324,0.0747],[0.5397,0.0781],[0.5449,0.0828],[0.5481,0.0871],[0.5508,0.0939],[0.552,0.1003],[0.5515,0.1087],[0.5498,0.1153],[0.5468,0.1208],[0.5427,0.1255],[0.5373,0.1292],[0.5254,0.1328],[0.4712,0.1328],[0.4658,0.1361],[0.4643,0.1419],[0.4668,0.1477],[0.4717,0.15],[0.5467,0.15],[0.5468,0.1716]],[[0.5609,0.1718],[0.5602,0.1704],[0.5602,0.1501],[0.5995,0.1499],[0.6002,0.0732],[0.6237,0.0734],[0.6237,0.15],[0.6635,0.15],[0.6641,0.1714]],[[0.6802,0.1718],[0.6798,0.0736],[0.7771,0.0731],[0.778,0.0738],[0.778,0.0942],[0.7773,0.0951],[0.7032,0.0951],[0.7038,0.1123],[0.7726,0.1124],[0.7725,0.1328],[0.7035,0.1328],[0.7031,0.1348],[0.7035,0.1498],[0.7773,0.1498],[0.778,0.1506],[0.778,0.1711],[0.7773,0.1718]],[[0.795,0.1718],[0.7946,0.0738],[0.8919,0.0732],[0.8928,0.0739],[0.8928,0.0942],[0.8921,0.0951],[0.818,0.0951],[0.8184,0.1123],[0.8874,0.1124],[0.8873,0.133],[0.8184,0.133],[0.8179,0.1349],[0.8184,0.15],[0.8921,0.15],[0.8928,0.1508],[0.8928,0.1713]],[[0.9094,0.1716],[0.9091,0.0732],[1.0,0.0736],[1.0,0.0947],[0.9328,0.0951],[0.9328,0.1713]]],"frame":[[[0.2036,0.0312],[0.1988,0.0289],[0.1967,0.026],[0.196,0.021],[0.1978,0.016],[0.2026,0.0132],[0.2197,0.0126],[0.2215,0.011],[0.2217,0.0084],[0.2204,0.0065],[0.2189,0.006],[0.1971,0.0059],[0.1969,0.0004],[0.2213,0.0002],[0.2248,0.0018],[0.2272,0.0047],[0.2281,0.0083],[0.2279,0.0121],[0.2258,0.0158],[0.2206,0.0185],[0.2044,0.0188],[0.2031,0.0197],[0.2024,0.0225],[0.2034,0.0245],[0.2051,0.0252],[0.2261,0.0255],[0.2261,0.0312]],[[0.2545,0.031],[0.2547,0.0255],[0.2665,0.0251],[0.2669,0.0009],[0.2682,0.0],[0.2732,0.0005],[0.2732,0.0248],[0.2852,0.0253],[0.286,0.0262],[0.2859,0.031]],[[0.3146,0.0313],[0.3141,0.0007],[0.3427,0.0002],[0.3425,0.0059],[0.3207,0.0064],[0.3207,0.0128],[0.341,0.0128],[0.3412,0.0181],[0.3205,0.0187],[0.3203,0.0211],[0.3207,0.0253],[0.3423,0.0253],[0.3425,0.031]],[[0.3728,0.0312],[0.3725,0.0007],[0.4009,0.0002],[0.4007,0.0059],[0.3789,0.0064],[0.3789,0.0128],[0.3991,0.0128],[0.3994,0.0181],[0.3789,0.0185],[0.3786,0.0219],[0.3789,0.0251],[0.4005,0.0251],[0.4007,0.031]],[[0.4306,0.031],[0.4303,0.0003],[0.4572,0.0002],[0.457,0.0061],[0.4367,0.0061],[0.4367,0.0306]],[[0.5193,0.0313],[0.5193,0.0002],[0.525,0.0006],[0.5252,0.0113],[0.5451,0.0121],[0.5451,0.0177],[0.5255,0.0177],[0.5253,0.0235],[0.5255,0.0253],[0.5467,0.0253],[0.5465,0.0313]],[[0.5759,0.0312],[0.5752,0.0308],[0.5754,0.0004],[0.5812,0.0006],[0.5818,0.0097],[0.5912,0.0097],[0.6002,0.0002],[0.6074,0.0003],[0.599,0.0097],[0.6045,0.012],[0.6072,0.0167],[0.6071,0.0253],[0.6048,0.0287],[0.6,0.0312]],[[0.5988,0.0251],[0.6007,0.0235],[0.6014,0.0204],[0.6008,0.0176],[0.5991,0.0159],[0.5818,0.0161],[0.5818,0.0251]],[[0.6519,0.0315],[0.6496,0.0298],[0.6341,0.0004],[0.6403,0.0003],[0.6442,0.0062],[0.663,0.0064],[0.6668,0.0002],[0.6728,0.0003],[0.6576,0.0309]],[[0.6551,0.0225],[0.6598,0.0124],[0.6476,0.0124],[0.6528,0.0235],[0.654,0.0246]],[[0.7013,0.0313],[0.7009,0.0004],[0.7069,0.0006],[0.7073,0.0212],[0.7181,0.003],[0.7212,0.0021],[0.7241,0.0029],[0.7353,0.0209],[0.7354,0.0007],[0.7363,-0.0],[0.7416,0.0007],[0.7416,0.031],[0.7344,0.031],[0.7213,0.0098],[0.7081,0.0313]],[[0.7719,0.0312],[0.7716,0.0007],[0.8,0.0002],[0.7998,0.0059],[0.778,0.0064],[0.778,0.0128],[0.7983,0.0128],[0.7986,0.0181],[0.778,0.0185],[0.7777,0.0219],[0.778,0.0251],[0.7997,0.0251],[0.8,0.031]]],"linhas":[[[0.0031,0.0178],[0.1609,0.0178]],[[0.839,0.0178],[0.9971,0.0178]]]};

// caixa do letreiro (m): usada pela cena e pelo painel opaco
const SIGN = { y0: 5.0, y1: 7.8, z0: -0.9, z1: 0.35, w: 12 };

// ---------------------------------------------------------------------------
// shaders
const VERT = /* glsl */ `
precision highp float;
attribute vec3 iStart; attribute vec3 iEnd; attribute vec3 iTime;
attribute float iKind; attribute float iWidth; attribute float iAlpha;
uniform vec2 uRes; uniform float uT; uniform float uDpr; uniform float uHalo; uniform float uHaloW;
varying float vAlong; varying float vAcross; varying float vR; varying float vLpx;
varying float vKind; varying float vAlpha; varying float vW; varying float vY; varying float vDepth;
void main() {
  float r = clamp((uT - iTime.x) / max(iTime.y - iTime.x, 1e-4), 0.0, 1.0);
  vR = r; vKind = iKind;
  // iTime.z > 0: o elemento some suavemente a partir desse instante (ex.: esqueleto do letreiro)
  vAlpha = iAlpha * (iTime.z > 0.0 ? 1.0 - smoothstep(iTime.z, iTime.z + 0.07, uT) : 1.0);
  if (r <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vAlong = 0.0; vAcross = 0.0; vLpx = 1.0; vW = 1.0; vY = 0.0; vDepth = 0.0; vAlpha = 0.0; return; }
  vec4 ms = modelViewMatrix * vec4(iStart, 1.0);
  vec4 me = modelViewMatrix * vec4(iEnd, 1.0);
  vec4 cs = projectionMatrix * ms;
  vec4 ce = projectionMatrix * me;
  vec2 hr = uRes * 0.5;
  vec2 ps = cs.xy / cs.w * hr;
  vec2 pe = ce.xy / ce.w * hr;
  vec2 d = pe - ps;
  float L = max(length(d), 1e-3);
  vec2 dir = d / L;
  vec2 n = vec2(-dir.y, dir.x);
  float w = iWidth * uDpr * mix(1.0, uHaloW, uHalo);
  float cap = (w + 1.0) * 0.5;
  float along = position.y;
  float sgn = along < 0.5 ? -1.0 : 1.0;
  vec4 c = mix(cs, ce, along);
  vec2 p = c.xy / c.w * hr;
  p += n * (position.x * cap) + dir * (sgn * cap);
  c.xy = p / hr * c.w;
  gl_Position = c;
  vAlong = along + sgn * cap / L;
  vAcross = position.x;
  vLpx = L; vW = w;
  vY = mix(iStart.y, iEnd.y, along);
  vDepth = -mix(ms.z, me.z, along);
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform vec3 uAccent; uniform vec3 uAccentHi; uniform vec3 uSteel; uniform vec3 uFg;
uniform float uGlow; uniform float uHalo; uniform float uDist; uniform float uSheet;
varying float vAlong; varying float vAcross; varying float vR; varying float vLpx;
varying float vKind; varying float vAlpha; varying float vW; varying float vY; varying float vDepth;
void main() {
  if (vAlpha <= 0.001) discard;
  if (vR < 1.0 && vAlong > vR) discard;
  float hw = vW * 0.5;
  float dist = abs(vAcross) * (vW + 1.0) * 0.5;
  vec3 col; float a; float cov;
  if (vKind < 0.5)      { col = uSteel; a = 0.2; }
  else if (vKind < 1.5) { col = uSteel; a = 0.66; }
  else if (vKind < 2.5) { col = mix(uAccent, uAccentHi, clamp(vY / 7.8, 0.0, 1.0)); a = 1.0; }
  else if (vKind < 3.5) { col = uAccentHi; a = 1.0; }
  else                  { col = uFg; a = 0.92; }
  if (uHalo > 0.5) {
    if (vKind < 1.5) discard;
    float f = clamp(1.0 - dist / hw, 0.0, 1.0);
    cov = f * f * f;
    a *= 0.14 + 0.2 * uGlow;
  } else {
    cov = clamp(hw + 0.5 - dist, 0.0, 1.0);
    if (vR < 1.0) { float back = (vR - vAlong) * vLpx; col += vec3(0.6) * (1.0 - smoothstep(0.0, 18.0, back)); }
  }
  float fade = smoothstep(uDist - 10.0, uDist + 18.0, vDepth);
  a *= mix(1.0, 0.58, fade) * vAlpha;
  // a prancha (anotacoes no plano do piso) recua quando a fachada entra; os textos brancos recuam mais
  if (vY > -0.05 && vY < 0.01) {
    if (vKind > 3.5) a *= mix(1.0, 0.14, uSheet);
    else if (vKind < 2.5) a *= mix(1.0, 0.32, uSheet);
  }
  if (vKind > 1.5) col *= 1.0 + 0.2 * uGlow;
  if (vKind > 2.5 && vKind < 3.5) col = mix(col, vec3(1.0), 0.28 * uGlow);
  float aa = a * cov;
  gl_FragColor = vec4(col * aa, aa);
}`;

// ---------------------------------------------------------------------------
// construcao da cena (so dados: segmentos com inicio, fim, janela de tempo, tipo, largura, alpha)
function buildScene(mobile) {
  const start = [], end = [], time = [], kind = [], width = [], alpha = [];
  let count = 0;
  let fadeOut = 0; // contexto: instante em que os proximos segmentos somem (0 = nunca)

  const seg = (a, b, t0, t1, k, w = 1, al = 1) => {
    start.push(a[0], a[1], a[2]); end.push(b[0], b[1], b[2]);
    time.push(t0, t1, fadeOut); kind.push(k); width.push(w); alpha.push(al); count++;
  };
  const lerp3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  const len3 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  // polilinha: o tempo se distribui pelo comprimento, pra tracar continuo
  const poly = (pts, t0, t1, k, w = 1, al = 1, closed = false) => {
    const P = closed ? [...pts, pts[0]] : pts;
    const L = []; let tot = 0;
    for (let i = 0; i < P.length - 1; i++) { const l = len3(P[i], P[i + 1]); L.push(l); tot += l; }
    let acc = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const a = t0 + (acc / tot) * (t1 - t0); acc += L[i];
      const b = t0 + (acc / tot) * (t1 - t0);
      seg(P[i], P[i + 1], a, b, k, w, al);
    }
  };
  const rect = (a, b, c, d, t0, t1, k, w, al) => poly([a, b, c, d], t0, t1, k, w, al, true);
  const dashed = (a, b, pattern, t0, t1, k, w = 1, al = 1) => {
    const L = len3(a, b); let s = 0, i = 0;
    while (s < L) {
      const d = pattern[i % pattern.length]; const e = Math.min(s + d, L);
      if (i % 2 === 0) seg(lerp3(a, b, s / L), lerp3(a, b, e / L), t0 + (s / L) * (t1 - t0), t0 + (e / L) * (t1 - t0), k, w, al);
      s = e; i++;
    }
  };
  // arco no plano dado por dois eixos unitarios (u, v), angulos em radianos
  const arc = (c, r, u, v, a0, a1, n, t0, t1, k, w = 1, al = 1) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = a0 + (a1 - a0) * (i / n);
      pts.push([c[0] + r * (u[0] * Math.cos(t) + v[0] * Math.sin(t)), c[1] + r * (u[1] * Math.cos(t) + v[1] * Math.sin(t)), c[2] + r * (u[2] * Math.cos(t) + v[2] * Math.sin(t))]);
    }
    poly(pts, t0, t1, k, w, al);
  };
  // texto de traço: origem, vetor "direita", vetor "cima", altura de caixa alta (m)
  const text = (str, o, R, U, size, t0, t1, k = K.STEEL, w = 1, al = 1, align = 'left') => {
    const s = str.toUpperCase(); const unit = size / 6;
    let total = 0;
    for (const ch of s) total += (GLYPH_W[ch] ?? 4) + GAP;
    total -= GAP;
    let x0 = align === 'center' ? -total / 2 : align === 'right' ? -total : 0;
    const strokes = [];
    for (const ch of s) {
      const g = GLYPHS[ch];
      if (g) for (const st of g) strokes.push(st.map(([gx, gy]) => [x0 + gx, gy]));
      x0 += (GLYPH_W[ch] ?? 4) + GAP;
    }
    const n = strokes.length;
    strokes.forEach((st, i) => {
      const pts = st.map(([gx, gy]) => [o[0] + R[0] * gx * unit + U[0] * gy * unit, o[1] + R[1] * gx * unit + U[1] * gy * unit, o[2] + R[2] * gx * unit + U[2] * gy * unit]);
      poly(pts, t0 + (i / n) * (t1 - t0), t0 + ((i + 1) / n) * (t1 - t0), k, w, al);
    });
  };
  // cota: a->b medida, deslocada por "off" na direcao "N" (perpendicular, unitaria), rotulo em cima
  const dim = (a, b, N, off, label, t0, t1, R, U, size = 0.42) => {
    const al = 1;
    const A = [a[0] + N[0] * off, a[1] + N[1] * off, a[2] + N[2] * off];
    const B = [b[0] + N[0] * off, b[1] + N[1] * off, b[2] + N[2] * off];
    const ext = 0.35;
    const t = (u) => t0 + u * (t1 - t0);
    // linhas de chamada
    seg([a[0] + N[0] * 0.25, a[1] + N[1] * 0.25, a[2] + N[2] * 0.25], [A[0] + N[0] * ext, A[1] + N[1] * ext, A[2] + N[2] * ext], t(0), t(0.2), K.STEEL, 1, al);
    seg([b[0] + N[0] * 0.25, b[1] + N[1] * 0.25, b[2] + N[2] * 0.25], [B[0] + N[0] * ext, B[1] + N[1] * ext, B[2] + N[2] * ext], t(0), t(0.2), K.STEEL, 1, al);
    // linha de cota
    seg(A, B, t(0.15), t(0.6), K.STEEL, 1, al);
    // setas abertas
    const L = len3(A, B); const d = [(B[0] - A[0]) / L, (B[1] - A[1]) / L, (B[2] - A[2]) / L];
    const h = 0.28, sp = 0.09;
    for (const [P, sg] of [[A, 1], [B, -1]]) {
      seg(P, [P[0] + d[0] * h * sg + N[0] * sp, P[1] + d[1] * h * sg + N[1] * sp, P[2] + d[2] * h * sg + N[2] * sp], t(0.55), t(0.7), K.STEEL, 1, al);
      seg(P, [P[0] + d[0] * h * sg - N[0] * sp, P[1] + d[1] * h * sg - N[1] * sp, P[2] + d[2] * h * sg - N[2] * sp], t(0.55), t(0.7), K.STEEL, 1, al);
    }
    // numero inteiro do lado de fora da linha: se o texto cresce contra N, recua a base
    const dUN = U[0] * N[0] + U[1] * N[1] + U[2] * N[2];
    const lo = dUN < -0.5 ? 0.14 + size : 0.16;
    const mid = [(A[0] + B[0]) / 2 + N[0] * lo, (A[1] + B[1]) / 2 + N[1] * lo, (A[2] + B[2]) / 2 + N[2] * lo];
    text(label, mid, R, U, size, t(0.6), t(1), K.STEEL, 1, al, 'center');
  };
  // marca de nivel (fachada): triangulo + traço + "+5.00" (below: numero embaixo do traço)
  const level = (x, y, z, label, t0, t1, below = false) => {
    const s = 0.22;
    poly([[x, y, z], [x - s / 2, y + s * 0.87, z], [x + s / 2, y + s * 0.87, z]], t0, t0 + (t1 - t0) * 0.4, K.STEEL, 1, 1, true);
    seg([x, y, z], [x + 1.9, y, z], t0 + (t1 - t0) * 0.3, t0 + (t1 - t0) * 0.6, K.STEEL, 1, 1);
    text(label, [x + 0.3, below ? y - 0.4 : y + 0.1, z], [1, 0, 0], [0, 1, 0], 0.3, t0 + (t1 - t0) * 0.5, t1, K.STEEL, 1, 1);
  };

  // --- dimensoes da loja (m). x: largura 0..12, z: profundidade 0 (frente) .. -18, y: altura
  const W = 12, D = 18, H = 4.6, SLAB = 5.0, SIGN0 = SIGN.y0, SIGN1 = SIGN.y1, SZ0 = SIGN.z0, SZ1 = SIGN.z1;
  const PIL = 0.6, WT = 0.15;
  const spacing = mobile ? 1.2 : 0.6;

  // ======================= FASE 1: PROJETO (0 - 0,25) =======================
  // prancha: grade fina
  const G0 = -7, G1 = 16.5, GZ0 = 7, GZ1 = -25;
  const gstep = mobile ? 2 : 1;
  {
    const nx = Math.round((G1 - G0) / gstep), nz = Math.round((GZ0 - GZ1) / gstep);
    for (let i = 0; i <= nx; i++) {
      const x = G0 + i * gstep; const major = Math.abs(x % 5) < 1e-6;
      seg([x, -0.02, GZ0], [x, -0.02, GZ1], 0.0 + (i / nx) * 0.05, 0.03 + (i / nx) * 0.05, K.GRID, 1, major ? 1.7 : 1);
    }
    for (let i = 0; i <= nz; i++) {
      const z = GZ0 - i * gstep; const major = Math.abs(z % 5) < 1e-6;
      seg([G0, -0.02, z], [G1, -0.02, z], 0.0 + (i / nz) * 0.05, 0.03 + (i / nz) * 0.05, K.GRID, 1, major ? 1.7 : 1);
    }
  }
  // moldura da prancha + carimbo
  rect([G0 + 0.5, 0, GZ0 - 0.5], [G1 - 0.5, 0, GZ0 - 0.5], [G1 - 0.5, 0, GZ1 + 0.5], [G0 + 0.5, 0, GZ1 + 0.5], 0.01, 0.09, K.STEEL, 1, 0.5);
  {
    const cx0 = 6.2, cx1 = G1 - 0.5, cz0 = GZ0 - 0.5, cz1 = 4.3, cxm = 11.6, czm = 5.45;
    poly([[cx0, 0, cz0], [cx0, 0, cz1], [cx1, 0, cz1]], 0.05, 0.1, K.STEEL, 1, 0.9);
    seg([cx0, 0, czm], [cx1, 0, czm], 0.07, 0.1, K.STEEL, 1, 0.7);
    seg([cxm, 0, cz1], [cxm, 0, cz0], 0.07, 0.1, K.STEEL, 1, 0.7);
    const Rr = [1, 0, 0], Uu = [0, 0, -1];
    text('CITY STEEL', [cx0 + 0.35, 0, 5.15], Rr, Uu, 0.5, 0.19, 0.215, K.FG, 1, 0.9);
    text('PLANTA BAIXA', [cxm + 0.35, 0, 4.95], Rr, Uu, 0.3, 0.2, 0.22, K.STEEL, 1, 0.9);
    text('ESC 1:100', [cxm + 0.35, 0, 5.35], Rr, Uu, 0.26, 0.205, 0.225, K.STEEL, 1, 0.9);
    text('ALPHAVILLE  BARUERI SP', [cx0 + 0.35, 0, 6.25], Rr, Uu, 0.26, 0.21, 0.23, K.STEEL, 1, 0.9);
    text('FOLHA 01/04', [cxm + 0.35, 0, 6.25], Rr, Uu, 0.26, 0.215, 0.235, K.STEEL, 1, 0.9);
  }

  // paredes: perimetro externo (traça em volta), interno, pilastras da frente
  rect([0, 0, 0], [0, 0, -D], [W, 0, -D], [W, 0, 0], 0.03, 0.1, K.ACCENT, 1.5);
  poly([[WT, 0, -PIL], [WT, 0, -D + WT], [W - WT, 0, -D + WT], [W - WT, 0, -PIL]], 0.045, 0.11, K.ACCENT, 1.2);
  // pilastras (seção cheia com X)
  for (const x of [0, W - PIL]) {
    poly([[x + PIL, 0, 0], [x + PIL, 0, -PIL], [x, 0, -PIL]], 0.1, 0.115, K.ACCENT, 1.2);
    seg([x, 0, 0], [x + PIL, 0, -PIL], 0.11, 0.125, K.ACCENT, 1);
    seg([x + PIL, 0, 0], [x, 0, -PIL], 0.11, 0.125, K.ACCENT, 1);
  }
  // vidro da frente com marcas dos caixilhos
  const MULL = [1.7, 2.8, 3.9, 5.0, 7.0, 8.1, 9.2, 10.3];
  seg([PIL, 0, -0.075], [W - PIL, 0, -0.075], 0.1, 0.125, K.ACCENT, 1);
  for (const x of MULL) seg([x, 0, 0.05], [x, 0, -0.2], 0.12, 0.13, K.ACCENT, 1);
  // portas (duas folhas de 1,00 abrindo pra dentro) com arco de giro
  seg([5, 0, -0.075], [5, 0, -1.075], 0.125, 0.135, K.ACCENT, 1.2);
  arc([5, 0, -0.075], 1, [0, 0, -1], [1, 0, 0], 0, Math.PI / 2, 12, 0.13, 0.15, K.STEEL, 1, 0.9);
  seg([7, 0, -0.075], [7, 0, -1.075], 0.125, 0.135, K.ACCENT, 1.2);
  arc([7, 0, -0.075], 1, [0, 0, -1], [-1, 0, 0], 0, Math.PI / 2, 12, 0.13, 0.15, K.STEEL, 1, 0.9);
  // divisoria do escritorio (z = -13) com porta de 0,90, e bloco do sanitario
  const PZ = -13, PT = 0.1;
  poly([[WT, 0, PZ + PT / 2], [6.5, 0, PZ + PT / 2]], 0.085, 0.1, K.ACCENT, 1.2);
  poly([[WT, 0, PZ - PT / 2], [6.5, 0, PZ - PT / 2]], 0.085, 0.1, K.ACCENT, 1.2);
  poly([[7.4, 0, PZ + PT / 2], [W - WT, 0, PZ + PT / 2]], 0.09, 0.105, K.ACCENT, 1.2);
  poly([[7.4, 0, PZ - PT / 2], [W - WT, 0, PZ - PT / 2]], 0.09, 0.105, K.ACCENT, 1.2);
  seg([6.5, 0, PZ + PT / 2], [6.5, 0, PZ - PT / 2], 0.1, 0.105, K.ACCENT, 1);
  seg([7.4, 0, PZ + PT / 2], [7.4, 0, PZ - PT / 2], 0.1, 0.105, K.ACCENT, 1);
  seg([6.5, 0, PZ - PT / 2], [6.5, 0, PZ - PT / 2 - 0.9], 0.13, 0.14, K.ACCENT, 1.2);
  arc([6.5, 0, PZ - PT / 2], 0.9, [0, 0, -1], [1, 0, 0], 0, Math.PI / 2, 10, 0.135, 0.15, K.STEEL, 1, 0.9);
  // sanitario no fundo-esquerda: 2,25 x 2,35
  const WX = 2.4, WZ = -15.5;
  poly([[WT, 0, WZ + PT / 2], [WX + PT / 2, 0, WZ + PT / 2], [WX + PT / 2, 0, -D + WT]], 0.1, 0.115, K.ACCENT, 1.2);
  poly([[WT, 0, WZ - PT / 2], [WX - PT / 2, 0, WZ - PT / 2], [WX - PT / 2, 0, -D + WT]], 0.1, 0.115, K.ACCENT, 1.2);
  seg([WX - PT / 2, 0, -16.2], [WX + PT / 2, 0, -16.2], 0.115, 0.12, K.ACCENT, 1);
  seg([WX - PT / 2, 0, -16.9], [WX + PT / 2, 0, -16.9], 0.115, 0.12, K.ACCENT, 1);
  seg([WX + PT / 2, 0, -16.2], [WX + PT / 2 + 0.7, 0, -16.2], 0.135, 0.145, K.ACCENT, 1.2);
  arc([WX + PT / 2, 0, -16.2], 0.7, [1, 0, 0], [0, 0, -1], 0, Math.PI / 2, 8, 0.14, 0.15, K.STEEL, 1, 0.9);
  // mobiliario leve: duas mesas de atendimento, balcao
  for (const x of [2.2, 7.8]) rect([x, 0, -6.4], [x + 2, 0, -6.4], [x + 2, 0, -7.3], [x, 0, -7.3], 0.14, 0.16, K.STEEL, 1, 0.85);
  rect([4.3, 0, -11.9], [7.7, 0, -11.9], [7.7, 0, -12.6], [4.3, 0, -12.6], 0.15, 0.165, K.STEEL, 1, 0.85);
  // marcadores de pilar (quadrado com X) nos eixos
  const AX = [0.075, 4, 8, W - 0.075], AZ = [-0.3, -6, -12, -D + 0.075];
  const cols = [];
  for (const z of AZ) for (const x of AX) {
    const interior = x > 1 && x < 11 && z < -1 && z > -17;
    const cx = interior ? x : x, cz = z;
    cols.push([cx, cz]);
    const s = 0.14;
    rect([cx - s, 0, cz - s], [cx + s, 0, cz - s], [cx + s, 0, cz + s], [cx - s, 0, cz + s], 0.13, 0.145, K.ACCENT, 1.2);
    seg([cx - s, 0, cz - s], [cx + s, 0, cz + s], 0.14, 0.15, K.ACCENT, 1);
    seg([cx + s, 0, cz - s], [cx - s, 0, cz + s], 0.14, 0.15, K.ACCENT, 1);
  }
  // eixos (traço-ponto) com bolhas e letras
  const AXL = ['A', 'B', 'C', 'D'];
  AX.forEach((x, i) => {
    dashed([x, 0, 2.6], [x, 0, -D - 2.6], [1.3, 0.3, 0.12, 0.3], 0.16 + i * 0.012, 0.2 + i * 0.012, K.STEEL, 1, 0.8);
    for (const z of [3.3, -D - 3.3]) {
      arc([x, 0, z], 0.6, [1, 0, 0], [0, 0, 1], 0, Math.PI * 2, 18, 0.19 + i * 0.01, 0.215 + i * 0.01, K.STEEL, 1, 0.9);
      text(AXL[i], [x, 0, z + 0.24], [1, 0, 0], [0, 0, -1], 0.48, 0.21 + i * 0.01, 0.235 + i * 0.01, K.STEEL, 1, 1, 'center');
    }
  });
  AZ.forEach((z, i) => {
    dashed([-2.6, 0, z], [W + 2.6, 0, z], [1.3, 0.3, 0.12, 0.3], 0.17 + i * 0.012, 0.21 + i * 0.012, K.STEEL, 1, 0.8);
    for (const x of [-3.3, W + 3.3]) {
      arc([x, 0, z], 0.6, [1, 0, 0], [0, 0, 1], 0, Math.PI * 2, 18, 0.2 + i * 0.01, 0.225 + i * 0.01, K.STEEL, 1, 0.9);
      text(String(i + 1), [x, 0, z + 0.24], [1, 0, 0], [0, 0, -1], 0.48, 0.22 + i * 0.01, 0.245 + i * 0.01, K.STEEL, 1, 1, 'center');
    }
  });
  // cotas da planta
  const RX = [1, 0, 0], UZ = [0, 0, -1];   // texto horizontal (lido de frente)
  const RZ = [0, 0, -1], UX = [-1, 0, 0];  // texto vertical (lido pela direita)
  dim([0, 0, 0], [PIL, 0, 0], [0, 0, 1], 1.0, '0.60', 0.17, 0.21, RX, UZ, 0.34);
  dim([PIL, 0, 0], [5, 0, 0], [0, 0, 1], 1.0, '4.40', 0.175, 0.215, RX, UZ, 0.34);
  dim([5, 0, 0], [7, 0, 0], [0, 0, 1], 1.0, '2.00', 0.18, 0.22, RX, UZ, 0.34);
  dim([7, 0, 0], [W - PIL, 0, 0], [0, 0, 1], 1.0, '4.40', 0.185, 0.225, RX, UZ, 0.34);
  dim([W - PIL, 0, 0], [W, 0, 0], [0, 0, 1], 1.0, '0.60', 0.19, 0.23, RX, UZ, 0.34);
  dim([0, 0, 0], [W, 0, 0], [0, 0, 1], 1.9, '12.00', 0.2, 0.245, RX, UZ, 0.42);
  dim([0, 0, 0], [0, 0, PZ], [-1, 0, 0], 1.0, '13.00', 0.19, 0.23, RZ, UX, 0.34);
  dim([0, 0, PZ], [0, 0, -D], [-1, 0, 0], 1.0, '5.00', 0.2, 0.235, RZ, UX, 0.34);
  dim([0, 0, 0], [0, 0, -D], [-1, 0, 0], 1.9, '18.00', 0.21, 0.25, RZ, UX, 0.42);
  dim([W, 0, PZ], [W, 0, -D], [1, 0, 0], 1.0, '5.00', 0.2, 0.235, [0, 0, -1], [-1, 0, 0], 0.34);
  // rotulos de ambiente + area
  text('LOJA', [6, 0, -3.3], RX, UZ, 0.5, 0.2, 0.225, K.STEEL, 1, 0.95, 'center');
  text('A = 148,20 M²', [6, 0, -4.1], RX, UZ, 0.3, 0.215, 0.235, K.STEEL, 1, 0.8, 'center');
  text('ESCRITÓRIO', [7.5, 0, -15.0], RX, UZ, 0.36, 0.215, 0.235, K.STEEL, 1, 0.9, 'center');
  text('WC', [1.25, 0, -16.6], RX, UZ, 0.3, 0.22, 0.235, K.STEEL, 1, 0.9, 'center');
  text('PLANTA BAIXA  ESC 1:100', [0, 0, -D - 5.2], RX, UZ, 0.5, 0.225, 0.25, K.FG, 1, 0.9);
  seg([0, 0, -D - 5.5], [9.6, 0, -D - 5.5], 0.235, 0.25, K.STEEL, 1.3, 0.9);
  // norte
  {
    const nx = W + 2.8, nz = -D - 4.6;
    arc([nx, 0, nz], 0.7, [1, 0, 0], [0, 0, 1], 0, Math.PI * 2, 20, 0.22, 0.24, K.STEEL, 1, 0.9);
    poly([[nx, 0, nz + 0.6], [nx - 0.3, 0, nz + 0.3], [nx, 0, nz - 0.9], [nx + 0.3, 0, nz + 0.3]], 0.23, 0.25, K.STEEL, 1, 0.9, true);
    text('N', [nx, 0, nz - 1.5], RX, UZ, 0.42, 0.24, 0.25, K.STEEL, 1, 1, 'center');
  }

  // ======================= FASE 2: ESTRUTURA (0,25 - 0,60) =======================
  // primeiras colunas (as 4 da frente e do fundo) ja sobem no fim da intro; o resto no scroll
  const colT = (x, z) => {
    const front = Math.abs(z + 0.3) < 0.01, back = Math.abs(z + D - 0.075) < 0.01;
    if (front) return [0.19 + (x / W) * 0.03, 0.26 + (x / W) * 0.03];
    if (back) return [0.26 + (x / W) * 0.02, 0.32 + (x / W) * 0.02];
    return [0.28 + (x / W) * 0.02, 0.34 + (x / W) * 0.02];
  };
  for (const [x, z] of cols) {
    const [t0, t1] = colT(x, z);
    const top = (x > 1 && x < 11 && z < -1 && z > -17) ? SLAB : SLAB;
    seg([x, 0, z], [x, top, z], t0, t1, K.ACCENT, 2.1);
  }
  // montantes (studs) a cada 0,60 nas paredes externas, do piso a guia superior (4,60)
  const studs = [];
  for (let z = -PIL - spacing; z > -D + WT; z -= spacing) { studs.push([0.075, z, (-z) / D]); studs.push([W - 0.075, z, (-z) / D]); }
  for (let x = PIL; x <= W - PIL + 1e-6; x += spacing) studs.push([x, -D + 0.075, 1 + x / W]);
  studs.forEach(([x, z, o]) => {
    const t0 = 0.3 + o * 0.075; seg([x, 0, z], [x, H, z], t0, t0 + 0.035, K.ACCENT, 1.15);
  });
  // montantes das pilastras (duplos)
  for (const x of [0.15, 0.45, W - 0.45, W - 0.15]) seg([x, 0, -0.3], [x, H, -0.3], 0.29, 0.32, K.ACCENT, 1.15);
  // divisoria e sanitario: 3,00 de altura
  const HI = 3.0;
  for (let x = PIL; x <= W - PIL + 1e-6; x += spacing) {
    if (x > 6.3 && x < 7.6) continue;
    const t0 = 0.36 + (x / W) * 0.06; seg([x, 0, PZ], [x, HI, PZ], t0, t0 + 0.03, K.ACCENT, 1.05);
  }
  for (const x of [6.5, 7.4]) seg([x, 0, PZ], [x, HI, PZ], 0.4, 0.43, K.ACCENT, 1.15);
  for (let x = WT; x < WX; x += spacing) { const t0 = 0.39 + (x / W) * 0.06; seg([x, 0, WZ], [x, HI, WZ], t0, t0 + 0.03, K.ACCENT, 1.05); }
  for (let z = WZ; z > -D + WT; z -= spacing) { const t0 = 0.4 + ((-z) / D) * 0.06; seg([WX, 0, z], [WX, HI, z], t0, t0 + 0.03, K.ACCENT, 1.05); }
  // guias superiores (tracks)
  poly([[0.075, H, -0.3], [0.075, H, -D + 0.075], [W - 0.075, H, -D + 0.075], [W - 0.075, H, -0.3]], 0.4, 0.47, K.ACCENT, 1.4);
  seg([WT, HI, PZ], [W - WT, HI, PZ], 0.43, 0.46, K.ACCENT, 1.2);
  poly([[WT, HI, WZ], [WX, HI, WZ], [WX, HI, -D + WT]], 0.44, 0.47, K.ACCENT, 1.2);
  // vergas: caixa sobre o vidro da frente (4,20 - 4,60), verga da porta interna (2,10 - 2,30)
  rect([PIL, 4.2, -0.075], [W - PIL, 4.2, -0.075], [W - PIL, H, -0.075], [PIL, H, -0.075], 0.45, 0.5, K.ACCENT, 1.5);
  for (const x of MULL) seg([x, 4.2, -0.075], [x, H, -0.075], 0.48, 0.5, K.ACCENT, 1);
  rect([6.5, 2.1, PZ], [7.4, 2.1, PZ], [7.4, 2.3, PZ], [6.5, 2.3, PZ], 0.46, 0.49, K.ACCENT, 1.2);
  seg([6.5, 2.3, PZ], [6.5, HI, PZ], 0.47, 0.49, K.ACCENT, 1); seg([7.4, 2.3, PZ], [7.4, HI, PZ], 0.47, 0.49, K.ACCENT, 1);
  // contraventamento em X (fitas) nos paineis de canto
  const braceX = (a, b, c, d, t0) => { seg(a, c, t0, t0 + 0.03, K.ACCENT, 1.25); seg(b, d, t0 + 0.01, t0 + 0.04, K.ACCENT, 1.25); };
  for (const x of [0.075, W - 0.075]) {
    braceX([x, 0, -PIL - spacing], [x, 0, -3.6], [x, H, -3.6], [x, H, -PIL - spacing], 0.47);
    braceX([x, 0, -D + WT], [x, 0, -D + 3.6], [x, H, -D + 3.6], [x, H, -D + WT], 0.49);
    braceX([x, 0, -7.2], [x, 0, -10.2], [x, H, -10.2], [x, H, -7.2], 0.51);
  }
  braceX([PIL, 0, -D + 0.075], [3.6, 0, -D + 0.075], [3.6, H, -D + 0.075], [PIL, H, -D + 0.075], 0.5);
  braceX([W - 3.6, 0, -D + 0.075], [W - PIL, 0, -D + 0.075], [W - PIL, H, -D + 0.075], [W - 3.6, H, -D + 0.075], 0.51);
  // vigas principais (2 longarinas em B e C) e vigas de borda, 4,60 - 5,00
  for (const x of [4, 8]) {
    seg([x, SLAB, -0.3], [x, SLAB, -D + 0.075], 0.52, 0.56, K.ACCENT, 1.6);
    seg([x, H, -0.3], [x, H, -D + 0.075], 0.525, 0.565, K.ACCENT, 1.1);
  }
  rect([0.075, SLAB, -0.3], [0.075, SLAB, -D + 0.075], [W - 0.075, SLAB, -D + 0.075], [W - 0.075, SLAB, -0.3], 0.52, 0.57, K.ACCENT, 1.5);
  // vigotas da cobertura a cada 0,60 atravessando a largura
  {
    const n = Math.round((D - 0.3 - 0.075) / spacing);
    for (let i = 1; i < n; i++) {
      const z = -0.3 - i * spacing; const t0 = 0.54 + (i / n) * 0.05;
      seg([0.075, SLAB, z], [W - 0.075, SLAB, z], t0, t0 + 0.02, K.ACCENT, 1.05);
    }
  }
  // caixa do letreiro: estrutura (face de tras com montantes, rails, X nas laterais, travas no topo)
  // some quando a face da frente fecha (0,68), pro simbolo ficar limpo
  {
    const t0 = 0.555; fadeOut = 0.68;
    rect([0, SIGN0, SZ0], [W, SIGN0, SZ0], [W, SIGN1, SZ0], [0, SIGN1, SZ0], t0, t0 + 0.03, K.ACCENT, 1.3);
    const sp = mobile ? 1.2 : 0.6; const n = Math.round(W / sp);
    for (let i = 1; i < n; i++) { const x = i * sp; const tt = t0 + 0.01 + (i / n) * 0.03; seg([x, SIGN0, SZ0], [x, SIGN1, SZ0], tt, tt + 0.012, K.ACCENT, 1.05); }
    for (const x of [0, W]) { braceX([x, SIGN0, SZ0], [x, SIGN0, SZ1], [x, SIGN1, SZ1], [x, SIGN1, SZ0], t0 + 0.02); seg([x, SIGN0, SZ0], [x, SIGN0, SZ1], t0 + 0.015, t0 + 0.025, K.ACCENT, 1.2); seg([x, SIGN1, SZ0], [x, SIGN1, SZ1], t0 + 0.015, t0 + 0.025, K.ACCENT, 1.2); }
    for (let x = 0; x <= W + 1e-6; x += 1.2) { seg([x, SIGN1, SZ0], [x, SIGN1, SZ1], t0 + 0.03, t0 + 0.045, K.ACCENT, 1); seg([x, SIGN0, SZ0], [x, SIGN0, SZ1], t0 + 0.03, t0 + 0.045, K.ACCENT, 1); }
    fadeOut = 0;
  }

  // ======================= FASE 3: FACHADA (0,60 - 0,85) =======================
  const FZ = -0.05;
  // caixa do letreiro: face da frente, arestas laterais e face de tras (caixa limpa)
  rect([0, SIGN0, SZ1], [W, SIGN0, SZ1], [W, SIGN1, SZ1], [0, SIGN1, SZ1], 0.6, 0.66, K.HI, 1.6);
  rect([0, SIGN0, SZ0], [W, SIGN0, SZ0], [W, SIGN1, SZ0], [0, SIGN1, SZ0], 0.62, 0.68, K.ACCENT, 1.1);
  for (const x of [0, W]) for (const y of [SIGN0, SIGN1]) seg([x, y, SZ0], [x, y, SZ1], 0.64, 0.68, K.ACCENT, 1.1);
  // pilastras com juntas da pedra
  for (const x of [0, W - PIL]) {
    rect([x, 0, 0], [x + PIL, 0, 0], [x + PIL, SLAB, 0], [x, SLAB, 0], 0.61, 0.66, K.ACCENT, 1.3);
    for (let y = 0.5; y < SLAB; y += 0.5) seg([x, y, 0], [x + PIL, y, 0], 0.64 + (y / SLAB) * 0.03, 0.655 + (y / SLAB) * 0.03, K.STEEL, 1, 0.45);
  }
  // quadro do vidro, caixilhos e bandeira superior
  rect([PIL, 0, FZ], [W - PIL, 0, FZ], [W - PIL, H, FZ], [PIL, H, FZ], 0.62, 0.68, K.HI, 1.4);
  MULL.forEach((x, i) => seg([x, 0, FZ], [x, H, FZ], 0.65 + i * 0.008, 0.675 + i * 0.008, K.HI, 1.15));
  seg([PIL, 3.9, FZ], [W - PIL, 3.9, FZ], 0.68, 0.72, K.HI, 1.15);
  seg([PIL, 0.08, FZ], [W - PIL, 0.08, FZ], 0.69, 0.72, K.HI, 1);
  // portas (fechadas na fachada), puxadores
  for (const [x0, x1] of [[5, 6], [6, 7]]) {
    rect([x0 + 0.04, 0.08, FZ], [x1 - 0.04, 0.08, FZ], [x1 - 0.04, 3.9, FZ], [x0 + 0.04, 3.9, FZ], 0.7, 0.75, K.HI, 1.15);
  }
  for (const x of [5.82, 6.18]) seg([x, 1.0, FZ + 0.03], [x, 2.1, FZ + 0.03], 0.74, 0.76, K.HI, 1.5);
  // marca centralizada DENTRO da caixa do letreiro, na frente do painel opaco: os contornos da
  // logo de verdade (simbolo, CITY STEEL, STEEL FRAME e os dois tracos), na ordem em que se desenham
  {
    const bz = SZ1 + 0.04;
    const lh = 2.2, lw = lh / LOGO.aspecto, lx = W / 2 - lw / 2, ly = SIGN0 + (SIGN1 - SIGN0 - lh) / 2;
    const P = ([u, v]) => [lx + u * lw, ly + v * lw, bz];
    LOGO.simbolo.forEach((c, i) => poly(c.map(P), 0.74 + i * 0.022, 0.78 + i * 0.022, K.HI, 1.6, 1, true));
    LOGO.city.forEach((c, i) => poly(c.map(P), 0.79 + i * 0.005, 0.81 + i * 0.005, K.FG, 1.3, 1, true));
    LOGO.frame.forEach((c, i) => poly(c.map(P), 0.825 + i * 0.0025, 0.84 + i * 0.0025, K.FG, 1, 0.9, true));
    LOGO.linhas.forEach(([a, b]) => seg(P(a), P(b), 0.84, 0.855, K.HI, 1.5));
  }
  // niveis e cota vertical (anotacoes de fachada)
  level(W + 0.9, 0, 0, '+0.00', 0.7, 0.75);
  level(W + 0.9, H, 0, '+4.60', 0.72, 0.77, true);
  level(W + 0.9, SIGN0, 0, '+5.00', 0.74, 0.79);
  level(W + 0.9, SIGN1, 0, '+7.80', 0.76, 0.81);
  dim([0, 0, 0], [0, SIGN0, 0], [-1, 0, 0], 1.0, '5.00', 0.7, 0.76, [0, 1, 0], [-1, 0, 0], 0.34);
  dim([0, SIGN0, 0], [0, SIGN1, 0], [-1, 0, 0], 1.0, '2.80', 0.73, 0.79, [0, 1, 0], [-1, 0, 0], 0.34);
  dim([0, 0, 0.2], [W, 0, 0.2], [0, -1, 0], 1.0, '12.00', 0.78, 0.84, [1, 0, 0], [0, 1, 0], 0.42);
  text('FACHADA FRONTAL  ESC 1:50', [0, -2.5, 0.2], [1, 0, 0], [0, 1, 0], 0.4, 0.8, 0.85, K.FG, 1, 0.9);
  seg([0, -2.7, 0.2], [9.5, -2.7, 0.2], 0.84, 0.85, K.STEEL, 1.3, 0.9);

  return { start, end, time, kind, width, alpha, count };
}

// ---------------------------------------------------------------------------
// painel opaco do letreiro: o unico plano solido da cena. Fecha da esquerda pra direita junto
// com o contorno da caixa (0,60-0,68) e grava profundidade, pra tapar as linhas que passam atras da marca.
const PANEL_VERT = /* glsl */ `
uniform float uPanel;
void main() { vec3 p = position; p.x *= uPanel; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;
const PANEL_FRAG = /* glsl */ `
precision highp float; uniform vec3 uBg;
void main() { gl_FragColor = vec4(uBg, 1.0); }`;

// ---------------------------------------------------------------------------
// camera: chaves (az em graus a partir da frente, el elevacao, dist = forca da perspectiva, alvo)
// interpoladas por spline. O fov e o deslocamento NAO vem daqui: sao resolvidos a cada quadro
// pelo ajuste de enquadramento (FIT), que mede a caixa de tela do que esta desenhado.
const CAM_KEYS = [
  { p: 0.0, az: -5, el: 71, dist: 70, tx: 5.5, ty: 0, tz: -7.8 },
  { p: 0.25, az: -14, el: 58, dist: 60, tx: 6, ty: 0.6, tz: -9 },
  { p: 0.6, az: -34, el: 24, dist: 46, tx: 6, ty: 2.6, tz: -8 },
  { p: 0.85, az: -3, el: 8, dist: 34, tx: 6, ty: 3.6, tz: -2.5 },
  { p: 1.0, az: 19, el: 12, dist: 36, tx: 6, ty: 3.4, tz: -4 },
];
const CAM_FIELDS = ['az', 'el', 'dist', 'tx', 'ty', 'tz'];

// pontos que definem a caixa de enquadramento (estrutura + cotas + rotulos; a grade da prancha fica
// de fora de proposito). `from`: de onde o ponto cresce quando o elemento entra (t0-t1);
// `to`: pra onde recolhe quando a prancha recua (o0-o1), pra fachada nao ficar pequena por causa da planta.
const FIT = [
  // prancha (bolhas de eixo, carimbo, titulo, norte): sempre, recolhem na fachada
  { p: [-3.9, 0, 3.9], to: [0, 0, 0] }, { p: [15.9, 0, 3.9], to: [12, 0, 0] },
  { p: [-3.9, 0, -21.9], to: [0, 0, -18] }, { p: [15.9, 0, -21.9], to: [12, 0, -18] },
  { p: [16, 0, 6.5], to: [12, 0, 0] }, { p: [6.2, 0, 6.5], to: [6, 0, 0] },
  { p: [0, 0, -24], to: [0, 0, -18] }, { p: [9.6, 0, -24], to: [9.6, 0, -18] }, { p: [14.8, 0, -24.6], to: [12, 0, -18] },
  // estrutura
  { p: [0, 5, 0], from: [0, 0, 0], t: [0.26, 0.34] }, { p: [12, 5, 0], from: [12, 0, 0], t: [0.26, 0.34] },
  { p: [0, 5, -18], from: [0, 0, -18], t: [0.26, 0.34] }, { p: [12, 5, -18], from: [12, 0, -18], t: [0.26, 0.34] },
  { p: [0, 7.8, 0.35], from: [0, 5, 0.35], t: [0.555, 0.6] }, { p: [12, 7.8, 0.35], from: [12, 5, 0.35], t: [0.555, 0.6] },
  // anotacoes da fachada: niveis a direita, cotas a esquerda, cota 12.00 e titulo embaixo
  { p: [14.9, 8.25, 0], from: [12, 7.8, 0], t: [0.76, 0.81] }, { p: [14.9, -0.1, 0], from: [12, 0, 0], t: [0.7, 0.75] },
  { p: [-1.7, 0, 0], from: [0, 0, 0], t: [0.7, 0.76] }, { p: [-1.7, 7.8, 0], from: [0, 7.8, 0], t: [0.73, 0.79] },
  { p: [0, -2.8, 0.2], from: [0, 0, 0.2], t: [0.8, 0.85] }, { p: [9.7, -2.8, 0.2], from: [9.7, 0, 0.2], t: [0.8, 0.85] },
];
const SHEET_OUT = [0.6, 0.72];
// faixa da tela onde a estrutura tem que caber (NDC: -1..1), com 0,5% de folga pra largura da linha.
// Desktop: 50-96% da largura, 8-92% da altura. Celular: 3-97% da largura, 48-95% da altura (metade de baixo).
const REGION_WIDE = { x0: 0.01, x1: 0.91, y0: -0.83, y1: 0.83 };
const REGION_TALL = { x0: -0.93, x1: 0.93, y0: -0.89, y1: 0.03 };
function camAt(p) {
  const ks = CAM_KEYS; const out = {};
  let i = 0; while (i < ks.length - 2 && p > ks[i + 1].p) i++;
  const k0 = ks[i], k1 = ks[i + 1]; const h = k1.p - k0.p; const u = Math.min(1, Math.max(0, (p - k0.p) / h));
  const u2 = u * u, u3 = u2 * u;
  for (const f of CAM_FIELDS) {
    const v0 = k0[f], v1 = k1[f];
    const vm = i > 0 ? ks[i - 1][f] : v0, vp = i < ks.length - 2 ? ks[i + 2][f] : v1;
    const pm = i > 0 ? ks[i - 1].p : k0.p - h, pp = i < ks.length - 2 ? ks[i + 2].p : k1.p + h;
    const m0 = ((v1 - vm) / (k1.p - pm)) * h, m1 = ((vp - v0) / (pp - k0.p)) * h;
    out[f] = (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1;
  }
  return out;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutCubic = (u) => 1 - Math.pow(1 - u, 3);

// ---------------------------------------------------------------------------
export async function mountFrame(canvas, opts = {}) {
  const mobile = !!opts.mobile;
  const reduced = !!opts.reducedMotion;
  const poster = !!opts.poster;
  THREE.ColorManagement.enabled = false; // os tokens entram e saem como estao, sem conversao

  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: false, premultipliedAlpha: true, depth: true, stencil: false,
    powerPreference: 'high-performance', preserveDrawingBuffer: poster,
  });
  renderer.setClearColor(0x000000, 0);
  const dprMax = mobile ? 1.25 : 1.5;
  let dpr = Math.min(window.devicePixelRatio || 1, dprMax);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 1, 400);

  // geometria: um quad por segmento (x = -1..1 atraves, y = 0..1 ao longo)
  const data = buildScene(mobile);
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0], 3));
  geo.setIndex([0, 2, 1, 2, 3, 1]);
  geo.setAttribute('iStart', new THREE.InstancedBufferAttribute(new Float32Array(data.start), 3));
  geo.setAttribute('iEnd', new THREE.InstancedBufferAttribute(new Float32Array(data.end), 3));
  geo.setAttribute('iTime', new THREE.InstancedBufferAttribute(new Float32Array(data.time), 3));
  geo.setAttribute('iKind', new THREE.InstancedBufferAttribute(new Float32Array(data.kind), 1));
  geo.setAttribute('iWidth', new THREE.InstancedBufferAttribute(new Float32Array(data.width), 1));
  geo.setAttribute('iAlpha', new THREE.InstancedBufferAttribute(new Float32Array(data.alpha), 1));
  geo.instanceCount = data.count;

  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uT: { value: 0 },
    uDpr: { value: dpr },
    uHalo: { value: 0 },
    uHaloW: { value: 5.5 },
    uGlow: { value: 0 },
    uSheet: { value: 0 },
    uDist: { value: 50 },
    uAccent: { value: new THREE.Color(TOKENS.accent) },
    uAccentHi: { value: new THREE.Color(TOKENS.accentHi) },
    uSteel: { value: new THREE.Color(TOKENS.steel) },
    uFg: { value: new THREE.Color(TOKENS.fg) },
  };
  // linhas testam profundidade (so o painel do letreiro grava), nunca gravam
  const matOpts = {
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  };
  const material = new THREE.ShaderMaterial({ ...matOpts, uniforms });
  const mesh = new THREE.Mesh(geo, material); mesh.frustumCulled = false;
  // halo: mesma geometria, linhas largas e fracas so nos perfis laranja (nao no celular: fill rate)
  let halo = null;
  if (!mobile) {
    const hm = new THREE.ShaderMaterial({ ...matOpts, uniforms: { ...uniforms, uHalo: { value: 1 } } });
    halo = new THREE.Mesh(geo, hm); halo.frustumCulled = false; halo.renderOrder = -1;
    scene.add(halo);
  }
  scene.add(mesh);
  // painel opaco do letreiro (opaco = three desenha antes das linhas; 2 cm atras do contorno da frente)
  const panelGeo = new THREE.BufferGeometry();
  const pz = SIGN.z1 - 0.02;
  panelGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, SIGN.y0, pz, SIGN.w, SIGN.y0, pz, SIGN.w, SIGN.y1, pz, 0, SIGN.y1, pz], 3));
  panelGeo.setIndex([0, 1, 2, 0, 2, 3]);
  const panelUniforms = { uPanel: { value: 0 }, uBg: { value: new THREE.Color(TOKENS.bg) } };
  const panelMat = new THREE.ShaderMaterial({ vertexShader: PANEL_VERT, fragmentShader: PANEL_FRAG, uniforms: panelUniforms, depthTest: true, depthWrite: true, side: THREE.DoubleSide });
  const panel = new THREE.Mesh(panelGeo, panelMat); panel.frustumCulled = false; panel.renderOrder = -2; panel.visible = false;
  scene.add(panel);

  // --- estado
  let W = 1, Hh = 1;
  let pTarget = 0, pShown = 0;
  let intro = reduced || poster ? INTRO_END : 0;
  let introActive = !(reduced || poster);
  let introStart = 0;
  let parTX = 0, parTY = 0, parX = 0, parY = 0;
  let raf = 0, dirty = true, paused = false, hidden = document.visibilityState === 'hidden', disposed = false;
  let lastNow = 0, firstDone = false, readyResolve = null;
  const smooth = !reduced && !poster;

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    if (w === W && h === Hh) return;
    W = w; Hh = h;
    renderer.setSize(W, Hh, false);
    uniforms.uRes.value.set(W * dpr, Hh * dpr);
    request();
  }

  // posicao de um ponto de enquadramento no instante T (cresce ao entrar, recolhe quando a prancha recua)
  const fitV = new THREE.Vector3();
  function fitPos(f, T) {
    let x = f.p[0], y = f.p[1], z = f.p[2];
    if (f.from) {
      const u = clamp01((T - f.t[0]) / (f.t[1] - f.t[0]));
      x = f.from[0] + (x - f.from[0]) * u; y = f.from[1] + (y - f.from[1]) * u; z = f.from[2] + (z - f.from[2]) * u;
    }
    if (f.to) {
      const u = clamp01((T - SHEET_OUT[0]) / (SHEET_OUT[1] - SHEET_OUT[0]));
      x += (f.to[0] - x) * u; y += (f.to[1] - y) * u; z += (f.to[2] - z) * u;
    }
    return fitV.set(x, y, z);
  }

  function updateCamera(T) {
    const k = camAt(pShown);
    const aspect = W / Hh;
    const wide = aspect >= 1.15;
    const distMul = Math.min(1.8, Math.max(1, 1.5 / aspect));
    const az = (k.az + parX * 2.4) * Math.PI / 180, el = (k.el + parY * 1.4) * Math.PI / 180;
    const d = k.dist * distMul;
    camera.position.set(k.tx + d * Math.sin(az) * Math.cos(el), k.ty + d * Math.sin(el), k.tz + d * Math.cos(az) * Math.cos(el));
    camera.up.set(0, 1, 0);
    camera.lookAt(k.tx, k.ty, k.tz);
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    // caixa de tela do que esta desenhado (em unidades de tan(fov/2)), e fov + deslocamento que a poem na faixa
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const f of FIT) {
      const v = fitPos(f, T).applyMatrix4(camera.matrixWorldInverse);
      const iz = -1 / Math.min(v.z, -0.5);
      const px = v.x * iz, py = v.y * iz;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
    }
    const R = wide ? REGION_WIDE : REGION_TALL;
    const t = Math.min(Math.tan(32 * Math.PI / 180), Math.max(Math.tan(7 * Math.PI / 180),
      (x1 - x0) / (aspect * (R.x1 - R.x0)), (y1 - y0) / (R.y1 - R.y0)));
    camera.fov = (2 * Math.atan(t) * 180) / Math.PI; camera.aspect = aspect;
    const cx = (x0 + x1) / 2 / (t * aspect), cy = (y0 + y1) / 2 / t;
    const dx = (R.x0 + R.x1) / 2 - cx, dy = (R.y0 + R.y1) / 2 - cy;
    camera.setViewOffset(W, Hh, (-dx / 2) * W, (dy / 2) * Hh, W, Hh);
    camera.updateProjectionMatrix();
    uniforms.uDist.value = d;
  }

  function render() {
    const T = Math.max(pShown, intro);
    updateCamera(T);
    uniforms.uT.value = T;
    uniforms.uGlow.value = clamp01((pShown - 0.85) / 0.15);
    uniforms.uSheet.value = clamp01((pShown - SHEET_OUT[0]) / (SHEET_OUT[1] - SHEET_OUT[0]));
    const pn = clamp01((T - 0.6) / 0.08);
    panelUniforms.uPanel.value = pn; panel.visible = pn > 0;
    renderer.render(scene, camera);
  }

  function request() {
    dirty = true;
    if (!raf && (!paused || !firstDone) && !hidden && !disposed) raf = requestAnimationFrame(tick);
  }

  function tick(now) {
    raf = 0;
    if (disposed) return;
    const dt = lastNow ? Math.min(50, now - lastNow) : 16.7; lastNow = now;
    let moving = false;
    if (introActive) {
      if (!introStart) introStart = now;
      const u = Math.min(1, (now - introStart) / INTRO_MS);
      intro = INTRO_END * easeOutCubic(u);
      if (u >= 1) introActive = false; else moving = true;
    }
    if (smooth && firstDone) {
      const k = 1 - Math.pow(0.84, dt / 16.7);
      const dP = pTarget - pShown;
      if (Math.abs(dP) > 1.5e-4) { pShown += dP * k; moving = true; } else pShown = pTarget;
      const kp = 1 - Math.pow(0.9, dt / 16.7);
      const dx = parTX - parX, dy = parTY - parY;
      if (Math.abs(dx) > 4e-3 || Math.abs(dy) > 4e-3) { parX += dx * kp; parY += dy * kp; moving = true; } else { parX = parTX; parY = parTY; }
    } else { pShown = pTarget; }
    render();
    dirty = false;
    if (!firstDone) {
      // 1º quadro na tela: `ready` resolve no quadro seguinte, pra troca do poster nao piscar
      firstDone = true;
      requestAnimationFrame(() => { readyResolve && readyResolve(); if (paused) { if (raf) cancelAnimationFrame(raf); raf = 0; } });
    }
    if (moving) raf = requestAnimationFrame(tick);
    else lastNow = 0;
  }

  // --- eventos (tudo passivo: nunca segura o scroll)
  const onMove = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    parTX = (e.clientX / window.innerWidth) * 2 - 1;
    parTY = (e.clientY / window.innerHeight) * 2 - 1;
    request();
  };
  const finePointer = !mobile && !reduced && matchMedia('(pointer: fine)').matches;
  if (finePointer) window.addEventListener('pointermove', onMove, { passive: true });

  const onVis = () => { hidden = document.visibilityState === 'hidden'; if (hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; } else if (dirty || introActive) request(); };
  document.addEventListener('visibilitychange', onVis);

  const io = new IntersectionObserver((es) => {
    const vis = es[0].isIntersecting;
    paused = !vis;
    if (paused) { if (raf) cancelAnimationFrame(raf); raf = 0; } else request();
  }, { rootMargin: '0px' });
  io.observe(canvas);

  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  resize();

  // primeiro quadro no proximo rAF (assim um setProgress chamado logo apos o mount ja entra nele,
  // sem a estrutura "crescer" de 0,25 ate o valor pedido); `ready` resolve um quadro depois.
  const ready = new Promise((res) => { readyResolve = res; });
  request();

  if (opts.debug) window.__frameDebug = { renderer, scene, camera, uniforms, material, geo, render, THREE };

  return {
    ready,
    /** p = progresso 0..1 da secao fixada (ver PHASES) */
    setProgress(p) {
      pTarget = clamp01(+p || 0);
      if (!smooth || !firstDone) {
        pShown = pTarget;
        // antes do 1º quadro, um p alem da intro dispensa a intro (ex.: /franquia em 0,45)
        if (!firstDone && pTarget >= INTRO_END) { introActive = false; intro = INTRO_END; }
      }
      request();
    },
    pause() { paused = true; if (raf) cancelAnimationFrame(raf); raf = 0; },
    resume() { paused = false; request(); },
    /** pra teste: chamadas de desenho e numero de segmentos */
    info() { return { drawCalls: renderer.info.render.calls, segments: data.count, dpr, size: [W, Hh], progress: pShown, timeline: Math.max(pShown, intro) }; },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (finePointer) window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect(); ro.disconnect();
      geo.dispose(); material.dispose(); if (halo) halo.material.dispose();
      panelGeo.dispose(); panelMat.dispose();
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
