"""
Unit Tests for Machine Learning & Explainable AI (SHAP) Engine
Validates model prediction bounds, Tree SHAP feature ranking, and What-If scaling logic.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml_engine import predict_corrected, explain_predictions, run_whatif, get_model_metadata

def test_model_metadata():
    meta = get_model_metadata()
    assert meta["status"] == "Production Ready" or meta["status"] == "Ready"
    assert "r2" in meta
    print(f"PASS: test_model_metadata (Model: {meta['modelName']}, R2: {meta['r2']})")

def test_prediction_invariants():
    entries = [
        {"activityType": "diesel", "quantity": 1500, "unit": "litre", "region": "IN", "equipmentAgeYears": 12},
        {"activityType": "electricity", "quantity": 25000, "unit": "kWh", "region": "IN", "equipmentAgeYears": 5}
    ]
    res = predict_corrected(entries, season="winter")
    assert res["baselineTotalKg"] > 0
    assert res["correctedTotalKg"] > 0
    assert res["correctedTotalKg"] >= res["baselineTotalKg"] * 0.75
    assert res["correctedTotalKg"] <= res["baselineTotalKg"] * 1.50
    print(f"PASS: test_prediction_invariants (Baseline: {res['baselineTotalKg']} kg, Corrected: {res['correctedTotalKg']} kg, Adj: {res['adjustmentPct']}%)")

def test_shap_explanation():
    entries = [
        {"activityType": "diesel", "quantity": 1500, "unit": "litre", "region": "IN", "equipmentAgeYears": 14}
    ]
    res = explain_predictions(entries, season="winter")
    assert res["status"] == "Success"
    assert len(res["topFactors"]) > 0
    top = res["topFactors"][0]
    assert "feature" in top
    assert "contributionPct" in top
    assert "direction" in top
    assert "plainLanguage" in top
    print(f"PASS: test_shap_explanation (Top SHAP driver: {top['label']} [{top['direction']}] {top['contributionPct']}%)")

def test_whatif_scaling():
    # Test Section 68: road_freight = -30%, diesel = -15%
    entries = [
        {"activityType": "road_freight", "quantity": 1000, "cargoWeightTons": 15.0, "unit": "km"},
        {"activityType": "diesel", "quantity": 2000, "unit": "litre", "equipmentAgeYears": 6}
    ]
    adjustments = {"road_freight": -0.30, "diesel": -0.15}
    res = run_whatif(entries, adjustments)
    assert res["savingsKg"] > 0, "Expected positive savings from reduction"
    assert res["reductionPct"] > 0, "Expected positive reduction percentage"
    assert res["projectedTotalKg"] < res["currentCorrectedTotalKg"]
    print(f"PASS: test_whatif_scaling (Current: {res['currentCorrectedTotalKg']} kg -> Projected: {res['projectedTotalKg']} kg, Saved: {res['savingsTonnes']} t CO2e, -{res['reductionPct']}%)")

if __name__ == "__main__":
    test_model_metadata()
    test_prediction_invariants()
    test_shap_explanation()
    test_whatif_scaling()
    print("\nALL MACHINE LEARNING & SHAP ENGINE TESTS PASSED!")
