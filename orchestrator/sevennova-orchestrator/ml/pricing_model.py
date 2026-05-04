"""
SevenNova — Ensemble Pricing Model
XGBoost + LightGBM + CatBoost stacked ensemble for LA County AVM.
Target: R² > 0.88 on held-out test set.
"""
from __future__ import annotations

import json
import os
import pickle
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_absolute_percentage_error

import xgboost as xgb
import lightgbm as lgb
from catboost import CatBoostRegressor

from ml.features import PricingFeatures, build_features, FEATURE_COLS

MODEL_DIR  = Path(__file__).parent / "saved_models"
MODEL_PATH = MODEL_DIR / "ensemble_pricing.pkl"
META_PATH  = MODEL_DIR / "ensemble_meta.json"

CLIMATE_DISCOUNT_RATE = 0.032   # 3.2% discount for LA climate risk (FEMA 2024)
CAP_RATE_BY_TYPE = {
    "SFR": 0.042, "CONDO": 0.045,
    "DUPLEX": 0.052, "TRIPLEX": 0.055, "FOURPLEX": 0.058,
}


@dataclass
class PricingPrediction:
    xgb_price:      float
    lgb_price:      float
    cat_price:      float
    ensemble_price: float
    climate_price:  float
    cap_rate:       float
    price_per_unit: float
    confidence:     float   # 0-100
    r2_train:       float
    mae:            float
    mape_pct:       float


class EnsemblePricingModel:
    """
    Stacked XGBoost + LightGBM + CatBoost ensemble.

    Usage:
        model = EnsemblePricingModel()
        model.train()                        # or model.load()
        pred = model.predict(features)
    """

    def __init__(self):
        self.xgb_model: Optional[xgb.XGBRegressor]     = None
        self.lgb_model: Optional[lgb.LGBMRegressor]    = None
        self.cat_model: Optional[CatBoostRegressor]     = None
        self.meta: dict = {}

    # ── TRAINING ──────────────────────────────────────────────────────────

    def train(self, n_samples: int = 12000, test_size: float = 0.15,
              seed: int = 42) -> dict:
        from ml.data_generator import generate_la_sales

        df   = generate_la_sales(n=n_samples, seed=seed)
        X    = build_features(df)
        y    = df["sale_price"].values

        X_tr, X_te, y_tr, y_te = train_test_split(
            X, y, test_size=test_size, random_state=seed
        )

        # XGBoost
        self.xgb_model = xgb.XGBRegressor(
            n_estimators=600, learning_rate=0.04, max_depth=7,
            subsample=0.8, colsample_bytree=0.8, min_child_weight=3,
            reg_alpha=0.1, reg_lambda=1.5,
            random_state=seed, n_jobs=-1, verbosity=0,
        )
        self.xgb_model.fit(X_tr, y_tr,
                           eval_set=[(X_te, y_te)],
                           verbose=False)

        # LightGBM
        self.lgb_model = lgb.LGBMRegressor(
            n_estimators=600, learning_rate=0.04, num_leaves=63,
            subsample=0.8, colsample_bytree=0.8, min_child_samples=20,
            reg_alpha=0.1, reg_lambda=1.5,
            random_state=seed, n_jobs=-1, verbosity=-1,
        )
        self.lgb_model.fit(X_tr, y_tr,
                           eval_set=[(X_te, y_te)],
                           callbacks=[lgb.early_stopping(50, verbose=False),
                                      lgb.log_evaluation(-1)])

        # CatBoost
        self.cat_model = CatBoostRegressor(
            iterations=600, learning_rate=0.04, depth=7,
            l2_leaf_reg=3, subsample=0.8,
            random_seed=seed, verbose=0,
        )
        self.cat_model.fit(X_tr, y_tr,
                           eval_set=(X_te, y_te),
                           early_stopping_rounds=50,
                           verbose=False)

        # Ensemble on test set
        xgb_p = self.xgb_model.predict(X_te)
        lgb_p = self.lgb_model.predict(X_te)
        cat_p = self.cat_model.predict(X_te)
        ens_p = (xgb_p * 0.35 + lgb_p * 0.35 + cat_p * 0.30)

        r2   = float(r2_score(y_te, ens_p))
        mae  = float(mean_absolute_error(y_te, ens_p))
        mape = float(mean_absolute_percentage_error(y_te, ens_p) * 100)

        self.meta = {
            "r2": r2, "mae": mae, "mape_pct": mape,
            "n_train": len(X_tr), "n_test": len(X_te),
            "feature_cols": FEATURE_COLS,
        }

        self._save()
        return self.meta

    # ── PERSISTENCE ───────────────────────────────────────────────────────

    def _save(self):
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump({
                "xgb": self.xgb_model,
                "lgb": self.lgb_model,
                "cat": self.cat_model,
            }, f)
        with open(META_PATH, "w") as f:
            json.dump(self.meta, f, indent=2)

    def load(self) -> bool:
        if not MODEL_PATH.exists():
            return False
        with open(MODEL_PATH, "rb") as f:
            bundle = pickle.load(f)
        self.xgb_model = bundle["xgb"]
        self.lgb_model = bundle["lgb"]
        self.cat_model = bundle["cat"]
        if META_PATH.exists():
            with open(META_PATH) as f:
                self.meta = json.load(f)
        return True

    def load_or_train(self) -> dict:
        if not self.load():
            return self.train()
        return self.meta

    # ── PREDICTION ────────────────────────────────────────────────────────

    def predict(self, features: PricingFeatures) -> PricingPrediction:
        if self.xgb_model is None:
            self.load_or_train()

        X = features.to_dataframe()

        xgb_p = float(self.xgb_model.predict(X)[0])
        lgb_p = float(self.lgb_model.predict(X)[0])
        cat_p = float(self.cat_model.predict(X)[0])
        ens_p = round(xgb_p * 0.35 + lgb_p * 0.35 + cat_p * 0.30, -3)

        climate_p  = round(ens_p * (1 - CLIMATE_DISCOUNT_RATE), -3)
        cap        = CAP_RATE_BY_TYPE.get(features.prop_type, 0.048)
        ppu        = round(ens_p / max(features.units, 1), -3)

        # Confidence: tighter spread = higher confidence
        spread_pct = abs(max(xgb_p, lgb_p, cat_p) - min(xgb_p, lgb_p, cat_p)) / ens_p
        conf       = round(max(55.0, min(92.0, 90 - spread_pct * 200)), 1)

        r2   = self.meta.get("r2", 0.0)
        mae  = self.meta.get("mae", 0.0)
        mape = self.meta.get("mape_pct", 0.0)

        return PricingPrediction(
            xgb_price=round(xgb_p, -3),
            lgb_price=round(lgb_p, -3),
            cat_price=round(cat_p, -3),
            ensemble_price=ens_p,
            climate_price=climate_p,
            cap_rate=cap,
            price_per_unit=ppu,
            confidence=conf,
            r2_train=r2,
            mae=mae,
            mape_pct=mape,
        )
