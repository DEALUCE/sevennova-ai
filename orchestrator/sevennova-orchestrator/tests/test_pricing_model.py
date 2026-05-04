"""
ML Pricing Model Test Suite
pytest tests/test_pricing_model.py -v
"""
from __future__ import annotations

import pytest
import numpy as np
from sklearn.metrics import r2_score

from ml.data_generator import generate_la_sales
from ml.features import PricingFeatures, build_features
from ml.pricing_model import EnsemblePricingModel


# ── FIXTURES ──────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def trained_model():
    model = EnsemblePricingModel()
    meta = model.train(n_samples=3000, seed=99)   # small dataset for CI speed
    return model, meta


@pytest.fixture(scope="module")
def sample_features():
    return PricingFeatures(
        sqft=1850, bedrooms=3, bathrooms=2.0,
        year_built=1972, zip_code="90016",
        prop_type="SFR", lot_sqft=6200,
        stories=1.0, garage=1.0, pool=0.0, toc_tier=4.0,
    )


# ── DATA GENERATOR TESTS ──────────────────────────────────────────────────

class TestDataGenerator:

    def test_generates_correct_row_count(self):
        df = generate_la_sales(n=500)
        assert len(df) == 500

    def test_prices_in_realistic_range(self):
        df = generate_la_sales(n=1000, seed=1)
        assert df["sale_price"].min() >= 150_000
        assert df["sale_price"].max() <= 20_000_000

    def test_zip_codes_are_valid_la(self):
        from ml.data_generator import ZIP_PSF
        df = generate_la_sales(n=500, seed=2)
        assert df["zip_code"].isin(ZIP_PSF.keys()).all()

    def test_no_null_values(self):
        df = generate_la_sales(n=500, seed=3)
        assert df.isnull().sum().sum() == 0

    def test_sqft_positive(self):
        df = generate_la_sales(n=500, seed=4)
        assert (df["sqft"] > 0).all()

    def test_year_built_range(self):
        df = generate_la_sales(n=1000, seed=5)
        assert df["year_built"].min() >= 1920
        assert df["year_built"].max() <= 2025

    def test_reproducible_with_seed(self):
        df1 = generate_la_sales(n=100, seed=7)
        df2 = generate_la_sales(n=100, seed=7)
        assert (df1["sale_price"].values == df2["sale_price"].values).all()


# ── FEATURE ENGINEERING TESTS ─────────────────────────────────────────────

class TestFeatureEngineering:

    def test_build_features_returns_correct_columns(self):
        from ml.features import FEATURE_COLS
        df = generate_la_sales(n=100, seed=10)
        X  = build_features(df)
        assert list(X.columns) == FEATURE_COLS

    def test_no_nulls_in_features(self):
        df = generate_la_sales(n=500, seed=11)
        X  = build_features(df)
        assert X.isnull().sum().sum() == 0

    def test_pricing_features_to_dataframe(self, sample_features):
        from ml.features import FEATURE_COLS
        df = sample_features.to_dataframe()
        assert len(df) == 1
        assert list(df.columns) == FEATURE_COLS

    def test_age_computed_correctly(self, sample_features):
        df = sample_features.to_dataframe()
        assert df["age"].iloc[0] == 2024 - sample_features.year_built

    def test_zip_psf_fallback(self):
        feats = PricingFeatures(
            sqft=1200, bedrooms=2, bathrooms=1.0,
            year_built=1990, zip_code="99999",   # unknown ZIP
            prop_type="CONDO",
        )
        df = feats.to_dataframe()
        assert df["zip_psf"].iloc[0] == 650.0   # default fallback


# ── MODEL TRAINING TESTS ──────────────────────────────────────────────────

class TestModelTraining:

    def test_r2_exceeds_target(self, trained_model):
        _, meta = trained_model
        assert meta["r2"] > 0.88, f"R² {meta['r2']:.4f} below 0.88 target"

    def test_mape_under_15_pct(self, trained_model):
        _, meta = trained_model
        assert meta["mape_pct"] < 15.0, f"MAPE {meta['mape_pct']:.2f}% too high"

    def test_mae_under_200k(self, trained_model):
        _, meta = trained_model
        assert meta["mae"] < 200_000, f"MAE ${meta['mae']:,.0f} too high"

    def test_meta_has_required_keys(self, trained_model):
        _, meta = trained_model
        for key in ["r2", "mae", "mape_pct", "n_train", "n_test"]:
            assert key in meta

    def test_all_three_models_trained(self, trained_model):
        model, _ = trained_model
        assert model.xgb_model is not None
        assert model.lgb_model is not None
        assert model.cat_model is not None

    def test_save_and_load_roundtrip(self, trained_model, tmp_path):
        import ml.pricing_model as pm
        original_dir = pm.MODEL_DIR
        pm.MODEL_DIR  = tmp_path
        pm.MODEL_PATH = tmp_path / "ensemble_pricing.pkl"
        pm.META_PATH  = tmp_path / "ensemble_meta.json"

        model, _ = trained_model
        model._save()

        model2 = EnsemblePricingModel()
        assert model2.load() is True
        assert model2.xgb_model is not None

        # Restore
        pm.MODEL_DIR  = original_dir
        pm.MODEL_PATH = original_dir / "ensemble_pricing.pkl"
        pm.META_PATH  = original_dir / "ensemble_meta.json"


# ── PREDICTION TESTS ──────────────────────────────────────────────────────

class TestPrediction:

    def test_predict_returns_prediction_object(self, trained_model, sample_features):
        from ml.pricing_model import PricingPrediction
        model, _ = trained_model
        pred = model.predict(sample_features)
        assert isinstance(pred, PricingPrediction)

    def test_ensemble_price_positive(self, trained_model, sample_features):
        model, _ = trained_model
        pred = model.predict(sample_features)
        assert pred.ensemble_price > 0

    def test_climate_price_below_ensemble(self, trained_model, sample_features):
        model, _ = trained_model
        pred = model.predict(sample_features)
        assert pred.climate_price < pred.ensemble_price

    def test_confidence_bounded(self, trained_model, sample_features):
        model, _ = trained_model
        pred = model.predict(sample_features)
        assert 0 <= pred.confidence <= 100

    def test_cap_rate_reasonable(self, trained_model, sample_features):
        model, _ = trained_model
        pred = model.predict(sample_features)
        assert 0.02 < pred.cap_rate < 0.12

    def test_price_per_unit_correct(self, trained_model):
        model, _ = trained_model
        feats = PricingFeatures(
            sqft=3200, bedrooms=4, bathrooms=3.0,
            year_built=1965, zip_code="90006",
            prop_type="FOURPLEX", lot_sqft=7500,
            units=4,
        )
        pred = model.predict(feats)
        assert abs(pred.price_per_unit - pred.ensemble_price / 4) < 1000

    def test_beverly_hills_higher_than_south_la(self, trained_model):
        model, _ = trained_model
        bh = model.predict(PricingFeatures(
            sqft=2000, bedrooms=3, bathrooms=2.0,
            year_built=1985, zip_code="90210", prop_type="SFR",
        ))
        sla = model.predict(PricingFeatures(
            sqft=2000, bedrooms=3, bathrooms=2.0,
            year_built=1985, zip_code="90001", prop_type="SFR",
        ))
        assert bh.ensemble_price > sla.ensemble_price

    def test_larger_sqft_higher_price(self, trained_model):
        model, _ = trained_model
        small = model.predict(PricingFeatures(
            sqft=900, bedrooms=2, bathrooms=1.0,
            year_built=1990, zip_code="90035", prop_type="SFR",
        ))
        large = model.predict(PricingFeatures(
            sqft=2800, bedrooms=4, bathrooms=3.0,
            year_built=1990, zip_code="90035", prop_type="SFR",
        ))
        assert large.ensemble_price > small.ensemble_price

    def test_newer_home_higher_price(self, trained_model):
        model, _ = trained_model
        old = model.predict(PricingFeatures(
            sqft=1500, bedrooms=3, bathrooms=2.0,
            year_built=1940, zip_code="90042", prop_type="SFR",
        ))
        new = model.predict(PricingFeatures(
            sqft=1500, bedrooms=3, bathrooms=2.0,
            year_built=2020, zip_code="90042", prop_type="SFR",
        ))
        assert new.ensemble_price > old.ensemble_price


# ── ENSEMBLE ACCURACY ON HOLDOUT ──────────────────────────────────────────

class TestEnsembleAccuracy:

    def test_r2_on_independent_holdout(self, trained_model):
        """Train on seed=99, test on seed=42 (independent holdout)."""
        model, _ = trained_model
        df = generate_la_sales(n=1000, seed=42)
        X  = build_features(df)
        y  = df["sale_price"].values

        xgb_p = model.xgb_model.predict(X)
        lgb_p = model.lgb_model.predict(X)
        cat_p = model.cat_model.predict(X)
        ens_p = xgb_p * 0.35 + lgb_p * 0.35 + cat_p * 0.30

        r2 = r2_score(y, ens_p)
        assert r2 > 0.88, f"Holdout R² {r2:.4f} below 0.88"

    def test_xgb_individually_above_baseline(self, trained_model):
        model, _ = trained_model
        df = generate_la_sales(n=500, seed=55)
        X  = build_features(df)
        y  = df["sale_price"].values
        r2 = r2_score(y, model.xgb_model.predict(X))
        assert r2 > 0.80

    def test_lgb_individually_above_baseline(self, trained_model):
        model, _ = trained_model
        df = generate_la_sales(n=500, seed=56)
        X  = build_features(df)
        y  = df["sale_price"].values
        r2 = r2_score(y, model.lgb_model.predict(X))
        assert r2 > 0.80

    def test_catboost_individually_above_baseline(self, trained_model):
        model, _ = trained_model
        df = generate_la_sales(n=500, seed=57)
        X  = build_features(df)
        y  = df["sale_price"].values
        r2 = r2_score(y, model.cat_model.predict(X))
        assert r2 > 0.80
