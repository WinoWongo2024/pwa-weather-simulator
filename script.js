// Global variables for the simulation state
let dailyForecast = []; // Stores the hourly forecast for the day
const FORECAST_INTERVAL_HOURS = 1; // Data points generated every hour
// The simulation runs on a REAL-TIME clock, but we use the forecast to get the data
const UPDATE_INTERVAL_MS = 1000; // Update the UI every second

// --- Helper Data and Functions ---
const weatherConditions = [
    { name: 'Clear', icon: '☀️', minTemp: 10, maxTemp: 25, variance: 3, transition: 0.1 },
    { name: 'Partly Cloudy', icon: '🌤️', minTemp: 8, maxTemp: 22, variance: 4, transition: 0.2 },
    { name: 'Cloudy', icon: '☁️', minTemp: 5, maxTemp: 18, variance: 3, transition: 0.3 },
    { name: 'Rain', icon: '🌧️', minTemp: 3, maxTemp: 15, variance: 2, transition: 0.5 },
    { name: 'Thunderstorms', icon: '⛈️', minTemp: 2, maxTemp: 12, variance: 3, transition: 0.7 }
];

/**
 * 📏 Linear Interpolation (Lerp) function.
 * Calculates a value between 'a' and 'b' at a specific fraction 't' (0.0 to 1.0).
 * This makes the temperature transition smoothly *between* the hourly data points.
 */
const lerp = (a, b, t) => a * (1 - t) + b * t;

/**
 * 🌅 Generates a "realistic" 24-hour weather forecast.
 * (Logic is similar to before, but we call renderForecast after generation).
 */
function generateDailyForecast() {
    dailyForecast = [];
    let currentCondition = weatherConditions[0]; // Start with 'Clear' or a random condition

    for (let h = 0; h <= 24; h += FORECAST_INTERVAL_HOURS) {
        // Temperature Fluctuation based on time (peaking in the afternoon)
        const timeFactor = 1 - Math.cos((h - 6) / 24 * 2 * Math.PI); 
        const baseTemp = currentCondition.minTemp + (currentCondition.maxTemp - currentCondition.minTemp) * timeFactor / 2;
        
        // Add random variance
        const tempVariance = (Math.random() - 0.5) * currentCondition.variance;
        const temperature = Math.round(baseTemp + tempVariance);
        
        // Condition Transition Logic (Only transition on full hours for simplicity)
        if (h < 24 && Math.random() < currentCondition.transition) {
            const currentIndex = weatherConditions.findIndex(c => c.name === currentCondition.name);
            let newIndex = currentIndex;
            
            // Randomly move to a neighboring condition
            if (Math.random() > 0.5) {
                newIndex = Math.min(weatherConditions.length - 1, currentIndex + 1);
            } else {
                newIndex = Math.max(0, currentIndex - 1);
            }
            currentCondition = weatherConditions[newIndex];
        }

        dailyForecast.push({
            hour: h % 24, // Use modulo for hour 24
            condition: currentCondition.name,
            icon: currentCondition.icon,
            temperature: temperature
        });
    }

    // Crucial: Store the forecast so a page reload doesn't wipe it out
    localStorage.setItem('dailyForecast', JSON.stringify(dailyForecast));
    
    renderForecast(); // Display the new forecast
    console.log('New daily forecast generated and stored.');
}


/**
 * 📈 Renders the 24-hour forecast data to the UI visually.
 */
function renderForecast() {
    const container = document.getElementById('hourly-forecast-container');
    container.innerHTML = ''; // Clear previous data

    dailyForecast.forEach(data => {
        const item = document.createElement('div');
        item.classList.add('forecast-item');
        
        // Format the hour: 0 = 12 AM, 12 = 12 PM
        const hour = data.hour;
        const displayTime = hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;

        item.innerHTML = `
            <small class="time">${displayTime}</small>
            <span class="icon">${data.icon}</span>
            <span class="temp">${data.temperature}°C</span>
        `;
        container.appendChild(item);
    });
}

/**
 * 🔄 Runs the main simulation loop on a real-time interval.
 * Uses Lerp to smooth the transition between the hourly forecast data.
 */
function runSimulation() {
    // 1. Get the real current time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    
    // Update the real time display
    document.getElementById('current-time').textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 2. **Find Data Points for Interpolation (Lerp)**
    // We need the data for the *current* hour and the *next* hour.
    const currentHourData = dailyForecast.find(data => data.hour === currentHour);
    const nextHour = (currentHour + 1) % 24; // Handle wrap-around at midnight
    const nextHourData = dailyForecast.find(data => data.hour === nextHour);

    if (currentHourData && nextHourData) {
        // Calculate the fraction (t) for Lerp: percentage of the way through the current hour
        // (minutes * 60 + seconds) / 3600 (seconds in an hour)
        const t = (currentMinute * 60 + currentSecond) / 3600;

        // **A. Interpolate Temperature (Lerp)**
        const interpolatedTemp = lerp(currentHourData.temperature, nextHourData.temperature, t);
        
        // **B. Condition Transition**
        // The condition changes sharply on the hour, but temperature is smooth.
        const currentConditionName = currentHourData.condition;
        
        // 3. Update the UI
        document.getElementById('current-temp').textContent = `${Math.round(interpolatedTemp)}°C`;
        document.getElementById('current-condition').textContent = `${currentHourData.icon} ${currentConditionName}`;
    }

    // 4. Check for New Day / Forecast Generation Event
    // When the time hits 23:59:59, we trigger the forecast generation for the new day.
    if (currentHour === 23 && currentMinute === 59 && currentSecond === 59) {
        console.log("It's 23:59:59! Generating new forecast for tomorrow.");
        // This will be ready precisely at 00:00:00
        generateDailyForecast(); 
    }
}

/**
 * 🔄 Clears PWA Caches and Reloads the page, but NOT the forecast.
 */
function clearCacheAndReload() {
    if ('caches' in window) {
        // Clear all caches managed by the Service Worker
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                return caches.delete(key);
            }));
        }).then(() => {
            console.log('Caches cleared. Reloading page...');
            window.location.reload();
        }).catch(err => {
            console.error('Failed to clear caches:', err);
            window.location.reload(); // Reload even if clearing failed
        });
    } else {
        window.location.reload(true); // Fallback for browsers without cache API
    }
}

// --- Initialization and Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Try to load existing forecast from local storage
    const storedForecast = localStorage.getItem('dailyForecast');
    if (storedForecast) {
        dailyForecast = JSON.parse(storedForecast);
        console.log('Loaded forecast from storage.');
    } else {
        // If no forecast, generate one
        generateDailyForecast();
    }
    
    // Set up the main simulation loop
    // Runs every second, driving the smooth Lerp transition
    setInterval(runSimulation, UPDATE_INTERVAL_MS);

    // Button to manually trigger a new forecast
    document.getElementById('generate-forecast-btn').addEventListener('click', generateDailyForecast);

    // Button to clear cache and reload
    document.getElementById('refresh-cache-btn').addEventListener('click', clearCacheAndReload);

    // Initial run to populate the UI immediately
    runSimulation();
    renderForecast();
});

