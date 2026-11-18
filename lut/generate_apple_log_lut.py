#!/usr/bin/env python3
"""Erzeugt apple-log-to-rec709-33.cube: Apple Log Profile (Rec.2020) -> Rec.709 (BT.1886, Gamma 2.4).

Kurve gemaess Apple Log Profile White Paper (2023) / colour-science log_decoding_AppleLogProfile.
Aufruf: python3 generate_apple_log_lut.py"""

SIZE = 33
OUT_FILE = "apple-log-to-rec709-33.cube"
TITLE = "Apple Log (Rec.2020) to Rec.709 (BT.1886)"
OUTPUT_GAMMA = 2.4

R0 = -0.05641088
RT = 0.01
C = 47.28711236
BETA = 0.00964052
GAMMA = 0.08550479
DELTA = 0.69336945
PT = C * (RT - R0) ** 2

RGB2020_TO_XYZ = [
    [0.6369580483012914, 0.14461690358620832, 0.1688809751641721],
    [0.26270021002182625, 0.6779980715188708, 0.05930171646986196],
    [0.0, 0.028072693049087428, 1.060985057710791],
]
XYZ_TO_RGB709 = [
    [3.2409699419045214, -1.5373831775700955, -0.49861076029300328],
    [-0.9692436362808796, 1.8759675015077207, 0.041555057407175613],
    [0.05563007969699366, -0.20397695888897657, 1.0569715142428786],
]


def matmul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


REC2020_TO_REC709 = matmul(XYZ_TO_RGB709, RGB2020_TO_XYZ)


def apple_log_decode(v):
    if v < 0.0:
        return R0
    if v < PT:
        return v / C + R0
    return 2.0 ** ((v - DELTA) / GAMMA) - BETA


def clamp01(x):
    return 0.0 if x < 0.0 else (1.0 if x > 1.0 else x)


def transform(r, g, b):
    lin = [max(0.0, apple_log_decode(v)) for v in (r, g, b)]
    m = REC2020_TO_REC709
    out = [sum(m[i][k] * lin[k] for k in range(3)) for i in range(3)]
    return tuple(clamp01(max(0.0, x) ** (1.0 / OUTPUT_GAMMA)) for x in out)


def main():
    lines = [
        f'TITLE "{TITLE}"',
        f"LUT_3D_SIZE {SIZE}",
        "DOMAIN_MIN 0.0 0.0 0.0",
        "DOMAIN_MAX 1.0 1.0 1.0",
    ]
    for ri in range(SIZE):
        r = ri / (SIZE - 1)
        for gi in range(SIZE):
            g = gi / (SIZE - 1)
            for bi in range(SIZE):
                b = bi / (SIZE - 1)
                ro, go, bo = transform(r, g, b)
                lines.append(f"{ro:.6f} {go:.6f} {bo:.6f}")
    with open(OUT_FILE, "w", encoding="ascii", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    print(f"{OUT_FILE}: {len(lines) - 4} Eintraege ({SIZE}^3) geschrieben")


if __name__ == "__main__":
    main()
