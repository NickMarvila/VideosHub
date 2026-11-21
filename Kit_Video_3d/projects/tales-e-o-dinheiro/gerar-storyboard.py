"""Gera storyboard.json do vídeo 'Tales e o dinheiro' (cenário fixo repetido em todas as cenas)."""
import json
from pathlib import Path

AQUI = Path(__file__).parent
DUR = 38.0

TALES = {"skin": "#d9a27a", "top": {"color": "#d62828"}, "bottom": {"color": "#2b2d42", "type": "pants"},
         "hair": {"style": "short", "color": "#3b2a1a"}, "face": {"mustache": True}, "hat": {"type": "none"}}

CENARIO = [
    {"id": "mercado", "asset": "loja", "variante": "mercado", "pos": [0, 0, 0]},
    {"id": "sobrado", "asset": "sobrado", "variante": "salmao", "pos": [-11, 0, 0]},
    {"id": "casa", "asset": "casa_simples", "variante": "azul", "pos": [11, 0, 0]},
    {"id": "arv1", "asset": "arvore_redonda", "pos": [-6, 0, 5.5], "params": {"seed": 2}},
    {"id": "arv2", "asset": "arvore_redonda", "pos": [7, 0, 5.8], "params": {"seed": 5}},
    {"id": "poste", "asset": "poste_luz", "pos": [-4.5, 0, 9]},
    {"id": "lixeira", "asset": "lixeira", "variante": "azul", "pos": [3.2, 0, 5.6]},
]
PARATI = {"id": "parati", "asset": "carro_hatch", "params": {"color": "#b8bec6"}, "pos": [6, 0, 11], "giro": 90}


def carro_passando(de, ate, z=17, cor="#3d6fb6", ida=True):
    x0, x1 = (-22, 22) if ida else (22, -22)
    return {"id": f"carro_{de}", "asset": "carro_sedan", "params": {"color": cor}, "pos": [x0, 0, z],
            "giro": 90 if ida else -90, "movimentos": [{"de": de, "ate": ate, "para": [x1, z]}]}


def tales(pos, giro=0, **extra):
    p = {"id": "tales", "preset": "homem", "overrides": TALES, "pos": pos, "giro": giro}
    p.update(extra)
    return p


def cena(inicio, fim, objetos=(), personagens=(), camera=None, **extra):
    c = {"inicio": inicio, "fim": fim, "objetos": CENARIO + list(objetos), "personagens": list(personagens),
         "camera": camera}
    c.update(extra)
    return c


cenas = [
    # 1. Esse é o Tales.
    cena(0, 3.2,
         objetos=[PARATI, carro_passando(0, 3.2)],
         personagens=[tales([-3, 0, 8], 90,
                            movimentos=[{"de": 0, "ate": 1.4, "para": [0, 8], "clip": "walk"}],
                            viraPara=[{"em": 1.4, "alvo": "camera"}],
                            acoes=[{"clip": "wave", "de": 1.5, "ate": 3.2, "expressao": "happy"}])],
         camera={"tipo": "enquadrar", "alvo": "tales", "plano": "medio", "angulo": 0, "elevacao": 8, "aproxima": 0.85},
         textos=[{"texto": "ESSE É O TALES", "de": 0.1, "ate": 3.1, "estilo": "titulo"}]),
    # 2. trabalha numa rede de supermercado, e dirige uma Paratí.
    cena(3.2, 6.6, transicao="flash",
         objetos=[{**PARATI, "pos": [16, 0, 11], "movimentos": [{"de": 4.6, "ate": 6.2, "para": [6, 11]}]}],
         personagens=[tales([0, 0, 5.4], 0,
                            movimentos=[{"de": 3.3, "ate": 5.6, "para": [3.5, 9], "clip": "carry"}],
                            acoes=[{"clip": "carry", "de": 3.3, "ate": 5.6, "params": {"walking": 1}}])],
         fluxos=[{"material": "fumaca", "origem": {"ancora": "parati", "desloca": [0, 0.3, -2.1]}, "taxa": 12, "de": 4.6, "ate": 6.6}],
         camera={"tipo": "travelling", "de": {"pos": [1, 2.6, 15], "olha": [1, 1.2, 5]}, "para": {"pos": [5.5, 2.2, 15.5], "olha": [4.5, 1.0, 9.5]}}),
    # 3. sério problema com dinheiro: não pode sobrar um dinheirinho
    cena(6.6, 9.6,
         objetos=[PARATI, carro_passando(6.6, 9.6, cor="#f2c94c", ida=False)],
         personagens=[tales([0, 0, 8], 0, viraPara=[{"em": 6.6, "alvo": "camera"}],
                            acoes=[{"clip": "think", "de": 6.6, "ate": 8.2, "expressao": "thinking"},
                                   {"clip": "cheer", "de": 8.2, "ate": 9.6, "expressao": "happy"}])],
         fluxos=[{"material": "luz", "origem": {"ancora": "tales", "desloca": [0.3, 0.9, 0.2]}, "taxa": 25, "de": 8.0, "ate": 9.6}],
         elementos=[{"tipo": "icone", "icone": "dinheiro", "ancora": "tales", "alturaRel": 1.25, "dx": 0.18, "tamanho": 0.16, "pulsa": True, "de": 7.4, "ate": 9.6}],
         camera={"tipo": "enquadrar", "alvo": "tales", "plano": "close", "angulo": 10, "elevacao": 6, "aproxima": 0.9}),
    # 3b. que ele já quer gastar
    cena(9.6, 11.52, transicao="flash",
         objetos=[PARATI],
         personagens=[tales([6, 0, 9], 0, movimentos=[{"de": 9.7, "ate": 11.4, "para": [0.5, 5.6], "clip": "run"}])],
         fluxos=[{"material": "poeira", "origem": {"ancora": "tales", "desloca": [0, 0.05, 0]}, "taxa": 18, "de": 9.7, "ate": 11.4}],
         camera={"tipo": "enquadrar", "alvo": "mercado", "plano": "geral", "angulo": 35, "elevacao": 12, "deriva": 8},
         textos=[{"texto": "SOBROU? GASTOU!", "de": 9.8, "ate": 11.5, "estilo": "destaque"}]),
    # 4. E isso acontece direto.
    cena(11.52, 14.46, ambiente={"horario": "tarde"},
         objetos=[PARATI, carro_passando(11.52, 14.46), carro_passando(12.2, 14.46, z=19, cor="#4f9d5a", ida=False)],
         personagens=[tales([-8, 0, 9], 90, movimentos=[{"de": 11.6, "ate": 14.4, "para": [-2, 9], "clip": "walk"}],
                            acoes=[{"clip": "look_around", "de": 11.6, "ate": 14.4, "camada": 1, "mascara": ["head"]}])],
         fluxos=[{"material": "fumaca", "origem": {"ancora": "carro_11.52", "desloca": [0, 0.3, -2.2]}, "taxa": 14, "de": 11.52, "ate": 14.46}],
         camera={"tipo": "travelling", "de": {"pos": [-12, 3, 18], "olha": [-8, 1.2, 9]}, "para": {"pos": [-4, 2.6, 17], "olha": [-2, 1.2, 9]}}),
    # 5. semana inteira reclamando que tá sem dinheiro
    cena(14.46, 18.62,
         objetos=[PARATI, carro_passando(14.46, 18.62, cor="#d9473a")],
         personagens=[tales([-0.6, 0, 8], 25, acoes=[{"clip": "talk", "de": 14.46, "ate": 16.8, "expressao": "angry", "params": {"energy": 1.4}},
                                                   {"clip": "shrug", "de": 16.8, "ate": 18.62, "expressao": "sad"}]),
                      {"id": "colega", "preset": "mulher", "pos": [0.8, 0, 8.3], "giro": -55,
                       "acoes": [{"clip": "shake_head", "de": 15.2, "ate": 18.62, "expressao": "worried"}]}],
         efeitos=[{"tipo": "pretoebranco", "de": 16.6, "ate": 18.62, "zoom": 1.08}],
         elementos=[{"tipo": "icone", "icone": "dinheiro", "ancora": "tales", "alturaRel": 1.25, "dx": -0.16, "tamanho": 0.14, "de": 15.0, "ate": 18.62},
                    {"tipo": "icone", "icone": "x", "ancora": "tales", "alturaRel": 1.25, "dx": -0.16, "tamanho": 0.15, "de": 15.6, "ate": 18.62}],
         camera={"tipo": "fixa", "pos": [0.1, 1.6, 15.5], "olha": [0.1, 1.1, 8.1], "fov": 40}),
    # 6. a Paratí tá sem freio
    cena(18.62, 21.3, transicao="flash",
         objetos=[{**PARATI, "pos": [-6, 0, 11], "movimentos": [{"de": 18.7, "ate": 20.6, "para": [5, 11]}]},
                  {"id": "cone1", "asset": "cone", "pos": [3, 0, 11],
                   "movimentos": [{"de": 20.2, "ate": 20.7, "para": [4.6, 12.4]}], "anim": {"giro": [[20.2, 0], [20.7, 85]], "eixo": "z"}}],
         personagens=[tales([-1, 0, 7], 0, viraPara=[{"em": 18.7, "alvo": "parati"}],
                            acoes=[{"clip": "surprised", "de": 19.6, "ate": 21.3, "expressao": "surprised"}])],
         fluxos=[{"material": "fumaca", "origem": {"ancora": "parati", "desloca": [0, 0.3, -2.1]}, "taxa": 20, "de": 18.7, "ate": 20.6},
                 {"material": "poeira", "origem": {"ancora": "parati", "desloca": [0, 0.05, 1.2]}, "taxa": 30, "de": 19.8, "ate": 20.8}],
         efeitos=[{"tipo": "tremor", "de": 20.3, "ate": 20.9, "intensidade": 0.6}],
         camera={"tipo": "enquadrar", "alvo": "parati", "plano": "geral", "angulo": 20, "elevacao": 8}),
    # 7. E no dia seguinte?
    cena(21.3, 23.0, transicao="flash",
         objetos=[PARATI, carro_passando(21.3, 23.0, cor="#f2c94c")],
         personagens=[tales([0, 0, 4], 0, movimentos=[{"de": 21.4, "ate": 23.0, "para": [0, 8], "clip": "walk"}],
                            acoes=[{"clip": "walk", "de": 21.4, "ate": 23.0, "expressao": "happy"}])],
         camera={"tipo": "enquadrar", "alvo": "tales", "plano": "medio", "angulo": 0, "elevacao": 6, "aproxima": 1.1},
         textos=[{"texto": "NO DIA SEGUINTE...", "de": 21.4, "ate": 23.0, "estilo": "rodape"}]),
    # 8. Aparece com um smartwatch de mil reais.
    cena(23.0, 25.96,
         objetos=[PARATI, carro_passando(23.0, 25.96, ida=False)],
         personagens=[tales([0, 0, 8], 0, viraPara=[{"em": 23.0, "alvo": "camera"}],
                            acoes=[{"clip": "cheer", "de": 23.1, "ate": 25.96, "expressao": "laugh"}])],
         fluxos=[{"material": "luz", "origem": {"ancora": "tales", "desloca": [0, 1.2, 0]}, "taxa": 40, "dispersao": 0.8, "de": 23.2, "ate": 25.96}],
         elementos=[{"tipo": "icone", "icone": "relogio", "ancora": "tales", "alturaRel": 1.3, "dx": 0.2, "tamanho": 0.17, "pulsa": True, "de": 23.4, "ate": 25.96},
                    {"tipo": "etiqueta", "texto": "SMARTWATCH: R$ 1.000", "pos": [0.5, 0.2], "ponto": "#ffd60a", "de": 23.8, "ate": 25.96}],
         camera={"tipo": "enquadrar", "alvo": "tales", "plano": "close", "angulo": -10, "elevacao": 5, "aproxima": 0.85}),
    # 9. Aaai, ai... Esse Tales.
    cena(25.96, 28.1, transicao="flash",
         objetos=[PARATI, carro_passando(25.96, 28.1, z=18, cor="#4f9d5a")],
         personagens=[{"id": "velho", "preset": "velhinho", "pos": [2, 0, 10], "giro": -20, "viraPara": [{"em": 25.96, "alvo": "camera"}],
                       "acoes": [{"clip": "shake_head", "de": 26.0, "ate": 28.1, "expressao": "sleepy"}]},
                      tales([-2.5, 0, 6.5], 20, acoes=[{"clip": "cheer", "de": 25.96, "ate": 28.1, "expressao": "happy"}])],
         camera={"tipo": "enquadrar", "alvo": "velho", "plano": "medio", "angulo": 10, "elevacao": 6, "deriva": 6}),
    # 10. Não pode sobrar um dinheirinho, que já quer gastar.
    cena(28.1, 31.56,
         objetos=[PARATI],
         personagens=[tales([8, 0, 10], 0, movimentos=[{"de": 28.3, "ate": 31.0, "para": [0.5, 5.6], "clip": "run"}])],
         fluxos=[{"material": "luz", "origem": {"ancora": "tales", "desloca": [0.3, 0.9, 0]}, "taxa": 20, "de": 28.3, "ate": 31.0},
                 {"material": "poeira", "origem": {"ancora": "tales", "desloca": [0, 0.05, 0]}, "taxa": 16, "de": 28.3, "ate": 31.0}],
         camera={"tipo": "enquadrar", "alvo": "mercado", "plano": "geral", "angulo": -25, "elevacao": 16, "deriva": -10},
         textos=[{"texto": "NÃO PODE SOBRAR!", "de": 28.3, "ate": 31.4, "estilo": "destaque"}]),
    # 11. E aí, você também conhece um Tales? Marca ele...
    cena(31.56, DUR, transicao="flash",
         objetos=[PARATI, carro_passando(31.56, DUR, cor="#d9473a")],
         personagens=[tales([0, 0, 8], 0, viraPara=[{"em": 31.56, "alvo": "camera"}],
                            acoes=[{"clip": "talk", "de": 31.56, "ate": 35.3, "expressao": "happy"},
                                   {"clip": "wave", "de": 35.3, "ate": DUR, "expressao": "laugh"}])],
         camera={"tipo": "enquadrar", "alvo": "tales", "plano": "medio", "angulo": 0, "elevacao": 6, "aproxima": 0.85},
         textos=[{"texto": "VOCÊ CONHECE UM TALES?", "de": 31.7, "ate": DUR, "estilo": "pergunta"}]),
]

sb = {
    "versao": 1, "titulo": "Tales e o dinheiro",
    "formato": {"largura": 1080, "altura": 1920, "fps": 30},
    "duracao": DUR, "audio": "narracao.wav", "palavras": "palavras.json",
    "legendas": {"ativo": True, "palavrasPorBloco": 1, "corDestaque": "#ffd60a"},
    "ambiente": {"horario": "dia", "fundo": "cidade", "chao": "concreto", "nuvens": True},
    "cenas": cenas,
}
(AQUI / "storyboard.json").write_text(json.dumps(sb, ensure_ascii=False, indent=1), encoding="utf-8")
print("ok", len(cenas), "cenas")
