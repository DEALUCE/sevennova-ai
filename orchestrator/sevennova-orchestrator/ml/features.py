"""Feature engineering for LA County pricing model."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd

FEATURE_COLS = [
    "sqft", "lot_sqft", "year_built", "age",
    "bedrooms", "bathrooms", "stories",
    "garage", "pool", "toc_tier",
    "prop_type_n", "units", "zip_psf",
    "price_per_bed", "bath_bed_ratio", "sqft_per_unit",
]

ZIP_PSF_DEFAULT = 650.0  # fallback median


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    # Derived features
    out["age"]            = (2024 - out["year_built"]).clip(0, 100)
    out["price_per_bed"]  = (out["sqft"] / out["bedrooms"].clip(1)).round(1)
    out["bath_bed_ratio"] = (out["bathrooms"] / out["bedrooms"].clip(1)).round(2)
    out["sqft_per_unit"]  = (out["sqft"] / out["units"].clip(1)).round(1)

    return out[FEATURE_COLS]


@dataclass
class PricingFeatures:
    """Input to the pricing model from the orchestrator."""
    sqft:        float
    bedrooms:    int
    bathrooms:   float
    year_built:  int
    zip_code:    str
    prop_type:   str          # SFR / CONDO / DUPLEX / TRIPLEX / FOURPLEX
    lot_sqft:    float = 5000.0
    stories:     float = 1.0
    garage:      float = 1.0
    pool:        float = 0.0
    toc_tier:    float = 0.0
    units:       int   = 1

    # Resolved externally (assessor)
    zip_psf: Optional[float] = None

    def to_dataframe(self) -> pd.DataFrame:
        from ml.data_generator import ZIP_PSF
        psf = self.zip_psf or ZIP_PSF.get(self.zip_code, ZIP_PSF_DEFAULT)
        prop_map = {"SFR": 0, "CONDO": 1, "DUPLEX": 2, "TRIPLEX": 3, "FOURPLEX": 4}
        row = {
            "sqft":       self.sqft,
            "lot_sqft":   self.lot_sqft,
            "year_built": float(self.year_built),
            "age":        float(max(0, 2024 - self.year_built)),
            "bedrooms":   float(self.bedrooms),
            "bathrooms":  float(self.bathrooms),
            "stories":    self.stories,
            "garage":     self.garage,
            "pool":       self.pool,
            "toc_tier":   self.toc_tier,
            "prop_type_n": float(prop_map.get(self.prop_type, 0)),
            "units":       float(self.units),
            "zip_psf":     float(psf),
            "price_per_bed":  self.sqft / max(self.bedrooms, 1),
            "bath_bed_ratio": self.bathrooms / max(self.bedrooms, 1),
            "sqft_per_unit":  self.sqft / max(self.units, 1),
        }
        return pd.DataFrame([row])
