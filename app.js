// --- 1. CONFIGURATION AND UTILITIES ---

// Map conditions to better symbols (using unicode weather pictograms or similar)
const WEATHER_SYMBOLS = {
    'Sunny': '🔆',
    'Partly Cloudy': '⛅',
    'Mostly Cloudy': '🌥️',
    'Cloudy': '☁️',
    'Rain': '🌧️',
    'Heavy Rain': '⛈️',
    'Sleet': '🌨️',
    'Clear Night': '✨',
    'Light Snow': '❄️',
    'Fog': '🌫️',
    'Thunderstorms': '🌩️'
};

// Define the simulated base weather for the current day
// Time is 10:50 AM in Scarborough, UK (GMT)
const SIMULATED_TODAY_CONFIG = {
    location: 'Scarborough, UK',
    maxTemp: 7, // High of 7°C
    minTemp: -2, // Low of -2°C
    // Define key weather changes throughout the 24 hours for realism
    conditions: [
        // Night/Early Morning (00:00 - 06:00)
        { startHour: 0, endHour: 6, condition: 'Clear Night', tempShift: -2 }, 
        // Morning Rain (06:00 - 11:00)
        { startHour: 6, endHour: 11, condition: 'Rain', tempShift: 1 }, 
        // Clearing (11:00 - 15:00) - Reaching High Temp
        { startHour: 11, endHour: 15, condition: 'Partly Cloudy', tempShift: 3 }, 
        // Cooling Down (15:00 - 18:00)
        { startHour: 15, endHour: 18, condition: 'Mostly Cloudy', tempShift: 0 }, 
        // Sleet/Freezing (18:00 - 24:00)
        { startHour: 18, endHour: 24, condition: 'Sleet', tempShift: -1 } 
    ]
};

// --- 2. DATA GENERATION FUNCTIONS ---

/**
 * Calculates a smooth temperature based on the hour (0-23) using a sine-like curve.
 * Peak temp around 14:00 (2 PM), low temp around 03:00 (3 AM).
 * @param {number} hour - The hour (0-23).
 * @param {number} maxTemp - The daily high temperature.
 * @param {number} minTemp - The daily low temperature.
 * @returns {number} The calculated temperature.
 */
function calculateTemp(hour, maxTemp, minTemp) {
    // Shift the hour so the low point is at hour 3 and the high point is at hour 14
    const offsetHour = (hour - 3 + 24) % 24; 
    const amplitude = (maxTemp - minTemp) / 2;
    const midpoint = (maxTemp + minTemp) / 2;
    // Use a sine wave to simulate the temperature curve
    const temp = midpoint + amplitude * Math.sin((offsetHour - 5.5) * (2 * Math.PI / 24));
    return Math.round(temp);
}

/**
 * Gets the simulated condition and temperature for a specific hour.
 * @param {number} hour - The hour (0-23).
 * @returns {{temp: number, condition: string, icon: string}}
 */
function getWeatherForHour(hour) {
    const { maxTemp, minTemp, conditions } = SIMULATED_TODAY_CONFIG;
    
    // Find the current condition block
    const currentConditionBlock = conditions.find(c => hour >= c.startHour && hour < c.endHour) || conditions[0];
    
    // Calculate base temperature smoothly
    let temp = calculateTemp(hour, maxTemp, minTemp);

    // Apply specific shift for the condition block (e.g., rain suppresses temp)
    temp += currentConditionBlock.tempShift;

    return {
        temp: temp,
        condition: currentConditionBlock.condition,
        icon: WEATHER_SYMBOLS[currentConditionBlock.condition]
    };
}


function generateHourlyForecast() {
    const forecast = [];
    const now = new Date();
    let currentHour = now.getHours();
    
    // Generate the next 10 hours for a better view
    for (let i = 0; i < 10; i++) {
        const hourToProcess = (currentHour + i) % 24;
        const data = getWeatherForHour(hourToProcess);
        
        const timeLabel = (hourToProcess % 12 === 0 ? 12 : hourToProcess % 12) + (hourToProcess >= 12 && hourToProcess !== 24 ? ' PM' : ' AM');
        
        forecast.push({
            time: (i === 0 ? 'Now' : timeLabel),
            temp: data.temp,
            condition: data.condition,
            icon: data.icon
        });
    }
    return forecast;
}

function generateDailyForecast() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const forecast = [];
    const todayIndex = new Date().getDay();

    // --- Low Front Simulation Logic ---
    // Start with Today's base temps
    let maxBase = SIMULATED_TODAY_CONFIG.maxTemp;
    let minBase = SIMULATED_TODAY_CONFIG.minTemp;

    for (let i = 0; i < 7; i++) {
        const dayIndex = (todayIndex + i) % 7;
        
        let condition, max, min;

        if (i === 0) {
            // Today's forecast uses the exact configuration
            max = maxBase;
            min = minBase;
            condition = getWeatherForHour(new Date().getHours()).condition;
        } else if (i >= 1 && i <= 3) {
            // Days 1-3: Low front moves in - gets cooler and wetter
            max = maxBase - (i * 2); 
            min = minBase - (i * 1);
            condition = i === 1 ? 'Rain' : 'Heavy Rain';
        } else if (i === 4) {
            // Day 4: Peak Cold/Wet - possible snow/sleet at low temps
            max = maxBase - 6; 
            min = minBase - 4;
            condition = min < 0 ? 'Sleet' : 'Rain';
        } else {
            // Days 5-6: Front passes, temperatures slowly return
            max = maxBase - 3 + (i - 5);
            min = minBase - 1 + (i - 5);
            condition = 'Partly Cloudy';
        }

        // Ensure temp is not below a reasonable minimum
        max = Math.max(max, -5); 
        min = Math.max(min, -10);

        forecast.push({
            day: i === 0 ? 'Today' : days[dayIndex],
            max: Math.round(max),
            min: Math.round(min),
            condition: condition,
            icon: WEATHER_SYMBOLS[condition]
        });
    }
    return forecast;
}


// --- 3. RENDERING FUNCTIONS ---

/**
 * Updates the current time every second without causing reflow disruption.
 */
function updateCurrentTime() {
    const now = new Date();
    // Use an efficient time formatting for the high-frequency update
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const dateString = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    
    document.getElementById('current-time').textContent = `${dateString} | ${timeString}`;
}

function renderCurrentWeather() {
    // Determine current hour's specific weather using the generator
    const now = new Date();
    const currentHourData = getWeatherForHour(now.getHours());

    document.getElementById('current-location').textContent = SIMULATED_TODAY_CONFIG.location;
    document.getElementById('current-temp').textContent = `${currentHourData.temp}°C`;
    document.getElementById('current-condition').innerHTML = `<span class="icon">${currentHourData.icon}</span> ${currentHourData.condition}`;
}

function renderHourlyForecast(hourly) {
    const hourlyList = document.getElementById('hourly-list');
    hourlyList.innerHTML = ''; 

    hourly.forEach(hour => {
        const item = document.createElement('div');
        item.className = 'forecast-item';
        item.innerHTML = `
            <div class="time">${hour.time}</div>
            <div class="icon">${hour.icon}</div>
            <div class="temp">${hour.temp}°C</div>
            <div class="condition">${hour.condition}</div>
        `;
        hourlyList.appendChild(item);
    });
}

function renderDailyForecast(daily) {
    const dailyList = document.getElementById('daily-list');
    dailyList.innerHTML = '';

    daily.forEach(day => {
        const item = document.createElement('div');
        item.className = 'forecast-item';
        item.innerHTML = `
            <div class="day">${day.day}</div>
            <div class="icon">${day.icon}</div>
            <div class="condition">${day.condition}</div>
            <div class="temp">${day.max}°/${day.min}°C</div>
        `;
        dailyList.appendChild(item);
    });
}


// --- 4. SERVICE WORKER REGISTRATION (Same as before) ---
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
                console.error('ServiceWorker registration failed: ', err);
            });
        });
    }
}

// --- 5. INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Render all weather data
    const hourlyData = generateHourlyForecast();
    const dailyData = generateDailyForecast();
    
    renderCurrentWeather();
    renderHourlyForecast(hourlyData);
    renderDailyForecast(dailyData);
    
    // 2. High-frequency Time Update (every 1000ms)
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000); 

    // 3. Register the PWA Service Worker
    registerServiceWorker();
});
