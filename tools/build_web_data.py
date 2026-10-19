"""Build the browser dataset used by MathCopy.

The symbol lists and Chinese names were extracted from the public SymbolDb math
pages (see extract_data.py). This script adds stable keys plus Unicode/LaTeX
metadata and writes web/data.js.
"""
import json
from pathlib import Path

ROOT = Path(r"C:\DSH_projects")
SRC = ROOT / "data" / "symbols.json"
OUT = ROOT / "web" / "data.js"

LATEX = {
    "+": "+", "−": "-", "×": r"\times", "÷": r"\div", "=": "=", "≠": r"\neq",
    ">": ">", "<": "<", "≥": r"\geq", "≤": r"\leq", "≈": r"\approx",
    "∞": r"\infty", "√": r"\sqrt{}", "∛": r"\sqrt[3]{}", "∜": r"\sqrt[4]{}",
    "∑": r"\sum", "∏": r"\prod", "∐": r"\coprod", "∫": r"\int",
    "∂": r"\partial", "∇": r"\nabla", "∈": r"\in", "∉": r"\notin",
    "⊂": r"\subset", "⊃": r"\supset", "∪": r"\cup", "∩": r"\cap",
    "∅": r"\emptyset", "∀": r"\forall", "∃": r"\exists", "¬": r"\neg",
    "∧": r"\land", "∨": r"\lor", "→": r"\rightarrow", "←": r"\leftarrow",
    "↔": r"\leftrightarrow", "⇒": r"\Rightarrow", "⇐": r"\Leftarrow",
    "⇔": r"\Leftrightarrow", "∠": r"\angle", "⊥": r"\perp", "∥": r"\parallel",
    "△": r"\triangle", "π": r"\pi", "φ": r"\varphi", "γ": r"\gamma",
    "λ": r"\lambda", "ζ": r"\zeta", "σ": r"\sigma", "τ": r"\tau",
    "μ": r"\mu", "ρ": r"\rho", "α": r"\alpha", "β": r"\beta",
    "ℕ": r"\mathbb{N}", "ℤ": r"\mathbb{Z}", "ℚ": r"\mathbb{Q}",
    "ℝ": r"\mathbb{R}", "ℂ": r"\mathbb{C}", "ℍ": r"\mathbb{H}",
    "𝔸": r"\mathbb{A}", "𝔹": r"\mathbb{B}", "𝕍": r"\mathbb{V}",
    "𝕎": r"\mathbb{W}", "ℬ": r"\mathcal{B}", "ℱ": r"\mathcal{F}",
    "ℒ": r"\mathcal{L}", "ℋ": r"\mathcal{H}", "ℳ": r"\mathcal{M}",
    "ℛ": r"\mathcal{R}", "ℐ": r"\mathcal{I}", "𝓝": r"\mathcal{N}",
    "𝒵": r"\mathcal{Z}", "℘": r"\wp", "ℵ": r"\aleph", "ℶ": r"\beth",
    "·": r"\cdot", "⋅": r"\cdot", "⊗": r"\otimes", "⊕": r"\oplus",
    "⊙": r"\odot", "⊖": r"\ominus", "⊘": r"\oslash", "⊛": r"\circledast",
    "⊠": r"\boxtimes", "⊡": r"\boxdot", "∝": r"\propto",
    "≅": r"\cong", "≡": r"\equiv", "≃": r"\simeq", "∼": r"\sim",
    "≪": r"\ll", "≫": r"\gg", "±": r"\pm", "∓": r"\mp",
    "∬": r"\iint", "∭": r"\iiint", "∮": r"\oint", "∯": r"\oiint",
    "∰": r"\oiiint", "∆": r"\Delta", "∎": r"\blacksquare",
    "∴": r"\therefore", "∵": r"\because", "⊤": r"\top", "⊥": r"\perp",
    "⊢": r"\vdash", "⊣": r"\dashv", "⊨": r"\models", "⊩": r"\Vdash",
    "∄": r"\nexists", "⊕": r"\oplus", "⊻": r"\veebar", "⊼": r"\barwedge",
    "⊽": r"\barvee", "≔": r"\coloneqq", "≝": r"\eqqcolon",
    "≉": r"\not\approx", "≄": r"\not\simeq", "≇": r"\ncong",
    "≢": r"\not\equiv", "≺": r"\prec", "≻": r"\succ", "≼": r"\preceq",
    "≽": r"\succeq", "≗": r"\circeq", "≜": r"\triangleq",
    "⊄": r"\not\subset", "⊅": r"\not\supset", "⊈": r"\nsubseteq",
    "⊉": r"\nsupseteq", "⊊": r"\subsetneq", "⊋": r"\supsetneq",
    "⋂": r"\bigcap", "⋃": r"\bigcup", "⊓": r"\sqcap", "⊔": r"\sqcup",
    "∖": r"\setminus", "∁": r"\complement", "∋": r"\ni", "∌": r"\not\ni",
    "∘": r"\circ", "⇀": r"\rightharpoonup", "⇁": r"\rightharpoondown",
    "↦": r"\mapsto", "‖": r"\Vert", "†": r"\dagger", "⊺": r"\intercal",
    "∠": r"\angle", "∡": r"\measuredangle", "∢": r"\sphericalangle",
    "∟": r"\rightangle", "°": r"^{\circ}", "′": "'", "″": "''", "‴": "'''",
    "∦": r"\nparallel", "▽": r"\triangledown", "□": r"\square",
    "◇": r"\diamond", "○": r"\bigcirc", "●": r"\bullet", "◯": r"\bigcirc",
    "⌒": r"\frown", "∽": r"\backsim",
    "↑": r"\uparrow", "↓": r"\downarrow", "↕": r"\updownarrow",
    "↖": r"\nwarrow", "↗": r"\nearrow", "↘": r"\searrow", "↙": r"\swarrow",
    "↩": r"\hookleftarrow", "↪": r"\hookrightarrow",
    "↺": r"\circlearrowleft", "↻": r"\circlearrowright", "⇑": r"\Uparrow",
    "⇓": r"\Downarrow", "⇕": r"\Updownarrow", "⇚": r"\Lleftarrow",
    "⇛": r"\Rrightarrow", "⇤": r"\leftharpoonup", "⇥": r"\rightharpoonup",
    "↼": r"\leftharpoonup", "↽": r"\leftharpoondown",
    "⇌": r"\rightleftharpoons", "⇋": r"\leftrightharpoons",
    "⇝": r"\rightsquigarrow", "⇢": r"\dashrightarrow", "⇎": r"\nLeftrightarrow",
    "(": "(", ")": ")", "[": "[", "]": "]", "{": r"\{", "}": r"\}",
    "⟨": r"\langle", "⟩": r"\rangle", "⌈": r"\lceil", "⌉": r"\rceil",
    "⌊": r"\lfloor", "⌋": r"\rfloor", "|": r"\mid", "\\": r"\backslash",
    "&": r"\&", "#": r"\#", "⋯": r"\cdots", "⋮": r"\vdots", "⋱": r"\ddots",
    "⋰": r"\iddots", "_": "_", "^": r"\hat{}", "∖": r"\setminus",
    "dx": "dx", "dy": "dy", "dt": "dt", "lim": r"\lim", "sup": r"\sup",
    "inf": r"\inf", "max": r"\max", "min": r"\min", "exp": r"\exp",
    "log": r"\log", "ln": r"\ln", "lg": r"\lg", "sin": r"\sin",
    "cos": r"\cos", "tan": r"\tan", "cot": r"\cot", "sec": r"\sec",
    "csc": r"\csc", "arg": r"\arg", "gcd": r"\gcd",
    "lcm": r"\operatorname{lcm}", "mod": r"\bmod", "sgn": r"\operatorname{sgn}",
    "abs": r"\operatorname{abs}", "det": r"\det", "tr": r"\operatorname{tr}",
    "rank": r"\operatorname{rank}", "vec": r"\operatorname{vec}",
    "dim": r"\dim", "ker": r"\ker", "Var": r"\operatorname{Var}",
    "Cov": r"\operatorname{Cov}", "P": "P", "E": "E",
    "f(x)": "f(x)", "F(x)": "F(x)", "n!": "n!", "P_n": "P_n", "C_n": "C_n",
    "H₀": "H_0", "H₁": "H_1", "χ²": r"\chi^2", "iid": r"\text{iid}",
    "Q.E.D.": r"\text{Q.E.D.}", "s.t.": r"\text{s.t.}", "p.j.": r"\text{p.j.}",
}

ALIASES = {
    "+": "plus add addition", "−": "minus subtract", "×": "times multiply multiplication",
    "÷": "divide division", "=": "equals equal", "≠": "not equal neq",
    ">": "greater than gt", "<": "less than lt", "≥": "greater equal ge",
    "≤": "less equal le", "≈": "approx approximately", "∞": "infinity infinite",
    "√": "sqrt square root", "∛": "cbrt cube root", "∜": "fourth root",
    "∑": "sum sigma summation", "∏": "product prod", "∫": "integral int",
    "∂": "partial derivative", "∇": "nabla gradient", "∈": "in belongs element",
    "∉": "notin not in", "⊂": "subset", "⊃": "supset", "∪": "union cup",
    "∩": "intersection cap", "∅": "empty emptyset null", "∀": "forall universal",
    "∃": "exists existential", "¬": "not neg", "∧": "and wedge",
    "∨": "or vee", "→": "right arrow to", "←": "left arrow",
    "↔": "left right arrow iff", "⇒": "implies rightarrow", "⇐": "leftarrow",
    "⇔": "iff equivalent", "∠": "angle", "⊥": "perpendicular perp",
    "∥": "parallel", "△": "triangle", "π": "pi", "φ": "phi golden",
    "γ": "gamma", "λ": "lambda", "ζ": "zeta", "σ": "sigma",
    "τ": "tau", "μ": "mu", "ρ": "rho", "α": "alpha", "β": "beta",
    "ℕ": "natural numbers N", "ℤ": "integer numbers Z", "ℚ": "rational numbers Q",
    "ℝ": "real numbers R", "ℂ": "complex numbers C", "ℍ": "quaternion H",
    "·": "dot cdot", "⊗": "tensor otimes", "⊕": "oplus direct sum xor",
    "⊙": "odot", "∝": "proportional propto", "≅": "congruent cong",
    "≡": "equivalent equiv", "≃": "simeq", "∼": "sim similar",
    "≪": "ll much less", "≫": "gg much greater", "±": "plus minus pm",
    "∓": "minus plus mp", "∬": "double integral", "∭": "triple integral",
    "∮": "contour integral", "∆": "delta laplacian", "∎": "qed",
    "∴": "therefore", "∵": "because", "⊤": "top true", "⊥": "bottom false",
    "⊢": "vdash", "⊨": "models", "≔": "coloneqq", "≜": "triangleq",
    "‖": "norm parallel", "†": "dagger conjugate transpose",
    "°": "degree", "□": "square", "◇": "diamond", "○": "circle",
    "↑": "up arrow", "↓": "down arrow", "↕": "up down arrow",
    "↖": "nw arrow", "↗": "ne arrow", "↘": "se arrow", "↙": "sw arrow",
    "↩": "hook left arrow", "↪": "hook right arrow", "⇑": "double up arrow",
    "⇓": "double down arrow", "⇕": "double up down arrow",
    "⟨": "langle angle bracket", "⟩": "rangle", "⌈": "lceil ceil",
    "⌉": "rceil", "⌊": "lfloor floor", "⌋": "rfloor", "⋯": "cdots ellipsis",
    "⋮": "vdots", "⋱": "ddots", "dx": "differential dx", "dy": "differential dy",
    "dt": "differential dt", "lim": "limit", "sup": "supremum",
    "inf": "infimum", "log": "logarithm", "ln": "natural log",
    "sin": "sine", "cos": "cosine", "tan": "tangent", "det": "determinant",
    "dim": "dimension", "ker": "kernel", "tr": "trace",
}


def latex_for(char: str):
    return LATEX.get(char)


def aliases_for(char: str):
    return ALIASES.get(char, "")


def enrich(symbol, category=None):
    char = symbol["char"]
    item = {
        "key": f'{char}|{symbol["name"]}',
        "char": char,
        "name": symbol["name"],
        "latex": latex_for(char) or "",
        "aliases": aliases_for(char),
    }
    if category:
        item["categoryId"] = category["id"]
        item["categoryName"] = category["name"]
    return item


data = json.loads(SRC.read_text(encoding="utf-8"))
categories = []
for cat in data["categories"]:
    symbols = [enrich(s, cat) for s in cat["symbols"]]
    categories.append({
        "id": cat["id"],
        "name": cat["name"],
        "description": cat["description"],
        "symbols": symbols,
    })

# Map curated "all" symbols to their primary category.
char_to_cat = {}
for cat in categories:
    for sym in cat["symbols"]:
        char_to_cat.setdefault(sym["char"], (cat["id"], cat["name"], sym["name"]))

all_symbols = []
for s in data["all"]:
    item = enrich(s)
    cat = char_to_cat.get(s["char"])
    if cat:
        item["categoryId"], item["categoryName"] = cat[0], cat[1]
    else:
        item["categoryId"], item["categoryName"] = "common", "常用符号"
    all_symbols.append(item)

# Unique searchable universe: curated first, then every category symbol.
seen = set()
universe = []
for item in all_symbols + [s for c in categories for s in c["symbols"]]:
    if item["key"] in seen:
        continue
    seen.add(item["key"])
    universe.append(item)

payload = {
    "meta": {
        "source": "https://symboldb.org/zh/math/",
        "title": data["all_title"],
        "description": data["all_description"],
        "categoryCount": len(categories),
        "symbolCount": len(universe),
        "allCount": len(all_symbols),
    },
    "all": all_symbols,
    "categories": categories,
    "universe": universe,
}

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(
    "window.SYMBOL_DATA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes)")
print(f"all={len(all_symbols)} categories={len(categories)} unique={len(universe)}")
for cat in categories:
    missing = [s["char"] for s in cat["symbols"] if not s["latex"]]
    print(f"{cat['id']:26} {len(cat['symbols']):3}  no-latex={len(missing):2}")
missing_all = [s["char"] for s in all_symbols if not s["latex"]]
print("all missing latex:", missing_all)
