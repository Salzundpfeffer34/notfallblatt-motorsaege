#!/usr/bin/env python3
"""Erzeugt DJI-D-Log/D-Log2 -> Rec.709 (BT.1886) Konvertierungs-LUTs (.cube, 33^3).

Profile: "dlog"  = D-Log + D-Gamut  (DJI White Paper 2017 / ACES CSC.DJI.DLog_DGamut_to_ACES, z. B. Inspire 3 / Ronin 4D ProRes RAW)
         "dlog2" = D-Log2 + D-Gamut2 (offizielles DJI DCTL, z. B. Osmo Pocket 4P)
Aufruf: python3 generate_dji_lut.py"""

import math

SIZE = 33
OUTPUT_GAMMA = 2.4

D65 = (0.3127, 0.3290)
REC709_PRIMARIES = [(0.64, 0.33), (0.30, 0.60), (0.15, 0.06)]
DGAMUT_PRIMARIES = [(0.71, 0.31), (0.21, 0.88), (0.09, -0.08)]
DGAMUT2_PRIMARIES = [(0.7346787, 0.2653213), (0.15996793, 0.84003207), (0.08999182, -0.07999273)]
DGAMUT2_WHITE = (0.31267068, 0.32899023)

PROFILES = {
    "dlog": {
        "file": "dji-dlog-dgamut-to-rec709-33.cube",
        "title": "DJI D-Log (D-Gamut) to Rec.709 (BT.1886)",
        "primaries": DGAMUT_PRIMARIES,
        "white": D65,
    },
    "dlog2": {
        "file": "dji-dlog2-dgamut2-to-rec709-33.cube",
        "title": "DJI D-Log2 (D-Gamut2) to Rec.709 (BT.1886)",
        "primaries": DGAMUT2_PRIMARIES,
        "white": DGAMUT2_WHITE,
    },
}


def matmul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def inv3(m):
    a, b, c = m[0]
    d, e, f = m[1]
    g, h, i = m[2]
    det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
    return [
        [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
        [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
        [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
    ]


def rgb_to_xyz(primaries, white):
    cols = [[x / y, 1.0, (1.0 - x - y) / y] for (x, y) in primaries]
    p = [[cols[j][i] for j in range(3)] for i in range(3)]
    w = [white[0] / white[1], 1.0, (1.0 - white[0] - white[1]) / white[1]]
    s = [sum(inv3(p)[i][j] * w[j] for j in range(3)) for i in range(3)]
    return [[p[i][j] * s[j] for j in range(3)] for i in range(3)]


XYZ_TO_RGB709 = inv3(rgb_to_xyz(REC709_PRIMARIES, D65))


def dlog_decode(x):
    if x <= 0.14:
        return (x - 0.0929) / 6.025
    return (10.0 ** (3.89616 * x - 2.27752) - 0.0108) / 0.9892


def dlog2_decode(x):
    h, a = 475.0, 16.285770761945304
    k1, b1 = 0.059439938321493, 0.304985337243402
    k2, b2 = 2.960935245492250, 0.148314799066323
    if x >= b1:
        return h / (2.0 ** a - 1.0) * (2.0 ** (a * x) - 1.0)
    if x >= b2:
        return 2.0 ** ((x - b1) / k1 + math.log2(0.18))
    return (x - b2) / k2 + 0.028961695254132


DECODERS = {"dlog": dlog_decode, "dlog2": dlog2_decode}


def clamp01(x):
    return 0.0 if x < 0.0 else (1.0 if x > 1.0 else x)


def make_transform(profile):
    decode = DECODERS[profile]
    m = matmul(XYZ_TO_RGB709, rgb_to_xyz(PROFILES[profile]["primaries"], PROFILES[profile]["white"]))

    def transform(r, g, b):
        lin = [max(0.0, decode(v)) for v in (r, g, b)]
        out = [sum(m[i][k] * lin[k] for k in range(3)) for i in range(3)]
        return tuple(clamp01(max(0.0, x) ** (1.0 / OUTPUT_GAMMA)) for x in out)

    return transform


def main():
    for profile, cfg in PROFILES.items():
        transform = make_transform(profile)
        lines = [
            f'TITLE "{cfg["title"]}"',
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
        with open(cfg["file"], "w", encoding="ascii", newline="\n") as f:
            f.write("\n".join(lines) + "\n")
        print(f"{cfg['file']}: {len(lines) - 4} Eintraege ({SIZE}^3) geschrieben")


if __name__ == "__main__":
    main()
