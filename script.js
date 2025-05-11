// Wait for the HTML content to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    // Get references to DOM elements
    const sunElement = document.getElementById('sun');
    const sphereElement = document.getElementById('sphere'); // Reference kept, though not directly manipulated for position
    const cardCanvas = document.getElementById('recording-card');
    const timeSlider = document.getElementById('time-slider');
    const toggleSunshineButton = document.getElementById('toggle-sunshine');
    const resetCardButton = document.getElementById('reset-card');
    const meterContainer = document.getElementById('meter-container');
    const lightRayCanvas = document.getElementById('light-ray-canvas'); // Canvas for the (removed) light ray

    // Get 2D rendering contexts for the canvases
    const cardCtx = cardCanvas.getContext('2d');
    const rayCtx = lightRayCanvas.getContext('2d'); // Context for the (now unused for drawing) ray canvas

    // Define dimensions for the recording card
    const cardWidth = 380;
    const cardHeight = 60;
    cardCanvas.width = cardWidth;
    cardCanvas.height = cardHeight;

    // Set the dimensions of the light ray canvas to match its container
    // This ensures it covers the correct area if it were to be used.
    if (meterContainer) { // Check if meterContainer exists to prevent errors if HTML structure is wrong
        lightRayCanvas.width = meterContainer.clientWidth;
        lightRayCanvas.height = meterContainer.clientHeight;
    }


    // State variables
    let isSunShining = true; // Tracks if the sun is currently shining or hidden
    let lastBurnX = null;    // Stores the last X position of a burn mark to draw continuous lines
    let pixelsPerHour;       // Calculated value: how many pixels on the card represent one hour

    // Color definitions for the dynamic background gradient
    const sunriseColors = { top: '#FFDAB9', bottom: '#FFA07A' }; // PeachPuff, LightSalmon
    const noonColors = { top: '#87CEEB', bottom: '#ADD8E6' };    // SkyBlue, LightBlue
    const sunsetColors = { top: '#FFA07A', bottom: '#FF6347' };  // LightSalmon, Tomato

    /**
     * Interpolates between two hex colors.
     * @param {string} color1 - The starting hex color string (e.g., "#RRGGBB").
     * @param {string} color2 - The ending hex color string.
     * @param {number} factor - The interpolation factor (0 to 1).
     * @returns {string} The interpolated hex color string.
     */
    function interpolateColor(color1, color2, factor) {
        // Parse hex colors to RGB components
        let r1 = parseInt(color1.substring(1, 3), 16);
        let g1 = parseInt(color1.substring(3, 5), 16);
        let b1 = parseInt(color1.substring(5, 7), 16);
        let r2 = parseInt(color2.substring(1, 3), 16);
        let g2 = parseInt(color2.substring(3, 5), 16);
        let b2 = parseInt(color2.substring(5, 7), 16);

        // Interpolate each color component
        let r = Math.round(r1 + factor * (r2 - r1));
        let g = Math.round(g1 + factor * (g2 - g1));
        let b = Math.round(b1 + factor * (b2 - b1));

        // Convert back to hex string
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    /**
     * Updates the background gradient of the meter container based on the time of day.
     * @param {number} sliderValue - The current value of the time slider (0-120).
     */
    function updateBackgroundGradient(sliderValue) {
        if (!meterContainer) return; // Safety check

        let topColor, bottomColor;
        // Morning to Noon (slider 0-60)
        if (sliderValue <= 60) {
            const factor = sliderValue / 60; // 0 at sunrise, 1 at noon
            topColor = interpolateColor(sunriseColors.top, noonColors.top, factor);
            bottomColor = interpolateColor(sunriseColors.bottom, noonColors.bottom, factor);
        }
        // Noon to Evening (slider 60-120)
        else {
            const factor = (sliderValue - 60) / 60; // 0 at noon, 1 at sunset
            topColor = interpolateColor(noonColors.top, sunsetColors.top, factor);
            bottomColor = interpolateColor(noonColors.bottom, sunsetColors.bottom, factor);
        }
        meterContainer.style.background = `linear-gradient(to bottom, ${topColor}, ${bottomColor})`;
    }

    /**
     * Updates the appearance and text of the "Toggle Sunshine" button and the sun element.
     */
    function updateSunshineButton() {
        if (!toggleSunshineButton || !sunElement) return; // Safety check

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
            sunElement.style.opacity = '0.5'; // Dim the sun
            sunElement.style.backgroundColor = '#ccc'; // Greyish sun
            sunElement.style.boxShadow = 'none'; // No glow
        }
        drawLightRay(); // Call to clear the ray canvas (as ray lines are removed)
    }

    /**
     * Draws the base of the recording card, including hour marks and labels.
     */
    function drawCardBase() {
        if (!cardCtx) return; // Safety check

        // Fill background
        cardCtx.fillStyle = '#faf0e6'; // Creamy beige
        cardCtx.fillRect(0, 0, cardWidth, cardHeight);

        // Style for hour lines
        cardCtx.strokeStyle = '#8B4513'; // Brown
        cardCtx.lineWidth = 1;

        const hoursOnCard = 12; // Simulating a 12-hour period (e.g., 6 AM to 6 PM)
        pixelsPerHour = cardWidth / hoursOnCard; // Calculate pixel width per hour

        // Draw hour marks and labels
        for (let i = 0; i <= hoursOnCard; i++) {
            const x = i * pixelsPerHour;
            cardCtx.beginPath();
            cardCtx.moveTo(x, 0);
            cardCtx.lineTo(x, cardHeight);
            cardCtx.stroke();

            // Add hour labels
            if (i % 1 === 0) { // Label every hour
                cardCtx.fillStyle = '#333';
                cardCtx.font = '10px Arial';
                cardCtx.textAlign = 'center';
                let hourLabel = (6 + i); // Assuming card starts at 6 AM
                if (hourLabel > 12) hourLabel -= 12; // Convert 13 to 1, 14 to 2 for PM
                if (hourLabel === 0) hourLabel = 12; // Should be 12 for noon/midnight

                // Position labels, avoiding edges for clarity
                if (i > 0 && i < hoursOnCard) {
                    cardCtx.fillText(hourLabel.toString(), x, cardHeight / 2 + 15);
                } else if (i === 0) { // 6 AM label
                    cardCtx.fillText("6", x + 5, cardHeight / 2 + 15);
                } else if (i === hoursOnCard) { // 6 PM label
                    cardCtx.fillText("6", x - 5, cardHeight / 2 + 15);
                }
            }
        }
        // Draw a thicker center line for Noon (12 PM)
        cardCtx.beginPath();
        cardCtx.moveTo(cardWidth / 2, 0);
        cardCtx.lineTo(cardWidth / 2, cardHeight);
        cardCtx.lineWidth = 2; // Thicker line
        cardCtx.stroke();
        cardCtx.fillText("12", cardWidth / 2, cardHeight / 2 + 15); // Label Noon

        cardCtx.lineWidth = 1; // Reset line width
        lastBurnX = null;      // Reset last burn position for new card
    }

    /**
     * Clears the light ray canvas.
     * This function previously drew the light ray lines.
     * Now it only ensures the canvas is clear, effectively removing the visual ray.
     */
    function drawLightRay() {
        if (!rayCtx || !lightRayCanvas) return; // Safety check
        rayCtx.clearRect(0, 0, lightRayCanvas.width, lightRayCanvas.height);
        // All line drawing and hotspot code has been removed from here.
    }

    /**
     * Updates the sun's position, background gradient, and potentially burns the card.
     */
    function updateSunPosition() {
        if (!timeSlider || !sunElement) return; // Safety check

        const sliderValue = parseInt(timeSlider.value); // Get current slider value (0-120)

        updateBackgroundGradient(sliderValue); // Update sky color

        // Calculate sun's horizontal position (percentage based)
        const sunXPercent = (sliderValue / 120) * 90 + 5; // 5% to 95% to keep it within bounds
        sunElement.style.left = `${sunXPercent}%`;

        // Calculate sun's vertical position (simulating an arc)
        const midPoint = 60; // Slider value for noon
        const deviation = Math.abs(sliderValue - midPoint); // How far from noon
        const sunY = 20 + (deviation / midPoint) * 100; // Arc calculation
        sunElement.style.top = `${sunY}px`;

        // Calculate the focus point on the card based on slider value
        const focusX = (sliderValue / 120) * cardWidth;

        // Burn the card if the sun is shining
        if (isSunShining) {
            burnCard(focusX);
        } else {
            lastBurnX = null; // If sun is hidden, break any continuous burn line
        }
        drawLightRay(); // Call to ensure ray canvas is kept clear
    }

    /**
     * Simulates burning a mark on the recording card.
     * @param {number} x - The x-coordinate on the card where the burn should occur.
     */
    function burnCard(x) {
        if (!cardCtx) return; // Safety check

        const burnY = cardHeight / 2; // Burn occurs in the middle of the card vertically
        cardCtx.fillStyle = '#a0522d';   // Sienna brown for burn mark
        cardCtx.strokeStyle = '#800000'; // Darker brown for burn edge (not used for filled arc)
        cardCtx.lineWidth = 1.5;         // Default line width (not used for filled arc)

        // If there was a previous burn point and it's close to the current one, draw a connecting line
        if (lastBurnX !== null && Math.abs(lastBurnX - x) < (pixelsPerHour / 1.5) ) {
            cardCtx.beginPath();
            cardCtx.moveTo(lastBurnX, burnY);
            cardCtx.lineTo(x, burnY);
            cardCtx.lineWidth = 4.5;         // Thickness of the burn trace
            cardCtx.strokeStyle = '#5a2d0c'; // Darker, solid burn color for the line
            cardCtx.lineCap = 'round';       // Rounded ends for the burn line
            cardCtx.stroke();
        }
        // Otherwise, or if it's a new burn segment, draw a small dot/arc
        else {
            cardCtx.beginPath();
            cardCtx.arc(x, burnY, 3, 0, Math.PI * 2); // Small dot for initial or separated burn
            cardCtx.fillStyle = '#5a2d0c'; // Use the darker burn color for the dot too
            cardCtx.fill();
        }
        lastBurnX = x; // Update the last burn position
    }

    /**
     * Initializes the simulation: draws the card, sets button states, and positions the sun.
     */
    function initialize() {
        // Perform safety checks for essential elements
        if (!cardCanvas || !timeSlider || !toggleSunshineButton || !resetCardButton || !meterContainer || !lightRayCanvas || !sunElement) {
            console.error("Initialization failed: One or more essential DOM elements are missing.");
            // Display a user-friendly message on the page if possible
            if (document.body) {
                 const errorMsg = document.createElement('p');
                 errorMsg.textContent = "Error: The simulation could not be initialized. Please ensure all page elements are loaded correctly.";
                 errorMsg.style.color = "red";
                 errorMsg.style.textAlign = "center";
                 errorMsg.style.fontWeight = "bold";
                 // Try to append it somewhere visible, e.g., before the controls or at the end of body
                 const controlsDiv = document.querySelector('.controls');
                 if (controlsDiv) {
                    controlsDiv.parentNode.insertBefore(errorMsg, controlsDiv);
                 } else {
                    document.body.appendChild(errorMsg);
                 }
            }
            return; // Stop initialization if elements are missing
        }

        drawCardBase();         // Draw the initial state of the recording card
        updateSunshineButton(); // Set the initial state of the sunshine button and sun
        updateSunPosition();    // Set the initial sun position, background, and burn (if applicable)
    }

    // Add event listeners to controls
    if (timeSlider) {
        timeSlider.addEventListener('input', updateSunPosition);
    }

    if (toggleSunshineButton) {
        toggleSunshineButton.addEventListener('click', () => {
            isSunShining = !isSunShining; // Toggle the shining state
            updateSunshineButton();       // Update button and sun appearance
            if (!isSunShining) {
                lastBurnX = null; // Reset last burn X if sun becomes hidden
            }
        });
    }

    if (resetCardButton) {
        resetCardButton.addEventListener('click', () => {
            drawCardBase();   // Redraw the card to clear burns
            drawLightRay();   // Ensure ray canvas is clear after reset
            // Optionally, reset slider to noon and sun to shining:
            // if (timeSlider) timeSlider.value = "60";
            // isSunShining = true;
            // updateSunshineButton();
            // updateSunPosition();
        });
    }
    
    // Handle window resize to keep canvas dimensions correct
    window.addEventListener('resize', () => {
        if (meterContainer && lightRayCanvas) {
            lightRayCanvas.width = meterContainer.clientWidth;
            lightRayCanvas.height = meterContainer.clientHeight;
        }
        // Redraw elements that might depend on relative positions or container size
        drawCardBase(); 
        updateSunPosition(); 
    });

    // Start the simulation
    initialize();
});
