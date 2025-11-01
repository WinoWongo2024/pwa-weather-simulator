// Global variables for the simulation state
let dailyForecast = [];
let fiveDayForecast = [];
let activeWarnings = [];

const FORECAST_INTERVAL_HOURS = 1; 
const UPDATE_INTERVAL_MS = 1000; 
const FORECAST_STORAGE_KEY = 'dailyForecastV3'; // Updated key for new data model
let tempChart = null; 

// --- Simulation Constants and Data ---
const GLOBAL_MAX_TEMP = 16;
const GLOBAL_MIN_TEMP = -4;
const COLD_FRONT_CHANCE = 0.65;
const WARM_FRONT_CHANCE = 0.35;

const weatherConditions = [
    { name: 'Clear', icon: '☀️', minTemp: 10, maxTemp: 16, variance: 3, minHumidity: 30, maxHumidity: 60, maxWind: 10, transition: 0.1, precipitation: false },
    { name: 'Partly Cloudy', icon: '🌤️', minTemp: 8, maxTemp: 15, variance: 4, minHumidity: 40, maxHumidity: 70, maxWind: 15, transition: 0.2, precipitation: false },
    { name: 'Cloudy', icon: '☁️', minTemp: 5, maxTemp: 13, variance: 3, minHumidity: 50, maxHumidity: 85, maxWind: 20, transition: 0.3, precipitation: false },
    { name: 'Fog', icon: '🌫️', minTemp: 0, maxTemp: 8, variance: 2, minHumidity: 90, maxHumidity: 100, maxWind: 5, transition: 0.3, precipitation: false },
    { name: 'Light Rain', icon: '☔', minTemp: 3, maxTemp: 12, variance: 2, minHumidity: 70, maxHumidity: 90, maxWind: 25, transition: 0.4, precipitation: true },
    { name: 'Heavy Rain', icon: '🌧️', minTemp: 2, maxTemp: 10, variance: 3, minHumidity: 85, maxHumidity: 98, maxWind: 35, transition: 0.5, precipitation: true },
    { name: 'Light Snow', icon: '🌨️', minTemp: -4, maxTemp: 4, variance: 2, minHumidity: 60, maxHumidity: 95, maxWind: 15, transition: 0.4, precipitation: true },
    { name: 'Heavy Snow', icon: '❄️', minTemp: -4, maxTemp: 1, variance: 3, minHumidity: 75, maxHumidity: 100, maxWind: 25, transition: 0.5, precipitation: true },
    { name: 'Hail', icon: '🧊', minTemp: 0, maxTemp: 8, variance: 3, minHumidity: 80, maxHumidity: 95, maxWind: 40, transition: 0.6, precipitation: true },
    { name: 'Thunderstorms', icon: '⛈️', minTemp: 2, maxTemp: 12, variance: 3, minHumidity: 75, maxHumidity: 95, maxWind: 45, transition: 0.7, precipitation: true }
];

const windDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// --- Utility Functions ---
const lerp = (a, b, t) => a * (1 - t) + b * t;
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- Core Simulation Functions ---

function generateDailyForecast() {
    dailyForecast = [];
    
    // Determine the Weather Front for the Day
    const isColdFront = Math.random() < COLD_FRONT_CHANCE;
    const frontType = isColdFront ? 'Cold Front' : 'Warm Front';
    
    let currentCondition = weatherConditions[getRandomInt(0, 2)]; // Start with non-extreme
    let currentWindDirIndex = getRandomInt(0, windDirections.length - 1); 

    for (let h = 0; h <= 24; h += FORECAST_INTERVAL_HOURS) {
        
        // 1. Temperature Calculation (with global constraints)
        const timeFactor = 1 - Math.cos((h - 6) / 24 * 2 * Math.PI); 
        const baseTemp = currentCondition.minTemp + (currentCondition.maxTemp - currentCondition.minTemp) * timeFactor / 2;
        const tempVariance = (Math.random() - 0.5) * currentCondition.variance;
        let temperature = Math.round(baseTemp + tempVariance);
        temperature = Math.max(GLOBAL_MIN_TEMP, Math.min(GLOBAL_MAX_TEMP, temperature)); // CLAMPING

        // 2. Humidity & Wind Speed Generation
        const baseHumidity = getRandomInt(currentCondition.minHumidity, currentCondition.maxHumidity);
        const humidity = Math.min(100, baseHumidity + getRandomInt(-5, 5));
        const windSpeed = getRandomInt(5, currentCondition.maxWind);
        
        // 3. Wind Direction Transition
        if (Math.random() < 0.2) { 
            currentWindDirIndex = (currentWindDirIndex + (Math.random() > 0.5 ? 1 : -1) + windDirections.length) % windDirections.length;
        }
        const windDirection = windDirections[currentWindDirIndex];

        // 4. Condition Transition Logic (Influenced by Weather Front)
        if (h < 24 && Math.random() < currentCondition.transition) {
            let currentIndex = weatherConditions.findIndex(c => c.name === currentCondition.name);
            let newIndex = currentIndex;
            
            if (isColdFront) {
                // Cold Fronts: sharp changes, bias towards extremes (higher index)
                newIndex = Math.min(weatherConditions.length - 1, currentIndex + getRandomInt(0, 2));
            } else { 
                // Warm Fronts: steady, bias towards middle index (rain, cloud)
                // Note: Index 3 is Light Rain, Index 2 is Cloudy
                newIndex = Math.max(2, Math.min(weatherConditions.length - 1, currentIndex + getRandomInt(-1, 1)));
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

    // After generation, update 5-day forecast and warnings
    generateFiveDayForecast(frontType);
    
    localStorage.setItem(FORECAST_STORAGE_KEY, JSON.stringify(dailyForecast));
    
    renderForecast(); 
    renderGraphs();
    console.log(`New daily forecast generated. Front: ${frontType}`);
}


function generateFiveDayForecast(frontType) {
    fiveDayForecast = [];
    const todayData = dailyForecast;

    for (let i = 0; i < 5; i++) {
        const temps = todayData.map(d => d.temperature + getRandomInt(-2, 2) * i); // Temperature gets more varied days out
        const dailyMax = Math.min(GLOBAL_MAX_TEMP, Math.max(...temps));
        const dailyMin = Math.max(GLOBAL_MIN_TEMP, Math.min(...temps));
        
        // Find the condition that appears most often (simple proxy)
        const conditionCounts = todayData.reduce((acc, data) => {
            acc[data.icon] = (acc[data.icon] || 0) + 1;
            return acc;
        }, {});
        
        // Use a random condition from the top 3 most frequent
        const sortedIcons = Object.entries(conditionCounts).sort(([,a], [,b]) => b - a);
        const avgIcon = sortedIcons[getRandomInt(0, Math.min(2, sortedIcons.length - 1))][0];

        fiveDayForecast.push({
            day: i,
            date: new Date(new Date().setDate(new Date().getDate() + i)),
            maxTemp: dailyMax,
            minTemp: dailyMin,
            icon: avgIcon
        });
    }

    generateWeatherWarnings(frontType);
    renderFiveDayForecast();
}

function generateWeatherWarnings(frontType) {
    activeWarnings = [];
    
    fiveDayForecast.forEach(day => {
        if (day.maxTemp >= GLOBAL_MAX_TEMP - 1) { 
            activeWarnings.push({ day: day.day, text: 'HEAT ADVISORY: Temperatures near max tolerance.' });
        }
        if (day.minTemp <= GLOBAL_MIN_TEMP + 1) { 
            activeWarnings.push({ day: day.day, text: 'WINTER CHILL: Danger of freezing conditions.' });
        }
    });

    // Check for severe precipitation in today's forecast
    const hasSeverePrecip = dailyForecast.some(d => d.name.includes('Heavy') || d.name === 'Hail' || d.name === 'Thunderstorms');
    if (hasSeverePrecip && !activeWarnings.some(w => w.text.includes('SEVERE'))) {
         activeWarnings.push({ day: 0, text: 'SEVERE WEATHER: Risk of heavy precipitation/storms today.' });
    }
    
    // Add the weather front as a general warning/info
    activeWarnings.unshift({ day: 0, text: `WEATHER FRONT: Today is dominated by a ${frontType}.` });
    
    renderWarnings(); 
}

function runSimulation() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    
    document.getElementById('current-time').textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const t = (currentMinute * 60 + currentSecond) / 3600;

    const currentHourData = dailyForecast.find(data => data.hour === currentHour);
    const nextHour = (currentHour + 1) % 24; 
    const nextHourData = dailyForecast.find(data => data.hour === nextHour);

    if (currentHourData && nextHourData) {
        // --- Interpolation (Lerp) for Smoothness ---
        const interpolatedTemp = lerp(currentHourData.temperature, nextHourData.temperature, t);
        const interpolatedHumidity = lerp(currentHourData.humidity, nextHourData.humidity, t);
        const interpolatedWindSpeed = lerp(currentHourData.windSpeed, nextHourData.windSpeed, t);
        
        // --- Update UI ---
        document.getElementById('current-temp').textContent = `${Math.round(interpolatedTemp)}°C`;
        document.getElementById('current-condition').innerHTML = `${currentHourData.icon} ${currentHourData.condition}`;
        
        document.getElementById('current-humidity').textContent = `${Math.round(interpolatedHumidity)}%`;
        document.getElementById('current-wind').textContent = `${Math.round(interpolatedWindSpeed)} km/h ${currentHourData.windDirection}`;
        
        updateVisuals(currentHourData.condition); 
        renderAnimations(currentHourData.condition); // NEW: Render the animation effects
        renderForecast();

    }

    // New Day / Forecast Generation Event (at 23:59:59)
    if (currentHour === 23 && currentMinute === 59 && currentSecond === 59) {
        generateDailyForecast(); 
    }
}

// --- Display Functions ---

function renderAnimations(condition) {
    const layer = document.getElementById('weather-animation-layer');
    layer.innerHTML = ''; 

    // Basic Cloud Animation (Applies to most non-clear weather)
    if (condition.includes('Cloudy') || condition.includes('Rain') || condition.includes('Thunderstorms') || condition.includes('Snow') || condition.includes('Hail') || condition.includes('Fog')) {
        layer.innerHTML += '<div class="cloud-group"><div class="cloud cloud1"></div><div class="cloud cloud2"></div></div>';
    }
    
    // Rain Animation
    if (condition.includes('Rain') || condition.includes('Thunderstorms') || condition.includes('Hail')) {
        for (let i = 0; i < 100; i++) {
            const drop = document.createElement('div');
            drop.classList.add('rain-drop');
            drop.style.left = `${Math.random() * 100}vw`;
            drop.style.animationDuration = `${0.5 + Math.random() * 1}s`;
            drop.style.opacity = `${0.5 + Math.random() * 0.5}`;
            layer.appendChild(drop);
        }
    }
    
    // Snow Animation
    if (condition.includes('Snow')) {
        for (let i = 0; i < 50; i++) {
            const flake = document.createElement('div');
            flake.classList.add('snow-flake');
            flake.style.left = `${Math.random() * 100}vw`;
            flake.style.animationDuration = `${5 + Math.random() * 10}s`;
            flake.style.animationDelay = `-${Math.random() * 5}s`;
            layer.appendChild(flake);
        }
    }
}

function renderForecast() {
    // Renders the hourly forecast starting from the current hour. (Logic unchanged)
    const container = document.getElementById('hourly-forecast-container');
    container.innerHTML = ''; 

    const currentHour = new Date().getHours();
    
    const startIndex = dailyForecast.findIndex(data => data.hour === currentHour);
    if (startIndex === -1) return;

    const dynamicForecast = [];
    for (let i = 0; i < 24; i++) {
        const dataIndex = (startIndex + i) % 24;
        dynamicForecast.push(dailyForecast[dataIndex]);
    }
    
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

function renderFiveDayForecast() {
    const container = document.getElementById('five-day-forecast-container');
    container.innerHTML = '';
    
    const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

    fiveDayForecast.forEach((dayData, index) => {
        const item = document.createElement('div');
        item.classList.add('day-item');
        
        const dayLabel = index === 0 ? 'Today' : formatter.format(dayData.date);
        
        item.innerHTML = `
            <small class="day-label">${dayLabel}</small>
            <span class="day-icon">${dayData.icon}</span>
            <div class="day-temp">
                <span class="max-temp">${dayData.maxTemp}°</span>
                <span class="min-temp">${dayData.minTemp}°</span>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderWarnings() {
    const list = document.getElementById('active-warnings-list');
    list.innerHTML = '';
    
    if (activeWarnings.length === 0) {
        list.innerHTML = '<li>No active warnings.</li>';
        return;
    }
    
    activeWarnings.forEach(warning => {
        const item = document.createElement('li');
        item.textContent = warning.text;
        list.appendChild(item);
    });
}

function renderGraphs() {
    // Initializes and updates the Chart.js graph (Logic largely unchanged)
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

function updateVisuals(condition) {
    let style = '';
    
    if (condition.includes('Clear')) {
        style = 'linear-gradient(to top, #89cff0, #5dade2)'; 
    } else if (condition.includes('Partly Cloudy')) {
         style = 'linear-gradient(to top, #cce0ff, #89cff0)'; 
    } else if (condition.includes('Cloudy') || condition.includes('Fog')) {
        style = 'linear-gradient(to top, #bdc3c7, #95a5a6)'; 
    } else if (condition.includes('Rain') || condition.includes('Hail')) {
        style = 'linear-gradient(to top, #7f8c8d, #34495e)'; 
    } else if (condition.includes('Snow')) {
        style = 'linear-gradient(to top, #e0f2f1, #b2dfdb)'; // Light blue/green for cold/snow
    } else if (condition.includes('Thunderstorms')) {
        style = 'linear-gradient(to top, #34495e, #2c3e50)'; 
    } else {
        style = 'linear-gradient(to top, #f0f4f8, #cce0ff)'; 
    }
    
    document.body.style.backgroundImage = style;
}

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
        
        // Re-generate 5-day view and warnings on load to reflect current dates
        const frontType = Math.random() < COLD_FRONT_CHANCE ? 'Cold Front' : 'Warm Front';
        generateFiveDayForecast(frontType);
    } else {
        generateDailyForecast();
    }
    
    renderGraphs();
    
    setInterval(runSimulation, UPDATE_INTERVAL_MS);

    document.getElementById('generate-forecast-btn').addEventListener('click', generateDailyForecast);
    document.getElementById('refresh-cache-btn').addEventListener('click', clearCacheAndReload);

    runSimulation();
});
