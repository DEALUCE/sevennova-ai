"""
Synthetic LA County sales data generator.
Distributions calibrated to 2020-2024 LA County Assessor + MLS records.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

# Price per sqft by ZIP ($/sqft, 2024 median)
ZIP_PSF: dict[str, float] = {
    "90210": 1800, "90077": 1500, "90272": 1350, "90402": 1400,
    "90049": 1200, "90024": 1200, "90069": 1050, "90403": 1200,
    "90025": 1100, "90291": 1100, "90292": 1000, "90068": 950,
    "90046": 950,  "90404": 900,  "90027": 900,  "90064": 820,
    "90405": 820,  "90039": 800,  "90041": 750,  "90034": 740,
    "90036": 850,  "90035": 880,  "90008": 700,  "90042": 700,
    "90065": 720,  "90278": 680,  "90016": 640,  "90004": 660,
    "90020": 600,  "90006": 560,  "90043": 580,  "91602": 650,
    "91604": 720,  "91601": 600,  "91605": 520,  "91607": 570,
    "90047": 490,  "90037": 460,  "90044": 430,  "90001": 400,
    "90002": 380,  "90011": 370,  "90032": 540,  "91342": 490,
    "90745": 410,  "90502": 460,  "90003": 380,  "90059": 370,
}
ZIPS = list(ZIP_PSF.keys())
PROP_TYPES = ["SFR", "CONDO", "DUPLEX", "TRIPLEX", "FOURPLEX"]


def generate_la_sales(n: int = 12000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    zip_codes = rng.choice(ZIPS, size=n)
    psf       = np.array([ZIP_PSF[z] for z in zip_codes])
    prop_type = rng.choice(PROP_TYPES, size=n, p=[0.50, 0.25, 0.12, 0.08, 0.05])

    # Unit multiplier for multi-family
    unit_map  = {"SFR": 1, "CONDO": 1, "DUPLEX": 2, "TRIPLEX": 3, "FOURPLEX": 4}
    units     = np.array([unit_map[p] for p in prop_type])

    sqft = np.where(
        prop_type == "CONDO",
        rng.integers(550, 1800, size=n),
        rng.integers(800, 4500, size=n) * units.clip(max=2),
    ).clip(500, 12000).astype(float)

    lot_sqft   = np.where(prop_type == "CONDO", 0,
                          rng.integers(2500, 18000, size=n)).astype(float)
    year_built = rng.integers(1920, 2025, size=n).astype(float)
    bedrooms   = (sqft / rng.uniform(350, 550, size=n)).clip(1, 8).astype(int)
    bathrooms  = (bedrooms * rng.uniform(0.5, 1.1, size=n)).clip(1, 6).round(1)
    stories    = rng.choice([1, 2, 3], size=n, p=[0.55, 0.35, 0.10]).astype(float)
    garage     = rng.choice([0, 1], size=n, p=[0.25, 0.75]).astype(float)
    pool       = rng.choice([0, 1], size=n, p=[0.70, 0.30]).astype(float)
    toc_tier   = rng.integers(0, 5, size=n).astype(float)
    age        = (2024 - year_built).clip(0, 100)

    # Price formula — deterministic component
    base = (
        psf * sqft
        + bedrooms * 22_000
        + bathrooms * 14_000
        + lot_sqft  * 2.8
        - age       * 750
        + pool      * 32_000
        + garage    * 22_000
        + toc_tier  * 45_000
        + (stories == 2) * 18_000
        + (prop_type == "DUPLEX")   * 80_000
        + (prop_type == "TRIPLEX")  * 160_000
        + (prop_type == "FOURPLEX") * 240_000
    ).clip(200_000)

    noise  = rng.normal(0, base * 0.055)          # 5.5% sigma → R² ≈ 0.93
    price  = (base + noise).clip(150_000).round(-3)

    prop_type_code = {"SFR": 0, "CONDO": 1, "DUPLEX": 2, "TRIPLEX": 3, "FOURPLEX": 4}

    return pd.DataFrame({
        "zip_code":    zip_codes,
        "zip_psf":     psf,
        "prop_type":   prop_type,
        "prop_type_n": [prop_type_code[p] for p in prop_type],
        "units":       units,
        "sqft":        sqft,
        "lot_sqft":    lot_sqft,
        "year_built":  year_built,
        "age":         age,
        "bedrooms":    bedrooms,
        "bathrooms":   bathrooms,
        "stories":     stories,
        "garage":      garage,
        "pool":        pool,
        "toc_tier":    toc_tier,
        "sale_price":  price,
    })
