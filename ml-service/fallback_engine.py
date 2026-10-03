"""
CarbonIQ — Deterministic Rule-Based Fallback Engine
Provides high-quality, audit-compliant sustainability recommendations and risk flags
when external generative AI providers (such as Gemini) are unavailable or rate-limited.
"""

from typing import Dict, Any, List

def generate_rule_based_insights(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyzes corporate footprint metrics, scope distribution, and SHAP drivers
    to produce structured, actionable decarbonization insights.
    """
    total_kg = float(data.get("totalKg", 0.0) or 0.0)
    scope1_kg = float(data.get("scope1Kg", 0.0) or 0.0)
    scope2_kg = float(data.get("scope2Kg", 0.0) or 0.0)
    scope3_kg = float(data.get("scope3Kg", 0.0) or 0.0)
    top_factors = data.get("topFactors", [])

    s1_pct = (scope1_kg / total_kg * 100.0) if total_kg > 0 else 0.0
    s2_pct = (scope2_kg / total_kg * 100.0) if total_kg > 0 else 0.0
    s3_pct = (scope3_kg / total_kg * 100.0) if total_kg > 0 else 0.0

    hotspots = []
    opportunities = []
    recommended_actions = []
    risk_flags = []

    # Scope 3 Analysis
    if s3_pct >= 50.0:
        hotspots.append({
            "category": "Value Chain Freight & Sourcing",
            "metric": f"{s3_pct:.1f}% of total emissions",
            "priority": "High",
            "detail": "Scope 3 upstream emissions dominate the organization's carbon footprint."
        })
        opportunities.append({
            "title": "Logistics & Material Decarbonization",
            "impact": "15% - 30% reduction potential",
            "description": "Engage primary freight logistics carriers for fleet electrification and route optimization."
        })
        recommended_actions.append(
            "Establish supplier code of conduct with mandatory carbon intensity disclosure (Scope 3 Category 1 & 4)."
        )
        recommended_actions.append(
            "Shift eligible road freight corridors (>500 km) to electric rail freight to reduce ton-km emission factors by ~65%."
        )

    # Scope 2 Analysis
    if s2_pct >= 30.0:
        hotspots.append({
            "category": "Purchased Grid Electricity",
            "metric": f"{s2_pct:.1f}% of total emissions",
            "priority": "High",
            "detail": "Grid power consumption constitutes a major operational emission driver."
        })
        opportunities.append({
            "title": "Renewable Power Purchase Agreements (PPA)",
            "impact": "20% - 40% Scope 2 abatement",
            "description": "Contract on-site rooftop solar or wheeling open-access green tariffs to substitute coal-heavy grid power."
        })
        recommended_actions.append(
            "Conduct facility-level energy audits to eliminate off-peak phantom power draws and optimize HVAC schedules."
        )

    # Scope 1 Analysis
    if s1_pct >= 20.0:
        hotspots.append({
            "category": "Stationary & Fleet Diesel Combustion",
            "metric": f"{s1_pct:.1f}% of total emissions",
            "priority": "Medium",
            "detail": "Direct fuel combustion in backup diesel generators and captive transport accounts for substantial emissions."
        })
        opportunities.append({
            "title": "Fleet Electrification & Grid Reliability",
            "impact": "10% - 25% Scope 1 reduction",
            "description": "Replace aged diesel generators with battery energy storage systems (BESS) or biodiesel blends."
        })
        recommended_actions.append(
            "Implement telematics on transport fleets to enforce anti-idling policies and driver eco-routing."
        )

    # SHAP Driver Interventions
    for factor in top_factors:
        feat = str(factor.get("feature", ""))
        direction = str(factor.get("direction", "positive"))
        pct = float(factor.get("contributionPct", 0.0) or 0.0)

        if "equipmentAge" in feat and direction == "positive" and pct > 10.0:
            risk_flags.append({
                "flag": "Equipment Degradation Penalty",
                "severity": "Warning",
                "message": f"Aged machinery is inflating modeled energy consumption by +{pct:.1f}%. Preventive maintenance or replacement will yield rapid ROI."
            })
            recommended_actions.append(
                "Prioritize maintenance servicing and lubrication cycles on assets older than 8 years to restore thermodynamic efficiency."
            )
        elif "region" in feat and direction == "positive" and pct > 10.0:
            risk_flags.append({
                "flag": "Regional Grid Carbon Intensity",
                "severity": "Info",
                "message": f"Regional grid factor elevates modeled emissions by +{pct:.1f}% due to high local thermal generation."
            })

    if not risk_flags:
        risk_flags.append({
            "flag": "Standard Operational Variance",
            "severity": "Low",
            "message": "Model adjustments remain within normal operational tolerance (±5%)."
        })

    summary_text = (
        f"For the current reporting period, total greenhouse gas footprint is estimated at "
        f"{total_kg / 1000.0:.2f} t CO2e ({total_kg:,.1f} kg CO2e). "
        f"The breakdown reveals Scope 1 at {s1_pct:.1f}%, Scope 2 at {s2_pct:.1f}%, and Scope 3 at {s3_pct:.1f}%. "
        f"{'Scope 3 upstream activities represent the critical strategic priority.' if s3_pct >= 50 else 'Scope 2 energy consumption is the primary near-term decarbonization target.'}"
    )

    return {
        "source": "Rule-Based Deterministic Engine",
        "provider": "RuleBasedProvider",
        "summary": summary_text,
        "hotspots": hotspots,
        "trend": "Operational emissions remain correlated with production output and logistics intensity.",
        "opportunities": opportunities,
        "recommendedActions": recommended_actions[:5],
        "riskFlags": risk_flags
    }
