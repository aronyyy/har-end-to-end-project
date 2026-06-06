const API_URL = "har-end-to-end-project-production.up.railway.app/predict"; 

// const API_URL = "https://your-actual-railway-url.up.railway.app/predict"; 

document.getElementById('predictBtn').addEventListener('click', async () => {
    // Generate exactly 561 random numbers between -1 and 1
    const dummySensorData = Array.from({length: 561}, () => Math.random() * 2 - 1);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ features: dummySensorData })
        });

        const data = await response.json();
        document.getElementById('activityText').innerText = data.activity;

    } catch (error) {
        console.error("Error:", error);
    }
});