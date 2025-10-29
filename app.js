// --- 1. CONFIGURATION AND UTILITIES ---

// Define the simulated base weather for the day
const SIMULATED_DAILY_CONFIG = {
    location: 'Sim City, UK',
    today: {
        maxTemp: 7,
        minTemp: -2, // Nighttime low
        conditions: [
            { startHour: 6, endHour: 10, condition: 'Rain', icon: '🌧️', tempShift: 1 }, // Morning Rain
            { startHour: 10, endHour: 16, condition: 'Partly Cloudy', icon: '🌤️', tempShift: 4 }, // Clearing to afternoon high
            { startHour: 16, endHour: 20, condition: 'Sleet', icon: '🌨️', tempShift: 0 }, // Evening Sleet/Freezing
            { startHour: 20, endHour: 24, condition: 'Clear Night', icon: '✨', tempShift: -3 } // Night Low
        ]
    }
    // Note: Daily forecast logic will reuse these values and cycle the day names.
};

const CONDITION_ICONS = {
    'Sunny': '☀️',
    'Partly Cloudy': '🌤️',
    'Mostly Cloudy': '☁️',
    'Cloudy': '☁️',
    'Rain': '🌧️',
    'Sleet': '🌨️',
    'Clear Night': '✨',
    'Snow': '❄️'
};

/**
 * Gets the simulated condition and temperature based on the hour.
 * @param {number} hour - The hour (0-23).
 * @returns {{temp: number, condition: string, icon: string}}
 */
function getWeatherForHour(hour) {
    const { maxTemp, minTemp, conditions } = SIMULATED_DAILY_CONFIG.today;
    
    // Find the current condition block
    const currentConditionBlock = conditions.find(c => hour >= c.startHour && hour < c.endHour) || conditions[0];
    
    // Simple temperature interpolation: 
    // Peak temp at 14:00 (2 PM), low temp at 03:00 (3 AM).
    let temp;
    if (hour >= 6 && hour <= 14) {
        // Morning/Day ramp-up (6 AM to 2 PM)
        const range = 14 - 6;
        const progress = (hour - 6) / range;
        temp = Math.round(minTemp + (maxTemp - minTemp) * progress);
    } else if (hour > 14 && hour <= 23) {
        // Afternoon/Evening cool-down (2 PM onwards)
        const range = 23 - 14;
        const progress = (23 - hour) / range;
        // Cools down from maxTemp towards minTemp
        temp = Math.round(minTemp + (maxTemp - minTemp) * progress * 0.7); 
    } else {
        // Night (0 to 5 AM) - keep it near the min temp
        temp = minTemp;
    }

    // Apply specific shift for the condition block
    temp += currentConditionBlock.tempShift;

    return {
        temp: temp,
        condition: currentConditionBlock.condition,
        icon: currentConditionBlock.icon
    };
}


// --- 2. DATA GENERATION FUNCTIONS ---

function generateHourlyForecast() {
    const forecast = [];
    const now = new Date();
    let currentHour = now.getHours();
    
    // Generate the next 8 hours
    for (let i = 0; i < 8; i++) {
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

    // Generate forecast for the next 7 days, cycling temperatures
    for (let i = 0; i < 7; i++) {
        const dayIndex = (todayIndex + i) % 7;
        
        // Simple cycle for variety in the 7-day forecast
        const tempShift = i % 3 === 0 ? 0 : (i % 3 === 1 ? 2 : -1); 
        const conditionList = ['Rain', 'Partly Cloudy', 'Sunny', 'Sleet', 'Cloudy'];
        const condition = conditionList[(i * 2) % conditionList.length];

        const max = SIMULATED_DAILY_CONFIG.today.maxTemp + tempShift;
        const min = SIMULATED_DAILY_CONFIG.today.minTemp + tempShift - 1;

        forecast.push({
            day: i === 0 ? 'Today' : days[dayIndex],
            max: max,
            min: min,
            condition: condition,
            icon: CONDITION_ICONS[condition]
        });
    }
    return forecast;
}


// --- 3. RENDERING FUNCTIONS ---

function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateString = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    
    document.getElementById('current-time').textContent = `${dateString} | ${timeString}`;
}

function renderCurrentWeather(data) {
    // Determine current hour's specific weather using the generator
    const now = new Date();
    const currentHourData = getWeatherForHour(now.getHours());

    document.getElementById('current-location').textContent = SIMULATED_DAILY_CONFIG.location;
    document.getElementById('current-temp').textContent = `${currentHourData.temp}°C`;
    document.getElementById('current-condition').textContent = `${currentHourData.icon} ${currentHourData.condition}`;
    
    // Start updating the time every minute
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000); 
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


// --- 4. SERVICE WORKER REGISTRATION (Kept from previous step) ---
// (You do not need to change sw.js or the registration function)

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
                console.error('ServiceWorker registration failed: ', err);
            });
        });
    } else {
        console.warn('Service Workers are not supported in this browser.');
    }
}

// --- 5. INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Generate and render dynamic data
    const hourlyData = generateHourlyForecast();
    const dailyData = generateDailyForecast();
    
    renderCurrentWeather(); // Will now call the generator based on current hour
    renderHourlyForecast(hourlyData);
    renderDailyForecast(dailyData);
    
    // 2. Register the PWA Service Worker
    registerServiceWorker();
});
