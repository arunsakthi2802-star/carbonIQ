"""
CarbonIQ — FastAPI Machine Learning & Explainable AI Microservice
Exposes endpoints for baseline emissions calculation, XGBoost operational corrections,
Tree SHAP explainability, What-If decarbonization simulation, model retraining, and compliance PDF generation.
"""

import os
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from calculator import process_calculations, calculate_item_emission, DEFAULT_EMISSION_FACTORS
from ml_engine import predict_corrected, explain_predictions, run_whatif, get_model_metadata
from train_model import train_correction_model
from report_generator import generate_pdf_report
from fallback_engine import generate_rule_based_insights

app = FastAPI(
    title="CarbonIQ ML & Explainable AI Service",
    description="Machine Learning Correction and Explainable AI Engine for Supply Chain Decarbonization",
    version="1.0.0"
)

# Enable CORS for frontend and API gateway
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Request Models
class ActivityEntryModel(BaseModel):
    activityType: str
    quantity: float
    unit: Optional[str] = None
    region: Optional[str] = "IN"
    equipmentAgeYears: Optional[float] = 5.0
    cargoWeightTons: Optional[float] = 0.0
    supplierId: Optional[str] = None
    period: Optional[str] = None

class CalculateRequest(BaseModel):
    entries: List[Dict[str, Any]]
    customFactors: Optional[Dict[str, float]] = None

class CorrectRequest(BaseModel):
    entries: List[Dict[str, Any]]
    season: Optional[str] = "spring"
    modelVersion: Optional[str] = "1.0.0"

class ExplainRequest(BaseModel):
    entries: List[Dict[str, Any]]
    season: Optional[str] = "spring"

class WhatIfRequest(BaseModel):
    entries: List[Dict[str, Any]]
    adjustments: Dict[str, float] = Field(
        default_factory=lambda: {
            "road_freight": 0.0,
            "diesel": 0.0,
            "electricity": 0.0,
            "cotton": 0.0
        }
    )

class ReportRequest(BaseModel):
    companyName: str
    period: str
    framework: str = "SEBI BRSR"
    totalKg: float
    baselineTotalKg: float
    correctedTotalKg: float
    scope1Kg: float
    scope2Kg: float
    scope3Kg: float
    topFactors: Optional[List[Dict[str, Any]]] = None
    modelVersion: Optional[str] = "1.0.0"

# Endpoints
@app.get("/")
def root():
    return {
        "service": "CarbonIQ ML & Explainable AI Microservice",
        "status": "Operational",
        "version": "1.0.0",
        "docsUrl": "/docs"
    }

@app.get("/health")
def health_check():
    meta = get_model_metadata()
    return {
        "status": "Healthy",
        "modelLoaded": True,
        "modelVersion": meta.get("modelVersion", "1.0.0"),
        "r2": meta.get("r2", 0.99),
        "datasetType": meta.get("datasetType", "Synthetic Operational Ground Truth")
    }

@app.post("/calculate")
def calculate_emissions(payload: CalculateRequest):
    """
    Computes Scope 1, Scope 2, and Scope 3 baseline accounting values.
    """
    try:
        result = process_calculations(payload.entries, payload.customFactors)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")

@app.post("/correct")
def correct_emissions(payload: CorrectRequest):
    """
    Applies XGBoost regressor to baseline estimates to predict operational adjustments.
    """
    try:
        result = predict_corrected(payload.entries, payload.season, payload.modelVersion)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML correction error: {str(e)}")

@app.post("/explain")
def explain_emissions(payload: ExplainRequest):
    """
    Computes exact Tree SHAP feature contributions and generates plain-language diagnostics.
    """
    try:
        result = explain_predictions(payload.entries, payload.season)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explainability error: {str(e)}")

@app.post("/whatif")
def simulate_whatif(payload: WhatIfRequest):
    """
    Simulates operational adjustments across transport, energy, fuels, and raw materials.
    """
    try:
        result = run_whatif(payload.entries, payload.adjustments)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")

@app.post("/train")
def retrain_model():
    """
    Retrains the operational XGBoost model and outputs updated evaluation metrics.
    """
    try:
        metrics = train_correction_model()
        return {"success": True, "data": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")

@app.post("/report")
def generate_report(payload: ReportRequest):
    """
    Generates presentation-grade PDF compliance reports (BRSR or CSRD) with ReportLab.
    """
    try:
        file_path = generate_pdf_report(payload.dict())
        file_name = os.path.basename(file_path)
        return {
            "success": True,
            "data": {
                "filePath": file_path,
                "fileName": file_name,
                "downloadUrl": f"/reports/{file_name}"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report compilation error: {str(e)}")

@app.get("/reports/{filename}")
def download_pdf(filename: str):
    """
    Serves generated PDF documents.
    """
    storage_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "storage", "reports"))
    safe_path = os.path.join(storage_dir, os.path.basename(filename))
    if not os.path.exists(safe_path):
        raise HTTPException(status_code=404, detail="Requested report file not found")
    return FileResponse(safe_path, media_type="application/pdf", filename=filename)

@app.get("/model/status")
def model_status():
    return {"success": True, "data": get_model_metadata()}

@app.get("/model/metrics")
def model_metrics():
    meta = get_model_metadata()
    return {"success": True, "data": meta}

@app.post("/insights/fallback")
def fallback_insights(payload: Dict[str, Any]):
    """
    Generates deterministic rule-based insights.
    """
    insights = generate_rule_based_insights(payload)
    return {"success": True, "data": insights}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
