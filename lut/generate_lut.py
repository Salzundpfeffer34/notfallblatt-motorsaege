#!/usr/bin/env python3
"""Erzeugt cinematic-outdoor-33.cube (33^3 3D-LUT) fuer DaVinci Resolve. Aufruf: python3 generate_lut.py"""

SIZE = 33
OUT_FILE = "cinematic-outdoor-33.cube"
TITLE = "Cinematic Outdoor 33"

SHOULDER_START = 0.82
SHOULDER_PEAK = 0.985
BLACK_LIFT = 0.012
CONTRAST = 0.30
SATURATION = 0.90
WARM_HIGHLIGHTS = (0.020, 0.004, -0.016)
COOL_SHADOWS = (-0.012, -0.004, 0.026)


def clamp01(x):
    return 0.0 if x < 0.0 else (1.0 if x > 1.0 else x)


def smoothstep(x):
    return x * x * (3.0 - 2.0 * x)


def shoulder(x):
    if x <= SHOULDER_START:
        return x
    k = (x - SHOULDER_START) / (1.0 - SHOULDER_START)
    return SHOULDER_START + smoothstep(k) * (SHOULDER_PEAK - SHOULDER_START)


def s_curve(x):
    return x * (1.0 - CONTRAST) + smoothstep(x) * CONTRAST


def transform(r, g, b):
    r, g, b = shoulder(r), shoulder(g), shoulder(b)
    r = r + BLACK_LIFT * (1.0 - r)
    g = g + BLACK_LIFT * (1.0 - g)
    b = b + BLACK_LIFT * (1.0 - b)
    r, g, b = s_curve(r), s_curve(g), s_curve(b)
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    r = luma + (r - luma) * SATURATION
    g = luma + (g - luma) * SATURATION
    b = luma + (b - luma) * SATURATION
    hi, lo = luma, 1.0 - luma
    r += WARM_HIGHLIGHTS[0] * hi + COOL_SHADOWS[0] * lo
    g += WARM_HIGHLIGHTS[1] * hi + COOL_SHADOWS[1] * lo
    b += WARM_HIGHLIGHTS[2] * hi + COOL_SHADOWS[2] * lo
    return clamp01(r), clamp01(g), clamp01(b)


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
