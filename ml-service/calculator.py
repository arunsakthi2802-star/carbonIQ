"""
CarbonIQ — Baseline Calculation Engine & Factor Resolver
Calculates auditable baseline emissions across Scope 1, Scope 2, and Scope 3.
"""

from typing import Dict, Any, List, Tuple
import os
import requests

# Standard GHG Protocol Emission Factors (configurable defaults)
DEFAULT_EMISSION_FACTORS: Dict[str, Dict[str, Any]] = {
    "electricity": {
        "factor": 0.82,
        "unit": "kg CO2e/kWh",
        "scope": 2,
        "name": "Grid Electricity (India Average)",
        "source": "CEA CO2 Baseline Database / GHG Protocol"
    },
    "diesel": {
        "factor": 2.68,
        "unit": "kg CO2e/litre",
        "scope": 1,
        "name": "Diesel Stationary & Fleet Combustion",
        "source": "DEFRA / IPCC Guidelines"
    },
    "road_freight": {
        "factor": 0.14,
        "unit": "kg CO2e/ton-km",
        "scope": 3,
        "name": "Heavy Commercial Road Freight Logistics",
        "source": "GLEC Framework / GHG Protocol Scope 3"
    },
    "cotton": {
        "factor": 5.90,
        "unit": "kg CO2e/kg",
        "scope": 3,
        "name": "Raw Cotton Cultivation & Processing",
        "source": "World Apparel & Footprint Life Cycle Database"
    }
}

CLIMATIQ_API_KEY = os.environ.get("CLIMATIQ_API_KEY", "")

def lookup_climatiq_factor(activity_type: str, region: str = "IN") -> Tuple[float, str]:
    """
    Optional external Climatiq API integration.
    Falls back gracefully to local standard factors if API key is not provided or request fails.
    """
    if not CLIMATIQ_API_KEY:
        default = DEFAULT_EMISSION_FACTORS.get(activity_type, {"factor": 1.0, "source": "Local Standard Factor"})
        return default["factor"], "Local Standard Factor"
    
    try:
        url = "https://api.climatiq.io/data/v1/estimate"
        headers = {"Authorization": f"Bearer {CLIMATIQ_API_KEY}"}
        # In case of live Climatiq key, invoke REST; on timeout/failure, return local fallback
        resp = requests.post(url, headers=headers, json={"query": activity_type, "region": region}, timeout=3)
        if resp.status_code == 200:
            data = resp.json()
            return float(data.get("co2e", DEFAULT_EMISSION_FACTORS[activity_type]["factor"])), "Climatiq Verified Live API"
    except Exception:
        pass
    
    default = DEFAULT_EMISSION_FACTORS.get(activity_type, {"factor": 1.0, "source": "Local Standard Factor"})
    return default["factor"], "Local Standard Factor (Fallback)"

def calculate_item_emission(entry: Dict[str, Any], custom_factors: Dict[str, float] = None) -> Dict[str, Any]:
    """
    Computes baseline emission for a single activity entry.
    Formulas:
      - Electricity: quantity * factor
      - Diesel: quantity * factor
      - Road Freight: distanceKm * cargoWeightTons * factor
      - Cotton / Raw Material: quantity * factor
    """
    activity = str(entry.get("activityType", "")).lower().strip()
    # Normalize aliases
    if activity in ["road freight", "road_freight", "freight", "transport"]:
        activity = "road_freight"
    elif activity in ["cotton", "raw_material", "material"]:
        activity = "cotton"

    quantity = float(entry.get("quantity", 0.0))
    region = str(entry.get("region", "IN"))
    
    factor_meta = DEFAULT_EMISSION_FACTORS.get(activity, {
        "factor": 1.0,
        "unit": "kg CO2e/unit",
        "scope": 3,
        "name": "General Activity",
        "source": "Local Standard Factor"
    })
    
    factor = factor_meta["factor"]
    source = factor_meta["source"]
    scope = factor_meta["scope"]

    # Check for custom user-configured factors
    if custom_factors and activity in custom_factors:
        factor = float(custom_factors[activity])
        source = "Organization Configured Factor"

    if activity == "road_freight":
        distance_km = quantity
        cargo_weight = float(entry.get("cargoWeightTons", 1.0) or 1.0)
        baseline_kg = distance_km * cargo_weight * factor
        formula_str = f"{distance_km:.1f} km × {cargo_weight:.1f} tons × {factor} kg CO2e/ton-km"
    else:
        baseline_kg = quantity * factor
        formula_str = f"{quantity:.1f} {entry.get('unit', '')} × {factor} {factor_meta.get('unit', '')}"

    return {
        "activityType": activity,
        "quantity": quantity,
        "unit": entry.get("unit", factor_meta.get("unit")),
        "scope": scope,
        "emissionFactor": factor,
        "factorSource": source,
        "baselineKg": round(baseline_kg, 3),
        "formula": formula_str
    }

def process_calculations(entries: List[Dict[str, Any]], custom_factors: Dict[str, float] = None) -> Dict[str, Any]:
    """
    Aggregates a batch of activity records into Scope 1, Scope 2, Scope 3, and category breakdowns.
    """
    items = []
    scope1_kg = 0.0
    scope2_kg = 0.0
    scope3_kg = 0.0
    by_activity: Dict[str, float] = {}

    for entry in entries:
        calc = calculate_item_emission(entry, custom_factors)
        items.append(calc)
        b_kg = calc["baselineKg"]
        s = calc["scope"]
        act = calc["activityType"]

        if s == 1:
            scope1_kg += b_kg
        elif s == 2:
            scope2_kg += b_kg
        else:
            scope3_kg += b_kg

        by_activity[act] = by_activity.get(act, 0.0) + b_kg

    total_kg = scope1_kg + scope2_kg + scope3_kg

    # Percentage breakdown
    breakdown = {}
    for act, val in by_activity.items():
        pct = (val / total_kg * 100.0) if total_kg > 0 else 0.0
        breakdown[act] = round(pct, 2)

    return {
        "items": items,
        "scope1Kg": round(scope1_kg, 2),
        "scope2Kg": round(scope2_kg, 2),
        "scope3Kg": round(scope3_kg, 2),
        "baselineTotalKg": round(total_kg, 2),
        "totalKg": round(total_kg, 2),
        "breakdown": breakdown,
        "count": len(entries)
    }
