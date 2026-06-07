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
    
    # Predict the winning class
    prediction = model.predict(input_data)
    pred_class = int(prediction[0])
    activity_str = ACTIVITY_MAP.get(pred_class, "Unknown")

    # --- Real confidence scores ---
    # Try predict_proba first (only works if SVM was trained with probability=True)
    scores = {}
    try:
        proba = model.predict_proba(input_data)[0]          # shape: (6,)
        classes = model.classes_                             # e.g. [1,2,3,4,5,6]
        scores = {
            ACTIVITY_MAP[int(c)]: round(float(p) * 100, 1)
            for c, p in zip(classes, proba)
            if int(c) in ACTIVITY_MAP
        }
    except AttributeError:
        # Fallback: use decision_function (raw SVM margins, not probabilities)
        # Shift so all values are positive, then normalise to sum to 100
        decision = model.decision_function(input_data)[0]   # shape: (6,)
        classes = model.classes_
        shifted = decision - decision.min()                  # all >= 0
        total = shifted.sum() or 1.0
        scores = {
            ACTIVITY_MAP[int(c)]: round(float(v / total) * 100, 1)
            for c, v in zip(classes, shifted)
            if int(c) in ACTIVITY_MAP
        }

    return {"activity": activity_str, "scores": scores}