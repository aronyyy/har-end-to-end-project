from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np

app = FastAPI(title="HAR Prediction API")

# Allow the frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The magic serialization step: Loads the scaler, PCA, and SVM instantly
print("Loading Champion Pipeline...")
model = joblib.load("models/har_pipeline_champion.pkl")
print("Pipeline loaded and ready!")

class SensorData(BaseModel):
    features: list[float]

@app.post("/predict")
def predict_activity(data: SensorData):
    if len(data.features) != 561:
        return {"error": f"Expected 561 features, got {len(data.features)}"}
        
    # Convert list to numpy array and reshape for a single prediction
    input_data = np.array(data.features).reshape(1, -1)
    
    # The pipeline handles all preprocessing automatically
    prediction = model.predict(input_data)
    
    return {"activity": prediction[0]}