const API_URL = "https://har-end-to-end-project-production.up.railway.app/predict";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── ACTIVITY METADATA ──────────────────────────────────────────────────────
const ACTIVITY_META = {
    'Walking':           { icon: '🚶', color: '#5b8dee' },
    'Walking Upstairs':  { icon: '🪜', color: '#e8855b' },
    'Walking Downstairs':{ icon: '⬇️', color: '#a05bee' },
    'Sitting':           { icon: '🪑', color: '#5bdea4' },
    'Standing':          { icon: '🧍', color: '#dee05b' },
    'Laying':            { icon: '🛏️', color: '#de5b8d' },
};

// ─── CANVAS HELPERS ──────────────────────────────────────────────────────────
function hexToRgb(hex) {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    return m ? `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}` : '255,255,255';
}

function clearCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Animated waveform drawing with smooth line
function drawWave(canvas, values, color, speed = 20) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    let frame = 0;
    const totalFrames = Math.floor(W / speed) + 2;

    function step() {
        ctx.clearRect(0, 0, W, H);

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let y = H * 0.25; y < H; y += H * 0.25) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        for (let x = 0; x < W; x += W / 8) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }

        // Zero line
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();

        const drawn = Math.min(frame * speed, W);
        const rgb = hexToRgb(color);

        // Fill area under curve
        ctx.beginPath();
        ctx.moveTo(0, H/2);
        for (let x = 0; x < drawn; x++) {
            const idx = Math.floor((x / W) * values.length);
            const y = H/2 - values[idx] * (H/2 - 6);
            if (x === 0) ctx.lineTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineTo(drawn, H/2);
        ctx.closePath();
        ctx.fillStyle = `rgba(${rgb},0.08)`;
        ctx.fill();

        // Main line
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        for (let x = 0; x < drawn; x++) {
            const idx = Math.floor((x / W) * values.length);
            const y = H/2 - values[idx] * (H/2 - 6);
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Moving dot at tip
        if (drawn < W) {
            const idx = Math.floor((drawn / W) * values.length);
            const tipY = H/2 - values[idx] * (H/2 - 6);
            ctx.beginPath();
            ctx.arc(drawn, tipY, 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(drawn, tipY, 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${rgb},0.3)`;
            ctx.fill();
        }

        frame++;
        if (frame <= totalFrames) requestAnimationFrame(step);
    }
    step();
}

// Distribution / histogram
function drawDist(canvas, values, color, normalized = false) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const bins = 20;
    const min = normalized ? -3 : Math.min(...values);
    const max = normalized ? 3 : Math.max(...values);
    const range = max - min || 1;

    const counts = new Array(bins).fill(0);
    const src = normalized
        ? values.map(v => Math.max(-3, Math.min(3, (v - 0) / 1))) // already normalized
        : values;

    src.forEach(v => {
        const b = Math.floor(((Math.min(Math.max(v, min), max) - min) / range) * (bins - 1));
        counts[b]++;
    });

    const peak = Math.max(...counts) || 1;
    const bw = W / bins;
    const rgb = hexToRgb(color);

    ctx.clearRect(0, 0, W, H);

    counts.forEach((c, i) => {
        const barH = (c / peak) * (H - 10);
        const x = i * bw + 1;
        const grad = ctx.createLinearGradient(0, H, 0, H - barH);
        grad.addColorStop(0, `rgba(${rgb},0.5)`);
        grad.addColorStop(1, `rgba(${rgb},0.15)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, H - barH, bw - 2, barH);
    });

    // Draw axis label
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '9px Space Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(normalized ? 'μ=0, σ=1' : 'raw range', W/2, H - 1);
}

// Scree / variance bar chart for PCA
function drawPCAScree(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Simulated cumulative variance (realistic PCA curve)
    const numBars = 12;
    const variances = [28, 18, 11, 7.5, 5, 3.5, 2.5, 2, 1.5, 1.2, 0.9, 0.7]; // individual %
    let cum = 0;
    const cums = variances.map(v => { cum += v; return Math.min(cum, 100); });

    const bw = W / numBars;

    // Draw bars with animation-like gradient
    variances.forEach((v, i) => {
        const barH = (v / 28) * (H - 24);
        const x = i * bw + 2;
        const hue = 220 + (i / numBars) * 30;
        ctx.fillStyle = `hsla(${hue}, 70%, 65%, ${1 - i * 0.06})`;
        ctx.fillRect(x, H - barH - 14, bw - 4, barH);
    });

    // Cumulative variance line
    ctx.beginPath();
    ctx.strokeStyle = '#5bdea4';
    ctx.lineWidth = 1.5;
    cums.forEach((c, i) => {
        const x = i * bw + bw / 2;
        const y = H - 14 - (c / 100) * (H - 24);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 95% threshold line
    const lineY = H - 14 - 0.95 * (H - 24);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(91,141,238,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, lineY); ctx.lineTo(W, lineY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(91,141,238,0.8)';
    ctx.font = '8px Space Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('95%', 2, lineY - 2);

    // X-axis label
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '9px Space Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('principal components →', W/2, H);
}

// SVM confidence bars
function drawSVMBars(canvas, highlightIdx) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const labels = ['Walk', 'Up', 'Down', 'Sit', 'Stand', 'Lay'];
    const colors = ['#5b8dee','#e8855b','#a05bee','#5bdea4','#dee05b','#de5b8d'];

    // Generate realistic confidence-like scores
    const scores = labels.map((_, i) => {
        if (i === highlightIdx) return 0.75 + Math.random() * 0.2;
        return Math.random() * 0.3;
    });

    const rowH = H / labels.length;
    const maxScore = Math.max(...scores);

    labels.forEach((lbl, i) => {
        const barW = (scores[i] / maxScore) * (W * 0.65);
        const y = i * rowH;
        const mid = y + rowH / 2;
        const rgb = hexToRgb(colors[i]);

        // Label
        ctx.fillStyle = i === highlightIdx ? colors[i] : 'rgba(255,255,255,0.35)';
        ctx.font = `${i === highlightIdx ? '700' : '400'} 10px Space Mono, monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(lbl, W * 0.3, mid + 3.5);

        // Bar track
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.roundRect(W * 0.32, mid - 5, W * 0.65, 10, 3);
        ctx.fill();

        // Score bar
        const grad = ctx.createLinearGradient(W * 0.32, 0, W * 0.32 + barW, 0);
        grad.addColorStop(0, `rgba(${rgb},0.9)`);
        grad.addColorStop(1, `rgba(${rgb},0.4)`);
        ctx.fillStyle = i === highlightIdx ? grad : `rgba(${rgb},0.2)`;
        ctx.beginPath();
        ctx.roundRect(W * 0.32, mid - 5, barW, 10, 3);
        ctx.fill();

        // Score label
        ctx.fillStyle = i === highlightIdx ? colors[i] : 'rgba(255,255,255,0.2)';
        ctx.textAlign = 'left';
        ctx.font = '9px Space Mono, monospace';
        ctx.fillText(`${(scores[i] * 100).toFixed(0)}%`, W * 0.32 + barW + 4, mid + 3.5);
    });
}

// ─── STEP ACTIVATION ────────────────────────────────────────────────────────
function activateStep(stepId, sensorData) {
    const el = document.getElementById(stepId);
    el.classList.remove('state-done');
    el.classList.add('state-active');
}

function completeStep(stepId) {
    const el = document.getElementById(stepId);
    el.classList.remove('state-active');
    el.classList.add('state-done');
}

function activateConnector(idx) {
    const conn = document.getElementById(`conn-${idx}`);
    if (!conn) return;
    conn.classList.add('active');
    setTimeout(() => conn.classList.remove('active'), 900);
}

function doneConnector(idx) {
    const conn = document.getElementById(`conn-${idx}`);
    if (conn) conn.classList.add('done');
}

// ─── PIPELINE ANIMATION ──────────────────────────────────────────────────────
async function animatePipeline(sensorData, predictedActivity) {
    // Reset
    ['step-raw','step-scaler','step-pca','step-svm'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove('state-active','state-done');
    });
    [0,1,2].forEach(i => {
        const c = document.getElementById(`conn-${i}`);
        if (c) c.classList.remove('active','done');
    });

    document.getElementById('pipelineBox').classList.remove('hidden');
    document.getElementById('resultBox').classList.add('hidden');

    // ── Step 1: Raw Sensor Data ──────────────────────────────────────────────
    activateStep('step-raw');
    const canvasRaw = document.getElementById('canvas-raw');
    // Build 3 synthetic waveforms from the actual sensor data
    const seg = Math.floor(sensorData.length / 3);
    const wave1 = sensorData.slice(0, seg);
    const wave2 = sensorData.slice(seg, seg * 2);
    const wave3 = sensorData.slice(seg * 2);

    const ctx = canvasRaw.getContext('2d');
    ctx.clearRect(0, 0, canvasRaw.width, canvasRaw.height);

    // Draw all three waves layered, staggered
    drawWave(canvasRaw, wave1, '#5b8dee', 18);
    await sleep(300);
    // Overlay second wave
    const canvasTmp = document.createElement('canvas');
    canvasTmp.width = canvasRaw.width; canvasTmp.height = canvasRaw.height;
    drawWave(canvasTmp, wave2, '#e85b8d', 18);
    await sleep(300);
    const canvasTmp2 = document.createElement('canvas');
    canvasTmp2.width = canvasRaw.width; canvasTmp2.height = canvasRaw.height;
    drawWave(canvasTmp2, wave3, '#5bdea4', 18);
    await sleep(1200);

    completeStep('step-raw');
    activateConnector(0);
    await sleep(600);
    doneConnector(0);

    // ── Step 2: StandardScaler ───────────────────────────────────────────────
    activateStep('step-scaler');
    const before = sensorData.slice(0, 100);
    const normalized = before.map(v => (v - 0) * 3.2); // simulate standardization
    drawDist(document.getElementById('canvas-before'), before, '#e85b8d', false);
    await sleep(400);
    drawDist(document.getElementById('canvas-after'), normalized, '#5bdea4', true);
    await sleep(1000);

    completeStep('step-scaler');
    activateConnector(1);
    await sleep(600);
    doneConnector(1);

    // ── Step 3: PCA ──────────────────────────────────────────────────────────
    activateStep('step-pca');
    drawPCAScree(document.getElementById('canvas-pca'));
    // Animate the dimension counter
    const dimEl = document.getElementById('pca-dims');
    const outEl = document.getElementById('pca-out');
    let n = 561;
    const target = 110 + Math.floor(Math.random() * 20); // realistic 95% var threshold
    outEl.textContent = target;
    const dimInterval = setInterval(() => {
        n = Math.max(target, n - 30 - Math.floor(Math.random() * 25));
        dimEl.textContent = n;
        if (n <= target) { dimEl.textContent = '561'; clearInterval(dimInterval); }
    }, 80);
    await sleep(1400);
    clearInterval(dimInterval);
    dimEl.textContent = '561';

    completeStep('step-pca');
    activateConnector(2);
    await sleep(600);
    doneConnector(2);

    // ── Step 4: SVM ──────────────────────────────────────────────────────────
    activateStep('step-svm');

    // Map activity string to index
    const activityNames = ['Walking','Walking Upstairs','Walking Downstairs','Sitting','Standing','Laying'];
    const hlIdx = activityNames.findIndex(a => a === predictedActivity);

    // Animate scanning bars
    let scanPass = 0;
    const scanInterval = setInterval(() => {
        const randomHL = scanPass < 3 ? Math.floor(Math.random() * 6) : hlIdx;
        drawSVMBars(document.getElementById('canvas-svm'), randomHL);

        // Flash class pills
        document.querySelectorAll('.svm-class').forEach(pill => {
            pill.classList.remove('highlighted');
        });
        const svmClasses = document.querySelectorAll('.svm-class');
        if (svmClasses[randomHL]) svmClasses[randomHL].classList.add('highlighted');
        scanPass++;
    }, 320);

    await sleep(1300);
    clearInterval(scanInterval);

    // Lock to the real answer
    drawSVMBars(document.getElementById('canvas-svm'), hlIdx < 0 ? 0 : hlIdx);
    document.querySelectorAll('.svm-class').forEach((pill, i) => {
        pill.classList.toggle('highlighted', i === hlIdx);
    });

    await sleep(300);
    completeStep('step-svm');
}

// ─── SHOW RESULT ─────────────────────────────────────────────────────────────
function showResult(activityStr, isError = false) {
    const activityText = document.getElementById('activityText');
    const iconEl = document.getElementById('resultIcon');
    const resultBox = document.getElementById('resultBox');

    if (isError) {
        activityText.textContent = 'API Error';
        activityText.style.color = '#e85b5b';
        iconEl.textContent = '⚠️';
    } else {
        const meta = ACTIVITY_META[activityStr] || { icon: '🤔', color: '#5b8dee' };
        activityText.textContent = activityStr;
        activityText.style.color = meta.color;
        iconEl.textContent = meta.icon;
    }

    resultBox.classList.remove('hidden');
}

// ─── API CALL ─────────────────────────────────────────────────────────────────
async function fetchPrediction(sensorData) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: sensorData })
    });
    return await response.json();
}

// ─── MASTER PROCESS ──────────────────────────────────────────────────────────
async function processData(sensorData) {
    try {
        // Fire API call immediately; run a placeholder animation until we know the result
        const apiPromise = fetchPrediction(sensorData);

        // Run the first 3 steps of the animation while waiting for the API
        await runPartialAnimation(sensorData);

        // Now wait for the API if it hasn't finished yet
        const apiData = await apiPromise;
        const activity = apiData.activity || 'Unknown';

        // Run the final SVM step with the real result
        await runSVMStep(activity);

        showResult(activity);

    } catch (error) {
        console.error("Error:", error);
        // Still finish the animation with an error state
        completeStep('step-svm');
        showResult(null, true);
    }
}

// Runs steps 1-3 and returns; step 4 needs the real activity label
async function runPartialAnimation(sensorData) {
    ['step-raw','step-scaler','step-pca','step-svm'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove('state-active','state-done');
    });
    [0,1,2].forEach(i => {
        const c = document.getElementById(`conn-${i}`);
        if (c) c.classList.remove('active','done');
    });
    document.getElementById('pipelineBox').classList.remove('hidden');
    document.getElementById('resultBox').classList.add('hidden');

    // STEP 1
    activateStep('step-raw');
    const seg = Math.floor(sensorData.length / 3);
    drawWave(document.getElementById('canvas-raw'), sensorData.slice(0, seg), '#5b8dee', 18);
    await sleep(1500);
    completeStep('step-raw');
    activateConnector(0);
    await sleep(600);
    doneConnector(0);

    // STEP 2
    activateStep('step-scaler');
    drawDist(document.getElementById('canvas-before'), sensorData.slice(0, 80), '#e85b8d', false);
    await sleep(400);
    drawDist(document.getElementById('canvas-after'), sensorData.slice(0, 80).map(v => v * 3), '#5bdea4', true);
    await sleep(1000);
    completeStep('step-scaler');
    activateConnector(1);
    await sleep(600);
    doneConnector(1);

    // STEP 3
    activateStep('step-pca');
    drawPCAScree(document.getElementById('canvas-pca'));
    await sleep(1200);
    completeStep('step-pca');
    activateConnector(2);
    await sleep(600);
    doneConnector(2);
}

async function runSVMStep(predictedActivity) {
    activateStep('step-svm');
    const activityNames = ['Walking','Walking Upstairs','Walking Downstairs','Sitting','Standing','Laying'];
    const hlIdx = activityNames.findIndex(a => a === predictedActivity);

    let scanPass = 0;
    const scanInterval = setInterval(() => {
        const randomHL = scanPass < 3 ? Math.floor(Math.random() * 6) : hlIdx;
        drawSVMBars(document.getElementById('canvas-svm'), randomHL);
        document.querySelectorAll('.svm-class').forEach((pill, i) => {
            pill.classList.toggle('highlighted', i === randomHL);
        });
        scanPass++;
    }, 320);

    await sleep(1400);
    clearInterval(scanInterval);

    const finalHL = hlIdx < 0 ? 0 : hlIdx;
    drawSVMBars(document.getElementById('canvas-svm'), finalHL);
    document.querySelectorAll('.svm-class').forEach((pill, i) => {
        pill.classList.toggle('highlighted', i === finalHL);
    });

    await sleep(300);
    completeStep('step-svm');
}

// ─── FILE LABEL UPDATE ───────────────────────────────────────────────────────
document.getElementById('csvFileInput').addEventListener('change', function () {
    const label = document.getElementById('fileLabel');
    label.textContent = this.files.length ? this.files[0].name : 'Choose a .csv file';
});

// ─── RESET BUTTON ────────────────────────────────────────────────────────────
document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('resultBox').classList.add('hidden');
    document.getElementById('pipelineBox').classList.add('hidden');
    ['step-raw','step-scaler','step-pca','step-svm'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove('state-active','state-done');
    });
    [0,1,2].forEach(i => {
        const c = document.getElementById(`conn-${i}`);
        if (c) c.classList.remove('active','done');
    });
});

// ─── EVENT LISTENERS ─────────────────────────────────────────────────────────
document.getElementById('predictBtn').addEventListener('click', () => {
    const dummySensorData = Array.from({ length: 561 }, () => Math.random() * 2 - 1);
    processData(dummySensorData);
});

document.getElementById('predictCsvBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('csvFileInput');
    if (fileInput.files.length === 0) {
        alert("Please select a .csv file first!");
        return;
    }
    const reader = new FileReader();
    reader.onload = function (event) {
        const rawArray = event.target.result.split(',').map(Number);
        if (rawArray.length < 561) {
            alert(`Invalid CSV. Expected 561 columns, got ${rawArray.length}.`);
            return;
        }
        processData(rawArray.slice(0, 561));
    };
    reader.readAsText(fileInput.files[0]);
});