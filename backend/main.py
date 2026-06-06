from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np

app = FastAPI(title="HAR Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading Champion Pipeline...")
model = joblib.load("models/har_pipeline_champion.pkl")
print("Pipeline loaded and ready!")

class SensorData(BaseModel):
    features: list[float]

# SDE Step: Map the model's numerical output back to human-readable text
ACTIVITY_MAP = {
    1: 'Walking', 
    2: 'Walking Upstairs', 
    3: 'Walking Downstairs',
    4: 'Sitting', 
    5: 'Standing', 
    6: 'Laying'
}

@app.post("/predict")
def predict_activity(data: SensorData):
    if len(data.features) != 561:
        return {"error": f"Expected 561 features, got {len(data.features)}"}
        
    input_data = np.array(data.features).reshape(1, -1)
    
    # Model predicts a numpy array e.g., [4]
    prediction = model.predict(input_data)
    
    # THE FIX: Convert numpy.int64 to a standard Python integer
    pred_class = int(prediction[0])
    
    # Get the text label, defaulting to "Unknown" if something goes wrong
    activity_str = ACTIVITY_MAP.get(pred_class, "Unknown")
    
    return {"activity": activity_str}