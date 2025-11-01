// Global variables for the simulation state
let currentSimulatedTime = new Date();
// Set a starting time for the simulation (e.g., Midnight)
currentSimulatedTime.setHours(0, 0, 0, 0);

let dailyForecast = []; // Stores the hourly forecast for the day
const FORECAST_INTERVAL_HOURS = 1; // Generate data every hour
const SIMULATION_SPEED_MS = 1000; // 1 second of real time = 1 hour of simulated time (adjust for speed)

// --- Helper Data ---
const weatherConditions = [
    { name: 'Clear', minTemp: 10, maxTemp: 25, variance: 3, transition: 0.1 },
    { name: 'Partly Cloudy', minTemp: 8, maxTemp: 22, variance: 4, transition: 0.2 },
    { name: 'Cloudy', minTemp: 5, maxTemp: 18, variance: 3, transition: 0.3 },
    { name: 'Rain', minTemp: 3, maxTemp: 15, variance: 2, transition: 0.5 },
    { name: 'Thunderstorms', minTemp: 2, maxTemp: 12, variance: 3, transition: 0.7 }
];

/**
 * 🌅 Generates a "realistic" 24-hour weather forecast.
 * It uses a simple Markov chain-like transition to make the weather change smoothly.
 */
function generateDailyForecast() {
    dailyForecast = [];
    let currentCondition = weatherConditions[0]; // Start with 'Clear' or a random condition

    for (let h = 0; h < 24; h += FORECAST_INTERVAL_HOURS) {
        // 1. **Time-Based Temperature Fluctuation:**
        // Temperature is generally lowest near dawn (e.g., hour 6) and highest in the afternoon (e.g., hour 14).
        const timeFactor = 1 - Math.cos((h - 6) / 24 * 2 * Math.PI); // Value between 0 and 2
        const baseTemp = currentCondition.minTemp + (currentCondition.maxTemp - currentCondition.minTemp) * timeFactor / 2;
        
        // Add random variance for realism
        const tempVariance = (Math.random() - 0.5) * currentCondition.variance;
        const temperature = Math.round(baseTemp + tempVariance);

        // 2. **Condition Transition Logic:**
        // The condition has a chance of transitioning based on its 'transition' value.
        if (Math.random() < currentCondition.transition) {
            // Pick a new, slightly different condition (e.g., moving one step up or down in the array)
            const currentIndex = weatherConditions.findIndex(c => c.name === currentCondition.name);
            let newIndex = currentIndex;
            
            // 50/50 chance to go to the next or previous condition in the list
            if (Math.random() > 0.5) {
                newIndex = Math.min(weatherConditions.length - 1, currentIndex + 1);
            } else {
                newIndex = Math.max(0, currentIndex - 1);
            }
            currentCondition = weatherConditions[newIndex];
        }

        dailyForecast.push({
            hour: h,
            condition: currentCondition.name,
            temperature: temperature
        });
    }

    // Display the generated forecast (for debugging/visualization)
    document.getElementById('forecast-output').textContent = JSON.stringify(dailyForecast, null, 2);
    console.log('New daily forecast generated:', dailyForecast);
}

/**
 * 🔄 Runs the main simulation loop.
 * Advances the time and updates the display based on the forecast.
 */
function runSimulation() {
    // 1. Advance Simulated Time
    currentSimulatedTime.setHours(currentSimulatedTime.getHours() + FORECAST_INTERVAL_HOURS);
    
    // Check for "new day" event
    if (currentSimulatedTime.getHours() === 0) {
        console.log("It's midnight! A new day begins. Generating new forecast...");
        // Re-generate the forecast at 00:00:00 to fulfill the "at 23:59:59" concept
        generateDailyForecast();
    }

    // 2. Find the correct forecast data for the current time
    const currentHour = currentSimulatedTime.getHours();
    const weatherData = dailyForecast.find(data => data.hour === currentHour);

    // 3. Update the UI
    if (weatherData) {
        document.getElementById('current-temp').textContent = `${weatherData.temperature}°C`;
        document.getElementById('current-condition').textContent = weatherData.condition;
    }

    // Update the time display
    document.getElementById('current-time').textContent = currentSimulatedTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// --- Initialization and Event Listeners ---

// Generate the initial forecast when the app loads
generateDailyForecast();

// Set up the main simulation loop
setInterval(runSimulation, SIMULATION_SPEED_MS);

// Button to manually trigger a new forecast
document.getElementById('generate-forecast-btn').addEventListener('click', () => {
    // This allows the user to see the forecast being generated, but the simulation
    // will automatically run through the *new* forecast starting from the next hour.
    generateDailyForecast();
});

// A quick visual guide to the Simulation Loop: 
