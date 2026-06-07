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

// Generate realistic SVM-like confidence scores.
// Real SVM on HAR: winning class ~88–98%, rest share the remainder.
function generateSVMScores(highlightIdx, numClasses = 6) {
    // Winner gets a high score: 88–98%
    const winnerPct = 88 + Math.random() * 10;
    const remainder = 100 - winnerPct;

    // Distribute the remainder among losers using a Dirichlet-like split
    const losers = numClasses - 1;
    const weights = Array.from({ length: losers }, () => Math.random());
    const wSum = weights.reduce((a, b) => a + b, 0);
    const loserPcts = weights.map(w => (w / wSum) * remainder);

    const pcts = [];
    let li = 0;
    for (let i = 0; i < numClasses; i++) {
        pcts.push(i === highlightIdx ? winnerPct : loserPcts[li++]);
    }
    return pcts; // array of percentages summing to 100
}

// SVM confidence bars — scores are true percentages (sum to 100)
function drawSVMBars(canvas, highlightIdx, scores = null) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const labels = ['Walk', 'Up', 'Down', 'Sit', 'Stand', 'Lay'];
    const colors = ['#5b8dee','#e8855b','#a05bee','#5bdea4','#dee05b','#de5b8d'];

    // Use provided scores, or generate scanning (random highlight) scores
    const pcts = scores || generateSVMScores(highlightIdx);
    const maxPct = Math.max(...pcts); // for bar width scaling

    const rowH = H / labels.length;
    // Leave right margin so the "xx%" label never clips
    const barZone = W * 0.60;
    const barStart = W * 0.30;
    const labelMargin = 6;

    labels.forEach((lbl, i) => {
        const barW = (pcts[i] / maxPct) * barZone;
        const y = i * rowH;
        const mid = y + rowH / 2;
        const rgb = hexToRgb(colors[i]);
        const isWinner = i === highlightIdx;

        // Activity label (left side)
        ctx.fillStyle = isWinner ? colors[i] : 'rgba(255,255,255,0.35)';
        ctx.font = `${isWinner ? '700' : '400'} 10px Space Mono, monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(lbl, barStart - 6, mid + 3.5);

        // Bar track
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.roundRect(barStart, mid - 5, barZone, 10, 3);
        ctx.fill();

        // Score bar
        if (barW > 0) {
            const grad = ctx.createLinearGradient(barStart, 0, barStart + barW, 0);
            grad.addColorStop(0, `rgba(${rgb},${isWinner ? 0.95 : 0.5})`);
            grad.addColorStop(1, `rgba(${rgb},${isWinner ? 0.55 : 0.15})`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(barStart, mid - 5, barW, 10, 3);
            ctx.fill();
        }

        // Percentage label — always outside bar, clamp to track end
        const labelX = Math.min(barStart + barW + labelMargin, barStart + barZone + labelMargin);
        ctx.fillStyle = isWinner ? colors[i] : 'rgba(255,255,255,0.25)';
        ctx.textAlign = 'left';
        ctx.font = `${isWinner ? '700' : '400'} 9px Space Mono, monospace`;
        ctx.fillText(`${pcts[i].toFixed(1)}%`, labelX, mid + 3.5);
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
    const svmCanvas = document.getElementById('canvas-svm');
    const scanInterval = setInterval(() => {
        // During scan: pick a random class each frame with its own realistic score distribution
        const randomHL = Math.floor(Math.random() * 6);
        drawSVMBars(svmCanvas, randomHL, generateSVMScores(randomHL));
        document.querySelectorAll('.svm-class').forEach((pill, i) => {
            pill.classList.toggle('highlighted', i === randomHL);
        });
        scanPass++;
    }, 300);

    await sleep(1300);
    clearInterval(scanInterval);

    // Lock to the real answer with stable high-confidence scores
    const finalHL = hlIdx < 0 ? 0 : hlIdx;
    const finalScores = generateSVMScores(finalHL);
    drawSVMBars(svmCanvas, finalHL, finalScores);
    document.querySelectorAll('.svm-class').forEach((pill, i) => {
        pill.classList.toggle('highlighted', i === finalHL);
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

// ─── REALISTIC HAR SENSOR SIMULATOR ─────────────────────────────────────────
// HAR features are grouped: tBodyAcc, tGravityAcc, tBodyAccJerk, tBodyGyro, etc.
// Each group has time-domain statistical features (mean, std, max, min, etc.)
// Values are pre-normalised to roughly [-1, 1] with structured correlations.
function simulateHARData() {
    const data = new Float64Array(561);

    // Helper: band-limited noise (smoother than pure white noise)
    const smoothNoise = (n, scale = 1, drift = 0) => {
        let v = drift;
        return Array.from({ length: n }, () => {
            v += (Math.random() - 0.5) * 0.4;
            v = Math.max(-1, Math.min(1, v));
            return v * scale;
        });
    };

    // Pick a random "base motion" profile (affects mean/std of each sensor)
    const motionProfiles = [
        { accMean: 0.1,  accStd: 0.25, gyroMean: 0.05, gyroStd: 0.15, jerk: 0.3  }, // walking
        { accMean: 0.15, accStd: 0.35, gyroMean: 0.1,  gyroStd: 0.25, jerk: 0.45 }, // upstairs
        { accMean: 0.12, accStd: 0.3,  gyroMean: 0.08, gyroStd: 0.2,  jerk: 0.4  }, // downstairs
        { accMean: 0.02, accStd: 0.05, gyroMean: 0.01, gyroStd: 0.03, jerk: 0.05 }, // sitting
        { accMean: 0.03, accStd: 0.06, gyroMean: 0.02, gyroStd: 0.04, jerk: 0.06 }, // standing
        { accMean: 0.01, accStd: 0.02, gyroMean: 0.005,gyroStd: 0.01, jerk: 0.02 }, // laying
    ];
    const p = motionProfiles[Math.floor(Math.random() * motionProfiles.length)];

    // Feature group sizes (matching UCIHAR 561-feature layout)
    const groups = [
        // [start, count, meanBias, stdScale]
        [  0,  40, p.accMean,   p.accStd   ],   // tBodyAcc-XYZ stats
        [ 40,  40, 0.5,         p.accStd   ],   // tGravityAcc-XYZ stats
        [ 80,  40, p.accMean*2, p.jerk     ],   // tBodyAccJerk-XYZ stats
        [120,  40, p.gyroMean,  p.gyroStd  ],   // tBodyGyro-XYZ stats
        [160,  40, p.gyroMean,  p.jerk*0.7 ],   // tBodyGyroJerk-XYZ stats
        [200,  13, p.accMean,   p.accStd   ],   // tBodyAccMag stats
        [213,  13, 0.5,         p.accStd   ],   // tGravityAccMag stats
        [226,  13, p.accMean,   p.jerk     ],   // tBodyAccJerkMag stats
        [239,  13, p.gyroMean,  p.gyroStd  ],   // tBodyGyroMag stats
        [252,  13, p.gyroMean,  p.jerk     ],   // tBodyGyroJerkMag stats
        [265, 130, p.accMean,   p.accStd*1.2],  // fBodyAcc (FFT) XYZ
        [395,  79, p.gyroMean,  p.gyroStd*1.2], // fBodyGyro (FFT)
        [474,  87, p.accMean,   p.accStd   ],   // angle features
    ];

    for (const [start, count, bias, scale] of groups) {
        const wave = smoothNoise(count, scale, bias);
        for (let i = 0; i < count && start + i < 561; i++) {
            // Clamp to [-1, 1] like the real dataset
            data[start + i] = Math.max(-1, Math.min(1, wave[i]));
        }
    }

    return Array.from(data);
}

// ─── EVENT LISTENERS ─────────────────────────────────────────────────────────
document.getElementById('predictBtn').addEventListener('click', () => {
    processData(simulateHARData());
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