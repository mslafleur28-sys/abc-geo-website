#!/usr/bin/env python3
"""Generate placeholder comic art for the Artie section."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public" / "artie"
INK = "#1A202C"
CORAL = "#FF6B4A"
SKIN = "#FFD7CC"
SKY = "#00B4D8"
CREAM = "#FAF9F6"
MINT = "#00C9A7"
SLATE = "#334155"
WHITE = "#FFFFFF"
FLOOR = "#E4EEF1"
WOOD = "#C4B7A6"


def esc(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def bubble(x, y, w, h, lines, size=30):
    text_y = y + 36 + (8 if len(lines) == 1 else 0)
    spans = []
    for index, line in enumerate(lines):
        dy = 0 if index == 0 else 38
        spans.append(f'<tspan x="{x + 26}" dy="{dy}">{esc(line)}</tspan>')
    return f'''
    <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22" fill="{WHITE}" stroke="{INK}" stroke-width="4"/>
    <text y="{text_y}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="{size}" font-weight="700" fill="{INK}">{''.join(spans)}</text>
    '''


def hair_artie():
    return f'<path d="M-36 -214 C-30 -268 38 -268 38 -214 L30 -196 H-28 Z" fill="{CORAL}" stroke="{INK}" stroke-width="4"/>'


def hair_janet():
    return f'''
      <path d="M-34 -208 C-40 -250 40 -250 36 -206" fill="{SKY}" stroke="{INK}" stroke-width="4"/>
      <circle cx="2" cy="-248" r="16" fill="{SKY}" stroke="{INK}" stroke-width="4"/>
    '''


def hair_greg():
    return f'<path d="M-34 -214 H36 V-188 H-34 Z" fill="{SLATE}" stroke="{INK}" stroke-width="4"/>'


def hair_dev():
    return f'''
      <path d="M-34 -210 C-20 -258 42 -250 36 -206" fill="{INK}"/>
      <path d="M-46 -188 Q2 -230 50 -188" fill="none" stroke="{SKY}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="-46" cy="-188" r="10" fill="{SKY}" stroke="{INK}" stroke-width="3"/>
      <circle cx="50" cy="-188" r="10" fill="{SKY}" stroke="{INK}" stroke-width="3"/>
    '''


def face(expression):
    if expression == "flat":
        mouth = f'<path d="M-10 -168 H16" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
        brows = f'<path d="M-22 -206 L-6 -200 M8 -200 L24 -208" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>'
    elif expression == "cheer":
        mouth = f'<path d="M-14 -166 Q2 -148 18 -166" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
        brows = ""
    else:
        mouth = f'<path d="M-12 -168 Q2 -154 16 -168" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
        brows = ""
    glasses = ""
    if expression == "glasses":
        glasses = f'''
          <circle cx="-12" cy="-186" r="12" fill="none" stroke="{INK}" stroke-width="3"/>
          <circle cx="16" cy="-186" r="12" fill="none" stroke="{INK}" stroke-width="3"/>
          <path d="M0 -186 H4" stroke="{INK}" stroke-width="3"/>
        '''
        mouth = f'<path d="M-10 -164 Q2 -154 16 -164" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
    return f'''
      <circle cx="-12" cy="-186" r="4.2" fill="{INK}"/>
      <circle cx="16" cy="-186" r="4.2" fill="{INK}"/>
      {mouth}
      {brows}
      {glasses}
    '''


def character(kind, expression="smile"):
    if kind == "artie":
        shirt, hair, expr = CORAL, hair_artie(), face(expression)
    elif kind == "janet":
        shirt, hair, expr = SKY, hair_janet(), face("glasses")
    elif kind == "greg":
        shirt, hair, expr = SLATE, hair_greg(), face("flat")
    else:
        shirt, hair, expr = MINT, hair_dev(), face(expression if expression != "smile" else "cheer")
    return f'''
    <g>
      <rect x="-16" y="-86" width="14" height="86" rx="7" fill="{INK}"/>
      <rect x="8" y="-86" width="14" height="86" rx="7" fill="{INK}"/>
      <rect x="-36" y="-162" width="74" height="88" rx="26" fill="{shirt}" stroke="{INK}" stroke-width="4"/>
      <rect x="-56" y="-150" width="22" height="62" rx="11" fill="{SKIN}" stroke="{INK}" stroke-width="4"/>
      <rect x="36" y="-150" width="22" height="62" rx="11" fill="{SKIN}" stroke="{INK}" stroke-width="4"/>
      <circle cx="2" cy="-198" r="40" fill="{SKIN}" stroke="{INK}" stroke-width="4"/>
      {hair}
      {expr}
    </g>
    '''


def place(kind, x, y, scale=1, expression="smile"):
    return f'<g transform="translate({x} {y}) scale({scale})">{character(kind, expression)}</g>'


def room():
    return f'''
    <rect x="70" y="86" width="250" height="170" rx="16" fill="#D7F3FA" stroke="{INK}" stroke-width="4"/>
    <path d="M195 86 V256 M70 171 H320" stroke="{INK}" stroke-width="4"/>
    <circle cx="150" cy="140" r="28" fill="#FFE08A" stroke="{INK}" stroke-width="4"/>
    <rect x="40" y="500" width="1120" height="180" fill="{FLOOR}"/>
    <rect x="40" y="500" width="1120" height="14" fill="#D5E3E8"/>
    '''


def desk(x, y):
    return f'''
    <rect x="{x}" y="{y}" width="300" height="18" rx="6" fill="{WOOD}" stroke="{INK}" stroke-width="4"/>
    <rect x="{x + 28}" y="{y + 18}" width="14" height="70" fill="{INK}"/>
    <rect x="{x + 250}" y="{y + 18}" width="14" height="70" fill="{INK}"/>
    <rect x="{x + 78}" y="{y - 78}" width="150" height="96" rx="8" fill="{WHITE}" stroke="{INK}" stroke-width="4"/>
    <rect x="{x + 90}" y="{y - 66}" width="126" height="70" rx="4" fill="#E7F7FB"/>
    '''


def panel(body):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720" width="1200" height="720">
  <defs>
    <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="1.4" cy="1.4" r="1.4" fill="{INK}" opacity="0.08"/>
    </pattern>
  </defs>
  <rect width="1200" height="720" fill="{INK}"/>
  <rect x="16" y="16" width="1168" height="688" rx="28" fill="{CREAM}"/>
  <rect x="16" y="16" width="1168" height="688" rx="28" fill="url(#dots)"/>
  {body}
</svg>
'''


def portrait(kind, background):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="400" height="480">
  <rect width="400" height="480" fill="{background}"/>
  <circle cx="200" cy="150" r="120" fill="{WHITE}" opacity="0.45"/>
  <g transform="translate(198 430) scale(1.15)">{character(kind)}</g>
</svg>
'''


def main():
    (ROOT / "episodes").mkdir(parents=True, exist_ok=True)
    (ROOT / "cast").mkdir(parents=True, exist_ok=True)

    episodes = {
        "the-vague-question.svg": panel(
            room()
            + desk(690, 470)
            + place("artie", 620, 560, 0.92)
            + f'<text x="868" y="430" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="22" font-weight="700" fill="{INK}">¯\\_(ツ)_/¯</text>'
            + bubble(70, 70, 430, 120, ["Make us famous."])
        ),
        "answer-first.svg": panel(
            room()
            + desk(760, 470)
            + place("janet", 430, 560, 0.92)
            + place("artie", 680, 560, 0.86)
            + f'<rect x="500" y="250" width="150" height="90" rx="10" fill="{WHITE}" stroke="{CORAL}" stroke-width="4" transform="rotate(-8 575 295)"/>'
            + f'<text x="520" y="292" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" font-weight="700" fill="{CORAL}" transform="rotate(-8 575 295)">Answer first</text>'
            + bubble(70, 64, 520, 150, ["Answer the question", "first."])
        ),
        "zero-citations.svg": panel(
            room()
            + f'<rect x="430" y="250" width="340" height="230" rx="16" fill="{WHITE}" stroke="{INK}" stroke-width="4"/>'
            + f'<path d="M470 430 H730 M470 430 V290" stroke="{INK}" stroke-width="4"/>'
            + "".join(
                f'<rect x="{490 + i * 48}" y="400" width="28" height="18" fill="{CORAL}"/>'
                for i in range(4)
            )
            + f'<text x="600" y="300" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28" font-weight="700" fill="{INK}">0 citations</text>'
            + place("greg", 300, 560, 0.9)
            + place("artie", 900, 560, 0.78, "flat")
            + bubble(70, 60, 500, 150, ["A vibe is not", "a citation."])
        ),
        "ship-the-snippet.svg": panel(
            room()
            + place("janet", 280, 545, 0.62)
            + place("greg", 430, 545, 0.62)
            + place("artie", 580, 545, 0.62)
            + place("dev", 860, 575, 1.05)
            + f'<rect x="930" y="300" width="120" height="200" rx="16" fill="{WHITE}" stroke="{INK}" stroke-width="4"/>'
            + f'<rect x="946" y="330" width="88" height="120" rx="8" fill="#E7FBF6" stroke="{INK}" stroke-width="3"/>'
            + f'<text x="990" y="390" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" font-weight="700" fill="{INK}">Q → A</text>'
            + bubble(60, 60, 460, 120, ["I shipped the snippet."])
        ),
        "coffee-and-citations.svg": panel(
            f'<rect x="40" y="430" width="1120" height="250" fill="{FLOOR}"/>'
            + f'<rect x="360" y="430" width="480" height="22" rx="8" fill="{WOOD}" stroke="{INK}" stroke-width="4"/>'
            + "".join(
                f'<g transform="translate({470 + i * 90} 400)"><rect x="-16" y="0" width="32" height="28" rx="6" fill="{color}" stroke="{INK}" stroke-width="3"/><rect x="-8" y="-16" width="16" height="16" fill="{color}" stroke="{INK}" stroke-width="3"/></g>'
                for i, color in enumerate([CORAL, SKY, SLATE, MINT])
            )
            + f'<rect x="520" y="360" width="150" height="70" rx="8" fill="{WHITE}" stroke="{INK}" stroke-width="3"/>'
            + f'<text x="595" y="400" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" font-weight="700" fill="{INK}">who said what</text>'
            + place("janet", 250, 560, 0.78)
            + place("artie", 470, 500, 0.7)
            + place("greg", 740, 500, 0.7)
            + place("dev", 980, 560, 0.78)
        ),
        "they-quoted-us.svg": panel(
            room()
            + f'<rect x="470" y="150" width="280" height="150" rx="18" fill="{WHITE}" stroke="{CORAL}" stroke-width="6"/>'
            + f'<text x="610" y="215" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="32" font-weight="700" fill="{INK}">They quoted</text>'
            + f'<text x="610" y="258" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="32" font-weight="700" fill="{CORAL}">us.</text>'
            + place("janet", 230, 560, 0.72, "cheer")
            + place("artie", 600, 580, 1)
            + place("greg", 860, 560, 0.72)
            + place("dev", 1020, 560, 0.72)
        ),
    }

    for name, svg in episodes.items():
        (ROOT / "episodes" / name).write_text(svg, encoding="utf-8")

    portraits = {
        "artie.svg": ("artie", "#FFE8E2"),
        "janet.svg": ("janet", "#E5F8FC"),
        "greg.svg": ("greg", "#EEF2F6"),
        "dev.svg": ("dev", "#E7FBF6"),
    }
    for name, (kind, background) in portraits.items():
        (ROOT / "cast" / name).write_text(portrait(kind, background), encoding="utf-8")

    placeholder = panel(
        f'<text x="600" y="340" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="48" font-weight="700" fill="{INK}">Panel coming soon</text>'
        + f'<text x="600" y="400" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="24" fill="{SLATE}">Artwork for this strip is not available yet.</text>'
    )
    (ROOT / "placeholder.svg").write_text(placeholder, encoding="utf-8")


if __name__ == "__main__":
    main()
