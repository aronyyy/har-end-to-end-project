const API_URL = "har-end-to-end-project-production.up.railway.app"; 

document.getElementById('predictBtn').addEventListener('click', async () => {
    const loadingText = document.getElementById('loading');
    const resultBox = document.getElementById('resultBox');
    const activityText = document.getElementById('activityText');

    // Show loading state
    loadingText.classList.remove('hidden');
    resultBox.classList.add('hidden');

    // Simulate generating 561 sensor data points (like a wearable device would)
    // In a real app, this would be live data from an accelerometer
    const dummySensorData = Array.from({length: 561}, () => Math.random() * 2 - 1);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ features: dummySensorData })
        });

        const data = await response.json();

        // Update UI with the result
        activityText.innerText = data.activity;
        loadingText.classList.add('hidden');
        resultBox.classList.remove('hidden');

    } catch (error) {
        console.error("Error communicating with backend:", error);
        activityText.innerText = "Error (Check Console)";
        activityText.style.color = "red";
        loadingText.classList.add('hidden');
        resultBox.classList.remove('hidden');
    }
});