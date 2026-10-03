"""
CarbonIQ — Machine Learning & Explainable AI (SHAP) Engine
Loads the trained XGBoost model, performs emission corrections,
generates Tree SHAP explanations, and runs What-If decarbonization simulations.
"""

import os
import json
import numpy as np
import xgboost as xgb
from typing import Dict, Any, List
from calculator import calculate_item_emission, process_calculations
from train_model import (
    MODEL_FILE,
    METADATA_FILE,
    FEATURE_NAMES,
    ACTIVITY_MAP,
    REGION_MAP,
    SEASON_MAP,
    train_correction_model
)

_MODEL_INSTANCE: xgb.Booster = None
_METADATA_CACHE: dict = {}

def get_model() -> xgb.Booster:
    """
    Singleton accessor for the loaded XGBoost model.
    Trains automatically if artifact is absent.
    """
    global _MODEL_INSTANCE, _METADATA_CACHE
    if _MODEL_INSTANCE is None:
        if not os.path.exists(MODEL_FILE):
            print("Model artifact not found. Training initial XGBoost model...")
            train_correction_model()
        bst = xgb.Booster()
        bst.load_model(MODEL_FILE)
        _MODEL_INSTANCE = bst

        if os.path.exists(METADATA_FILE):
            with open(METADATA_FILE, "r") as f:
                _METADATA_CACHE = json.load(f)
        else:
            _METADATA_CACHE = {"modelVersion": "1.0.0", "status": "Ready"}
    return _MODEL_INSTANCE

def get_model_metadata() -> dict:
    global _METADATA_CACHE
    if not _METADATA_CACHE:
        get_model()
    return _METADATA_CACHE

def prepare_feature_row(entry: Dict[str, Any], baseline_kg: float, season: str = "spring") -> List[float]:
    act = str(entry.get("activityType", "diesel")).lower().strip()
    if act in ["road freight", "road_freight", "freight"]:
        act = "road_freight"
    elif act in ["cotton", "raw_material"]:
        act = "cotton"

    act_code = float(ACTIVITY_MAP.get(act, 0))
    region = str(entry.get("region", "IN")).upper().strip()
    reg_code = float(REGION_MAP.get(region, 4)) # default GLOBAL
    season_code = float(SEASON_MAP.get(str(season).lower(), 1)) # default spring
    age = float(entry.get("equipmentAgeYears", 5.0) or 5.0)
    qty = float(entry.get("quantity", 0.0) or 0.0)
    cargo = float(entry.get("cargoWeightTons", 0.0) or 0.0)

    return [
        baseline_kg,
        act_code,
        reg_code,
        season_code,
        age,
        qty,
        cargo
    ]

def predict_corrected(entries: List[Dict[str, Any]], season: str = "spring", model_version: str = "1.0.0") -> Dict[str, Any]:
    """
    Computes baseline calculations and applies XGBoost operational correction.
    Guarantees auditable baseline preservation and non-negative emissions.
    """
    if not entries:
        return {
            "baselineTotalKg": 0.0,
            "correctedTotalKg": 0.0,
            "adjustmentKg": 0.0,
            "adjustmentPct": 0.0,
            "modelVersion": model_version,
            "predictionStatus": "Empty entries",
            "items": []
        }

    bst = get_model()
    rows = []
    base_calcs = []

    for e in entries:
        calc = calculate_item_emission(e)
        base_calcs.append(calc)
        row = prepare_feature_row(e, calc["baselineKg"], season)
        rows.append(row)

    X = np.array(rows, dtype=np.float32)
    dmat = xgb.DMatrix(X, feature_names=FEATURE_NAMES)
    preds = bst.predict(dmat)

    items = []
    tot_baseline = 0.0
    tot_corrected = 0.0

    for i, calc in enumerate(base_calcs):
        b_kg = calc["baselineKg"]
        raw_pred = float(preds[i])

        # Enforce physical constraints: never negative, bounded between [0.75 * b_kg, 1.50 * b_kg]
        if b_kg > 0:
            pred_kg = max(0.01, min(b_kg * 1.50, max(b_kg * 0.75, raw_pred)))
            adj_kg = pred_kg - b_kg
            adj_pct = (adj_kg / b_kg) * 100.0
        else:
            pred_kg = 0.0
            adj_kg = 0.0
            adj_pct = 0.0

        tot_baseline += b_kg
        tot_corrected += pred_kg

        item_res = dict(calc)
        item_res.update({
            "correctedKg": round(pred_kg, 2),
            "adjustmentKg": round(adj_kg, 2),
            "adjustmentPct": round(adj_pct, 2)
        })
        items.append(item_res)

    net_adj = tot_corrected - tot_baseline
    net_pct = (net_adj / tot_baseline * 100.0) if tot_baseline > 0 else 0.0

    return {
        "baselineTotalKg": round(tot_baseline, 2),
        "correctedTotalKg": round(tot_corrected, 2),
        "adjustmentKg": round(net_adj, 2),
        "adjustmentPct": round(net_pct, 2),
        "modelVersion": get_model_metadata().get("modelVersion", "1.0.0"),
        "predictionStatus": "ML Prediction Complete",
        "items": items
    }

FEATURE_EXPLANATIONS = {
    "equipmentAgeYears": "Older machinery and equipment wear increases combustion loss and thermodynamic inefficiency.",
    "regionCode": "Regional grid carbon intensity elevates electricity emissions in thermal-dominated regions.",
    "seasonCode": "Seasonal ambient temperatures influence process heating, HVAC, and cooling loads.",
    "baselineKg": "Underlying activity volume and standard GHG factor set the baseline calculation scale.",
    "quantity": "Operational consumption throughput directly scales baseline energy transformation.",
    "cargoWeightTons": "Heavy freight payload tonnage increases rolling resistance and diesel fuel demand.",
    "activityCode": "Primary fuel / material category defines the baseline carbon stoichiometry."
}

FEATURE_LABELS = {
    "equipmentAgeYears": "Equipment Age",
    "regionCode": "Regional Grid Factor",
    "seasonCode": "Seasonal Demand",
    "baselineKg": "Baseline Activity Scale",
    "quantity": "Operational Quantity",
    "cargoWeightTons": "Freight Payload Weight",
    "activityCode": "Activity Category"
}

def explain_predictions(entries: List[Dict[str, Any]], season: str = "spring") -> Dict[str, Any]:
    """
    Computes exact Tree SHAP feature contributions using the XGBoost native tree engine.
    Ranks drivers by magnitude, converts to percentages, and attaches plain-language insights.
    """
    if not entries:
        return {"topFactors": [], "status": "No entries provided"}

    bst = get_model()
    rows = []
    for e in entries:
        calc = calculate_item_emission(e)
        rows.append(prepare_feature_row(e, calc["baselineKg"], season))

    X = np.array(rows, dtype=np.float32)
    dmat = xgb.DMatrix(X, feature_names=FEATURE_NAMES)

    # Native Tree SHAP contributions (shape: N, len(FEATURE_NAMES) + 1 [bias])
    shap_vals = bst.predict(dmat, pred_contribs=True)
    # Average across entries
    feature_contribs = np.mean(shap_vals[:, :-1], axis=0) # excluding bias term

    abs_contribs = np.abs(feature_contribs)
    total_abs = np.sum(abs_contribs) or 1.0

    ranked_indices = np.argsort(-abs_contribs)

    top_factors = []
    for rank, idx in enumerate(ranked_indices, start=1):
        feat = FEATURE_NAMES[idx]
        val = float(feature_contribs[idx])
        abs_pct = float((abs_contribs[idx] / total_abs) * 100.0)
        direction = "positive" if val >= 0 else "negative"

        top_factors.append({
            "feature": feat,
            "label": FEATURE_LABELS.get(feat, feat),
            "contribution": round(val, 2),
            "contributionPct": round(abs_pct, 1),
            "direction": direction,
            "plainLanguage": FEATURE_EXPLANATIONS.get(feat, "Operational parameter affecting emissions model."),
            "rank": rank
        })

    return {
        "topFactors": top_factors,
        "explainerType": "XGBoost Tree SHAP Explainer",
        "status": "Success"
    }

def run_whatif(entries: List[Dict[str, Any]], adjustments: Dict[str, float]) -> Dict[str, Any]:
    """
    Scales activity quantities by percentage adjustments:
    e.g. {'road_freight': -0.30, 'diesel': -0.15, 'electricity': -0.20, 'cotton': -0.10}
    Recalculates baseline and ML corrected footprint, returning savings and reduction %.
    """
    scaled_entries = []
    for e in entries:
        e_copy = dict(e)
        act = str(e.get("activityType", "")).lower()
        if act in ["road freight", "road_freight", "freight"]:
            act_key = "road_freight"
        elif act in ["cotton", "raw_material"]:
            act_key = "cotton"
        else:
            act_key = act

        pct_change = float(adjustments.get(act_key, 0.0))
        # Clamp multiplier to non-negative
        multiplier = max(0.0, 1.0 + pct_change)
        orig_qty = float(e.get("quantity", 0.0) or 0.0)
        e_copy["quantity"] = orig_qty * multiplier
        scaled_entries.append(e_copy)

    # Current state
    current_calc = predict_corrected(entries)
    curr_baseline = current_calc["baselineTotalKg"]
    curr_corrected = current_calc["correctedTotalKg"]

    # Scenario state
    scenario_calc = predict_corrected(scaled_entries)
    scen_baseline = scenario_calc["baselineTotalKg"]
    scen_corrected = scenario_calc["correctedTotalKg"]

    savings_kg = max(0.0, curr_corrected - scen_corrected)
    reduction_pct = (savings_kg / curr_corrected * 100.0) if curr_corrected > 0 else 0.0

    return {
        "currentBaselineTotalKg": curr_baseline,
        "currentCorrectedTotalKg": curr_corrected,
        "projectedBaselineTotalKg": scen_baseline,
        "projectedTotalKg": scen_corrected,
        "savingsKg": round(savings_kg, 2),
        "savingsTonnes": round(savings_kg / 1000.0, 3),
        "reductionPct": round(reduction_pct, 2),
        "appliedAdjustments": adjustments,
        "scenarioItemsCount": len(scaled_entries)
    }
