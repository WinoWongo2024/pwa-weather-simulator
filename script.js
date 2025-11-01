// Global variables for the simulation state
let dailyForecast = []; // Stores the hourly forecast for the day
const FORECAST_INTERVAL_HOURS = 1; // Data points generated every hour
const UPDATE_INTERVAL_MS = 1000; // Update the UI every second (Real-Time clock)
const FORECAST_STORAGE_KEY = 'dailyForecastV2'; 
let tempChart = null; // Global reference for the Chart.js instance

// --- Helper Data ---
const weatherConditions = [
    { name: 'Clear', icon: '☀️', minTemp: 15, maxTemp: 28, variance: 3, minHumidity: 30, maxHumidity: 60, maxWind: 10, transition: 0.1 },
    { name: 'Partly Cloudy', icon: '🌤️', minTemp: 10, maxTemp: 25, variance: 4, minHumidity: 40, maxHumidity: 70, maxWind: 15, transition: 0.2 },
    { name: 'Cloudy', icon: '☁️', minTemp: 5, maxTemp: 18, variance: 3, minHumidity: 50, maxHumidity: 85, maxWind: 20, transition: 0.3 },
    { name: 'Light Rain', icon: '☔', minTemp: 3, maxTemp: 15, variance: 2, minHumidity: 70, maxHumidity: 90, maxWind: 25, transition: 0.4 },
    { name: 'Heavy Rain', icon: '🌧️', minTemp: 2, maxTemp: 12, variance: 3, minHumidity: 85, maxHumidity: 98, maxWind: 35, transition: 0.5 },
    { name: 'Thunderstorms', icon: '⛈️', minTemp: 2, maxTemp: 12, variance: 3, minHumidity: 75, maxHumidity: 95, maxWind: 45, transition: 0.7 }
];

const windDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// --- Utility Functions ---

/**
 * 📏 Linear Interpolation (Lerp) function.
 * Calculates a value between 'a' and 'b' at a specific fraction 't' (0.0 to 1.0).
 */
const lerp = (a, b, t) => a * (1 - t) + b * t;

/**
 * 🎲 Generates a random integer within a range.
 */
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- Core Simulation Functions ---

/**
 * 🌅 Generates a "realistic" 24-hour weather forecast.
 */
function generateDailyForecast() {
    dailyForecast = [];
    let currentCondition = weatherConditions[getRandomInt(0, weatherConditions.length - 1)]; 
    let currentWindDirIndex = getRandomInt(0, windDirections.length - 1); 

    for (let h = 0; h <= 24; h += FORECAST_INTERVAL_HOURS) {
        // Temperature Calculation
        const timeFactor = 1 - Math.cos((h - 6) / 24 * 2 * Math.PI); 
        const baseTemp = currentCondition.minTemp + (currentCondition.maxTemp - currentCondition.minTemp) * timeFactor / 2;
        const tempVariance = (Math.random() - 0.5) * currentCondition.variance;
        const temperature = Math.round(baseTemp + tempVariance);

        // Humidity & Wind Speed Generation
        const baseHumidity = getRandomInt(currentCondition.minHumidity, currentCondition.maxHumidity);
        const humidity = Math.min(100, baseHumidity + getRandomInt(-5, 5));
        const windSpeed = getRandomInt(5, currentCondition.maxWind);
        
        // Wind Direction Transition
        if (Math.random() < 0.2) { 
            currentWindDirIndex = (currentWindDirIndex + (Math.random() > 0.5 ? 1 : -1) + windDirections.length) % windDirections.length;
        }
        const windDirection = windDirections[currentWindDirIndex];

        // Condition Transition Logic
        if (h < 24 && Math.random() < currentCondition.transition) {
            const currentIndex = weatherConditions.findIndex(c => c.name === currentCondition.name);
            let newIndex = currentIndex;
            if (Math.random() > 0.5) {
                newIndex = Math.min(weatherConditions.length - 1, currentIndex + 1);
            } else {
                newIndex = Math.max(0, currentIndex - 1);
            }
            currentCondition = weatherConditions[newIndex];
        }

        dailyForecast.push({
            hour: h % 24,
            condition: currentCondition.name,
            icon: currentCondition.icon,
            temperature: temperature,
            humidity: humidity,
            windSpeed: windSpeed,
            windDirection: windDirection
        });
    }

    // Store the forecast for persistence
    localStorage.setItem(FORECAST_STORAGE_KEY, JSON.stringify(dailyForecast));
    
    renderForecast(); 
    renderGraphs();
    console.log('New daily forecast generated and stored.');
}

/**
 * 🔄 Runs the main simulation loop on a real-time interval, using Lerp for smooth data.
 */
function runSimulation() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    
    // Update the real time display
    document.getElementById('current-time').textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Calculate fraction (t) for Lerp: percentage of the way through the current hour
    const t = (currentMinute * 60 + currentSecond) / 3600;

    const currentHourData = dailyForecast.find(data => data.hour === currentHour);
    const nextHour = (currentHour + 1) % 24; 
    const nextHourData = dailyForecast.find(data => data.hour === nextHour);

    if (currentHourData && nextHourData) {
        // --- Interpolation for Smoothness (Temperature, Humidity, Wind Speed) ---
        const interpolatedTemp = lerp(currentHourData.temperature, nextHourData.temperature, t);
        const interpolatedHumidity = lerp(currentHourData.humidity, nextHourData.humidity, t);
        const interpolatedWindSpeed = lerp(currentHourData.windSpeed, nextHourData.windSpeed, t);
        
        // --- Update UI ---
        document.getElementById('current-temp').textContent = `${Math.round(interpolatedTemp)}°C`;
        document.getElementById('current-condition').innerHTML = `${currentHourData.icon} ${currentHourData.condition}`;
        
        document.getElementById('current-humidity').textContent = `${Math.round(interpolatedHumidity)}%`;
        document.getElementById('current-wind').textContent = `${Math.round(interpolatedWindSpeed)} km/h ${currentHourData.windDirection}`;
        
        // Update visual enhancements
        updateVisuals(currentHourData.condition); 
        
        // Update the dynamic hourly forecast view (to scroll/move)
        renderForecast();

    }

    // New Day / Forecast Generation Event (at 23:59:59)
    if (currentHour === 23 && currentMinute === 59 && currentSecond === 59) {
        console.log("It's 23:59:59! Generating new forecast for tomorrow.");
        generateDailyForecast(); 
    }
}

// --- Display Functions ---

/**
 * 📈 Renders the hourly forecast starting from the current hour.
 */
function renderForecast() {
    const container = document.getElementById('hourly-forecast-container');
    container.innerHTML = ''; 

    const currentHour = new Date().getHours();
    
    // Find the starting index (the current hour)
    const startIndex = dailyForecast.findIndex(data => data.hour === currentHour);
    
    if (startIndex === -1) return;

    // Create a forecast array that wraps around the 24-hour cycle
    const dynamicForecast = [];
    for (let i = 0; i < 24; i++) {
        const dataIndex = (startIndex + i) % 24;
        dynamicForecast.push(dailyForecast[dataIndex]);
    }
    
    // Render the next 24 hours of data
    dynamicForecast.forEach((data, index) => {
        const item = document.createElement('div');
        item.classList.add('forecast-item');
        
        const hour = data.hour;
        const displayTime = index === 0 ? 'NOW' : hour === 12 ? '12 PM' : hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;

        item.innerHTML = `
            <small class="time">${displayTime}</small>
            <span class="icon">${data.icon}</span>
            <span class="temp">${data.temperature}°C</span>
        `;
        container.appendChild(item);
    });
}


/**
 * 📊 Initializes and updates the Chart.js graph for the 24-hour temperature trend.
 */
function renderGraphs() {
    const ctx = document.getElementById('temp-chart').getContext('2d');

    const labels = dailyForecast.map(data => {
        const h = data.hour;
        return h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`;
    });
    const temperatures = dailyForecast.map(data => data.temperature);
    
    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Temperature (°C)',
            data: temperatures,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.4, 
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 6
        }]
    };
    
    if (tempChart) {
        tempChart.data = chartData;
        tempChart.update();
    } else {
        tempChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: { display: true, text: 'Temperature (°C)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

/**
 * 🎨 Updates the background color/gradient based on the current condition.
 */
function updateVisuals(condition) {
    let style = '';
    
    if (condition.includes('Clear')) {
        style = 'linear-gradient(to top, #89cff0, #5dade2)'; 
    } else if (condition.includes('Partly Cloudy')) {
         style = 'linear-gradient(to top, #cce0ff, #89cff0)'; // Light blue to pale blue
    } else if (condition.includes('Cloudy')) {
        style = 'linear-gradient(to top, #bdc3c7, #95a5a6)'; 
    } else if (condition.includes('Rain')) {
        style = 'linear-gradient(to top, #7f8c8d, #34495e)'; 
    } else if (condition.includes('Thunderstorms')) {
        style = 'linear-gradient(to top, #34495e, #2c3e50)'; 
    } else {
        style = 'linear-gradient(to top, #f0f4f8, #cce0ff)'; 
    }
    
    document.body.style.backgroundImage = style;
}


/**
 * 🔄 Clears PWA Caches and Reloads the page, but NOT the forecast (which is in localStorage).
 */
function clearCacheAndReload() {
    if ('caches' in window) {
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                return caches.delete(key);
            }));
        }).then(() => {
            console.log('Caches cleared. Reloading page...');
            window.location.reload();
        }).catch(err => {
            console.error('Failed to clear caches:', err);
            window.location.reload(); 
        });
    } else {
        window.location.reload(true); 
    }
}

// --- Initialization and Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Load forecast or generate a new one
    const storedForecast = localStorage.getItem(FORECAST_STORAGE_KEY);
    if (storedForecast) {
        dailyForecast = JSON.parse(storedForecast);
        console.log('Loaded forecast from storage.');
    } else {
        generateDailyForecast();
    }
    
    // Initialize the chart and visuals immediately
    renderGraphs();
    
    // Set up the main simulation loop
    setInterval(runSimulation, UPDATE_INTERVAL_MS);

    // Button event listeners
    document.getElementById('generate-forecast-btn').addEventListener('click', generateDailyForecast);
    document.getElementById('refresh-cache-btn').addEventListener('click', clearCacheAndReload);

    // Initial run to populate the UI immediately
    runSimulation();
});
