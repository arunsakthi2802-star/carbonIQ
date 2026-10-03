"""
Unit Tests for Baseline Emissions Accounting Engine
Validates deterministic calculations specified in Section 64 of project requirements.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from calculator import calculate_item_emission, process_calculations

def test_electricity_baseline():
    # Electricity: 1000 kWh * 0.82 = 820 kg CO2e (Scope 2)
    entry = {"activityType": "electricity", "quantity": 1000, "unit": "kWh"}
    res = calculate_item_emission(entry)
    assert res["scope"] == 2
    assert abs(res["baselineKg"] - 820.0) < 1e-3, f"Expected 820.0, got {res['baselineKg']}"
    print("PASS: test_electricity_baseline (1000 kWh -> 820 kg CO2e Scope 2)")

def test_diesel_baseline():
    # Diesel: 500 L * 2.68 = 1340 kg CO2e (Scope 1)
    entry = {"activityType": "diesel", "quantity": 500, "unit": "litre"}
    res = calculate_item_emission(entry)
    assert res["scope"] == 1
    assert abs(res["baselineKg"] - 1340.0) < 1e-3, f"Expected 1340.0, got {res['baselineKg']}"
    print("PASS: test_diesel_baseline (500 L -> 1340 kg CO2e Scope 1)")

def test_road_freight_baseline():
    # Road freight: 200 km * 10 tons * 0.14 = 280 kg CO2e (Scope 3)
    entry = {"activityType": "road_freight", "quantity": 200, "cargoWeightTons": 10.0, "unit": "km"}
    res = calculate_item_emission(entry)
    assert res["scope"] == 3
    assert abs(res["baselineKg"] - 280.0) < 1e-3, f"Expected 280.0, got {res['baselineKg']}"
    print("PASS: test_road_freight_baseline (200 km * 10 tons -> 280 kg CO2e Scope 3)")

def test_cotton_baseline():
    # Cotton: 50 kg * 5.90 = 295 kg CO2e (Scope 3)
    entry = {"activityType": "cotton", "quantity": 50, "unit": "kg"}
    res = calculate_item_emission(entry)
    assert res["scope"] == 3
    assert abs(res["baselineKg"] - 295.0) < 1e-3, f"Expected 295.0, got {res['baselineKg']}"
    print("PASS: test_cotton_baseline (50 kg -> 295 kg CO2e Scope 3)")

def test_batch_process():
    entries = [
        {"activityType": "electricity", "quantity": 1000, "unit": "kWh"},
        {"activityType": "diesel", "quantity": 500, "unit": "litre"},
        {"activityType": "road_freight", "quantity": 200, "cargoWeightTons": 10.0, "unit": "km"},
        {"activityType": "cotton", "quantity": 50, "unit": "kg"}
    ]
    res = process_calculations(entries)
    expected_total = 820.0 + 1340.0 + 280.0 + 295.0 # 2735.0
    assert abs(res["totalKg"] - expected_total) < 1e-2
    assert res["scope1Kg"] == 1340.0
    assert res["scope2Kg"] == 820.0
    assert res["scope3Kg"] == 575.0 # 280 + 295
    print("PASS: test_batch_process (Total: 2735.0 kg CO2e across Scopes 1, 2, 3)")

if __name__ == "__main__":
    test_electricity_baseline()
    test_diesel_baseline()
    test_road_freight_baseline()
    test_cotton_baseline()
    test_batch_process()
    print("\nALL DETERMINISTIC BASELINE CALCULATION TESTS PASSED!")
