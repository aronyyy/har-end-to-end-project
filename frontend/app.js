const API_URL = "https://har-end-to-end-project-production.up.railway.app/predict"; 

// Helper function to pause execution (creates the animation delay)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// The visual animation sequence
async function animatePipeline() {
    const steps = ['step-raw', 'step-scaler', 'step-pca', 'step-svm'];
    
    // Reset all steps to default
    steps.forEach(id => document.getElementById(id).className = 'step');
    document.getElementById('pipelineBox').classList.remove('hidden');
    document.getElementById('resultBox').classList.add('hidden');

    // Run the animation step-by-step
    for (let i = 0; i < steps.length; i++) {
        if (i > 0) {
            // Mark previous step as completed
            document.getElementById(steps[i-1]).classList.replace('active', 'completed');
        }
        // Set current step to active
        document.getElementById(steps[i]).classList.add('active');
        await sleep(800); // Wait 800ms per step
    }
    // Mark final step as completed
    document.getElementById(steps[steps.length - 1]).classList.replace('active', 'completed');
}

// Function to handle the actual API call
async function fetchPrediction(sensorData) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: sensorData })
    });
    return await response.json();
}

// Master function that runs animation and API call concurrently
async function processData(sensorData) {
    try {
        // Promise.all runs both tasks at the exact same time.
        // It waits for whichever takes longer (usually the animation) to finish.
        const [apiData] = await Promise.all([
            fetchPrediction(sensorData),
            animatePipeline()
        ]);

        // Once both are done, show result
        const activityText = document.getElementById('activityText');
        activityText.innerText = apiData.activity;
        activityText.style.color = "#0070f3";
        document.getElementById('resultBox').classList.remove('hidden');

    } catch (error) {
        console.error("Error:", error);
        document.getElementById('activityText').innerText = "API Error (Check Console)";
        document.getElementById('activityText').style.color = "red";
        document.getElementById('resultBox').classList.remove('hidden');
    }
}

// --- Event Listeners ---

// 1. Random Data Simulator
document.getElementById('predictBtn').addEventListener('click', () => {
    const dummySensorData = Array.from({length: 561}, () => Math.random() * 2 - 1);
    processData(dummySensorData);
});

// 2. Real CSV Upload
document.getElementById('predictCsvBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('csvFileInput');
    if (fileInput.files.length === 0) {
        alert("Please select a .csv file first!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const rawArray = event.target.result.split(',').map(Number);
        if (rawArray.length < 561) {
            alert(`Invalid CSV. Expected 561 columns, got ${rawArray.length}.`);
            return;
        }
        processData(rawArray.slice(0, 561));
    };
    reader.readAsText(fileInput.files[0]);
});