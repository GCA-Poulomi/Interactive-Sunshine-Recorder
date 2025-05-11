document.addEventListener('DOMContentLoaded', () => {
    const sunElement = document.getElementById('sun');
    const sphereElement = document.getElementById('sphere');
    const cardCanvas = document.getElementById('recording-card');
    const timeSlider = document.getElementById('time-slider');
    const toggleSunshineButton = document.getElementById('toggle-sunshine');
    const resetCardButton = document.getElementById('reset-card');
    const meterContainer = document.getElementById('meter-container');
    const lightRayCanvas = document.getElementById('light-ray-canvas'); // Canvas still exists

    const cardCtx = cardCanvas.getContext('2d');
    const rayCtx = lightRayCanvas.getContext('2d'); // Context for the ray canvas

    const cardWidth = 380;
    const cardHeight = 60;
    cardCanvas.width = cardWidth;
    cardCanvas.height = cardHeight;

    // Set light ray canvas dimensions to match container
    lightRayCanvas.width = meterContainer.clientWidth;
    lightRayCanvas.height = meterContainer.clientHeight;

    let isSunShining = true;
    let lastBurnX = null;
    let pixelsPerHour;

    const sunriseColors = { top: '#FFDAB9', bottom: '#FFA07A' };
    const noonColors = { top: '#87CEEB', bottom: '#ADD8E6' };
    const sunsetColors = { top: '#FFA07A', bottom: '#FF6347' };

    function interpolateColor(color1, color2, factor) {
        let r1 = parseInt(color1.substring(1, 3), 16);
        let g1 = parseInt(color1.substring(3, 5), 16);
        let b1 = parseInt(color1.substring(5, 7), 16);
        let r2 = parseInt(color2.substring(1, 3), 16);
        let g2 = parseInt(color2.substring(3, 5), 16);
        let b2 = parseInt(color2.substring(5, 7), 16);

        let r = Math.round(r1 + factor * (r2 - r1));
        let g = Math.round(g1 + factor * (g2 - g1));
        let b = Math.round(b1 + factor * (b2 - b1));

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    function updateBackgroundGradient(sliderValue) {
        let topColor, bottomColor;
        if (sliderValue <= 60) {
            const factor = sliderValue / 60;
            topColor = interpolateColor(sunriseColors.top, noonColors.top, factor);
            bottomColor = interpolateColor(sunriseColors.bottom, noonColors.bottom, factor);
        } else {
            const factor = (sliderValue - 60) / 60;
            topColor = interpolateColor(noonColors.top, sunsetColors.top, factor);
            bottomColor = interpolateColor(noonColors.bottom, sunsetColors.bottom, factor);
        }
        meterContainer.style.background = `linear-gradient(to bottom, ${topColor}, ${bottomColor})`;
    }

    function updateSunshineButton() {
        if (isSunShining) {
            toggleSunshineButton.textContent = 'Sun is Shining';
            toggleSunshineButton.classList.add('active');
            toggleSunshineButton.classList.remove('inactive');
            sunElement.style.opacity = '1';
            sunElement.style.backgroundColor = 'yellow';
            sunElement.style.boxShadow = '0 0 25px yellow, 0 0 35px orange';
        } else {
            toggleSunshineButton.textContent = 'Sun is Hidden (Cloudy)';
            toggleSunshineButton.classList.add('inactive');
            toggleSunshineButton.classList.remove('active');
            sunElement.style.opacity = '0.5';
            sunElement.style.backgroundColor = '#ccc';
            sunElement.style.boxShadow = 'none';
        }
        drawLightRay(); // Call to clear the ray canvas if needed
    }

    function drawCardBase() {
        cardCtx.fillStyle = '#faf0e6';
        cardCtx.fillRect(0, 0, cardWidth, cardHeight);
        cardCtx.strokeStyle = '#8B4513';
        cardCtx.lineWidth = 1;

        const hoursOnCard = 12;
        pixelsPerHour = cardWidth / hoursOnCard;

        for (let i = 0; i <= hoursOnCard; i++) {
            const x = i * pixelsPerHour;
            cardCtx.beginPath();
            cardCtx.moveTo(x, 0);
            cardCtx.lineTo(x, cardHeight);
            cardCtx.stroke();

            if (i % 1 === 0) {
                cardCtx.fillStyle = '#333';
                cardCtx.font = '10px Arial';
                cardCtx.textAlign = 'center';
                let hourLabel = (6 + i);
                if (hourLabel > 12) hourLabel -= 12;
                if (hourLabel === 0) hourLabel = 12;

                if (i > 0 && i < hoursOnCard) {
                    cardCtx.fillText(hourLabel.toString(), x, cardHeight / 2 + 15);
                } else if (i === 0) {
                    cardCtx.fillText("6", x + 5, cardHeight / 2 + 15);
                } else if (i === hoursOnCard) {
                    cardCtx.fillText("6", x - 5, cardHeight / 2 + 15);
                }
            }
        }
        cardCtx.beginPath();
        cardCtx.moveTo(cardWidth / 2, 0);
        cardCtx.lineTo(cardWidth / 2, cardHeight);
        cardCtx.lineWidth = 2;
        cardCtx.stroke();
        cardCtx.fillText("12", cardWidth / 2, cardHeight / 2 + 15);
        cardCtx.lineWidth = 1;
        lastBurnX = null;
    }

    /**
     * Clears the light ray canvas.
     * This function previously drew the light ray lines.
     * Now it only ensures the canvas is clear, effectively removing the visual ray.
     */
    function drawLightRay() {
        rayCtx.clearRect(0, 0, lightRayCanvas.width, lightRayCanvas.height);
        // All line drawing and hotspot code has been removed.
    }

    function updateSunPosition() {
        const sliderValue = parseInt(timeSlider.value);

        updateBackgroundGradient(sliderValue);

        const sunXPercent = (sliderValue / 120) * 90 + 5;
        sunElement.style.left = `${sunXPercent}%`;

        const midPoint = 60;
        const deviation = Math.abs(sliderValue - midPoint);
        const sunY = 20 + (deviation / midPoint) * 100;
        sunElement.style.top = `${sunY}px`;

        const focusX = (sliderValue / 120) * cardWidth;

        if (isSunShining) {
            burnCard(focusX);
        } else {
            lastBurnX = null;
        }
        drawLightRay(); // Call to ensure ray canvas is kept clear
    }

    function burnCard(x) {
        const burnY = cardHeight / 2;
        cardCtx.fillStyle = '#a0522d';
        cardCtx.strokeStyle = '#800000';
        cardCtx.lineWidth = 1.5;

        if (lastBurnX !== null && Math.abs(lastBurnX - x) < (pixelsPerHour / 1.5) ) {
            cardCtx.beginPath();
            cardCtx.moveTo(lastBurnX, burnY);
            cardCtx.lineTo(x, burnY);
            cardCtx.lineWidth = 4.5;
            cardCtx.strokeStyle = '#5a2d0c';
            cardCtx.lineCap = 'round';
            cardCtx.stroke();
        } else {
            cardCtx.beginPath();
            cardCtx.arc(x, burnY, 3, 0, Math.PI * 2);
            cardCtx.fill();
        }
        lastBurnX = x;
    }

    function initialize() {
        drawCardBase();
        updateSunshineButton();
        updateSunPosition();
    }

    timeSlider.addEventListener('input', updateSunPosition);

    toggleSunshineButton.addEventListener('click', () => {
        isSunShining = !isSunShining;
        updateSunshineButton();
        if (!isSunShining) {
            lastBurnX = null;
        }
    });

    resetCardButton.addEventListener('click', () => {
        drawCardBase();
        drawLightRay(); // Ensure ray canvas is clear after reset
    });
    
    window.addEventListener('resize', () => {
        lightRayCanvas.width = meterContainer.clientWidth;
        lightRayCanvas.height = meterContainer.clientHeight;
        drawCardBase(); 
        updateSunPosition(); 
    });

    initialize();
});
