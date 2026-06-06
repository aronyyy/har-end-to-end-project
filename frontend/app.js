const API_URL = "https://har-end-to-end-project-production.up.railway.app/predict"; 

document.getElementById('predictBtn').addEventListener('click', async () => {
    const loadingText = document.getElementById('loading');
    const resultBox = document.getElementById('resultBox');
    const activityText = document.getElementById('activityText');

    // 1. Show the loading text and hide old results
    loadingText.classList.remove('hidden');
    resultBox.classList.add('hidden');

    // 2. Generate exactly 561 random numbers
    const dummySensorData = Array.from({length: 561}, () => Math.random() * 2 - 1);

    try {
        // 3. Send to Railway
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ features: dummySensorData })
        });

        const data = await response.json();

        // 4. Update the text AND unhide the result box!
        activityText.innerText = data.activity;
        loadingText.classList.add('hidden');
        resultBox.classList.remove('hidden');

    } catch (error) {
        console.error("Error:", error);
        activityText.innerText = "Error (Check Console)";
        loadingText.classList.add('hidden');
        resultBox.classList.remove('hidden');
    }
});