# 🏃‍♂️ End-to-End Human Activity Recognition (HAR) Pipeline

![Python](https://img.shields.io/badge/Python-3.13-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi\&logoColor=white)
![Scikit-Learn](https://img.shields.io/badge/scikit--learn-1.6.1-F7931E?logo=scikit-learn\&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla_JS-F7DF1E?logo=javascript\&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel\&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-Deployed-131415?logo=railway\&logoColor=white)

---

# 🌐 Live Demo

👉 **[Experience the Live Application Here](https://har-end-to-end-project.vercel.app/)**

---

# 📖 Project Overview

This project is a complete full-stack Machine Learning architecture designed to classify human physical activities using smartphone sensor telemetry data.

The system predicts the following activities:

* Walking
* Walking Upstairs
* Walking Downstairs
* Sitting
* Standing
* Laying

The pipeline processes **561 engineered features** extracted from smartphone accelerometer and gyroscope signals.

Instead of remaining inside a Jupyter Notebook, the trained ML pipeline is serialized and deployed as a production-ready cloud microservice with a fully interactive frontend.

---

# 🏗️ Architecture & Tech Stack

## 1. Machine Learning Pipeline

* **Algorithm:** Support Vector Machine (RBF Kernel)
* **Accuracy:** 94.23%
* **Preprocessing:**

  * `StandardScaler`
  * `PCA` (95% variance retained)
* **Hyperparameter Optimization:** `RandomizedSearchCV`

---

## 2. Backend API (Railway)

### Stack

* FastAPI
* Uvicorn

### Responsibilities

* Loads serialized `.pkl` ML pipeline
* Exposes REST API endpoint:

```http
POST /predict
```

* Accepts 561-feature JSON arrays
* Returns predicted activity labels

---

## 3. Frontend UI (Vercel)

### Stack

* HTML5
* CSS3
* Vanilla JavaScript

### Features

* CSV Upload Support
* Async API Calls using `Promise.all`
* Real-time pipeline animation effects
* Responsive lightweight interface

---

# 📂 Repository Structure

```text
har-end-to-end-project/
├── backend/
│   ├── models/
│   │   └── har_pipeline_champion.pkl
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── app.js
│   ├── index.html
│   └── style.css
│
└── .gitignore
```

---

# 🚀 How to Run Locally

## 1. Clone Repository

```bash
git clone https://github.com/yourusername/har-end-to-end-project.git

cd har-end-to-end-project
```

---

## 2. Start Backend Server

```bash
cd backend

python -m venv .venv
```

### Activate Virtual Environment

#### macOS / Linux

```bash
source .venv/bin/activate
```

#### Windows

```bash
.venv\Scripts\activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run FastAPI Server

```bash
uvicorn main:app --reload
```

Backend will now run on:

```text
http://127.0.0.1:8000
```

---

## 3. Start Frontend

1. Open:

```text
frontend/app.js
```

2. Change:

```javascript
const API_URL = "http://127.0.0.1:8000/predict";
```

3. Open:

```text
frontend/index.html
```

in your browser.

4. Upload CSV data or simulate sensor input.

---

# 📊 Model Workflow

```text
Raw Sensor Data
        ↓
Feature Scaling
        ↓
PCA Dimensionality Reduction
        ↓
SVM Classification
        ↓
Predicted Human Activity
```

---

# 📈 Future Enhancements

* Real-time smartwatch/mobile sensor integration
* WebSocket streaming inference
* User authentication and prediction history
* Deep Learning sequence models (LSTM / GRU)
* Mobile-responsive dashboard
* Dockerized deployment pipeline

---

# 🧠 Key Learning Outcomes

This project demonstrates:

* End-to-end ML deployment
* FastAPI backend development
* Frontend-backend integration
* Cloud deployment using Railway + Vercel
* Production ML pipeline serialization
* Real-time asynchronous API handling

---

# 📜 License

This project is open-source and available under the MIT License.
