// --- 1. SIMULATED CONSTANT DATA ---
const SIMULATED_WEATHER_DATA = {
    current: {
        temp: 18,
        condition: 'Partly Cloudy',
        location: 'Sim City',
        icon: '🌤️'
    },
    hourly: [
        { time: '10 AM', temp: 18, condition: 'Partly Cloudy', icon: '🌤️' },
        { time: '11 AM', temp: 19, condition: 'Mostly Sunny', icon: '☀️' },
        { time: '12 PM', temp: 21, condition: 'Sunny', icon: '☀️' },
        { time: '1 PM', temp: 22, condition: 'Sunny', icon: '☀️' },
        { time: '2 PM', temp: 21, condition: 'Partly Cloudy', icon: '🌤️' },
        { time: '3 PM', temp: 20, condition: 'Cloudy', icon: '☁️' },
        { time: '4 PM', temp: 19, condition: 'Cloudy', icon: '☁️' },
        { time: '5 PM', temp: 17, condition: 'Light Rain', icon: '🌧️' },
    ],
    daily: [
        { day: 'Thu', max: 22, min: 14, condition: 'Sunny', icon: '☀️' },
        { day: 'Fri', max: 20, min: 12, condition: 'Cloudy', icon: '☁️' },
        { day: 'Sat', max: 18, min: 10, condition: 'Rain', icon: '🌧️' },
        { day: 'Sun', max: 25, min: 15, condition: 'Clear', icon: '☀️' },
        { day: 'Mon', max: 23, min: 13, condition: 'Thunder', icon: '⛈️' },
        { day: 'Tue', max: 21, min: 12, condition: 'P. Cloudy', icon: '🌤️' },
        { day: 'Wed', max: 24, min: 14, condition: 'Sunny', icon: '☀️' },
    ]
};

// --- 2. RENDERING FUNCTIONS ---

function renderCurrentWeather(data) {
    // Update the location in the header
    document.querySelector('#current-weather h2').textContent = `Current Conditions in ${data.location}`;
    document.getElementById('current-temp').textContent = `${data.temp}°C`;
    document.getElementById('current-condition').textContent = `${data.icon} ${data.condition}`;
}

function renderHourlyForecast(hourly) {
    const hourlyList = document.getElementById('hourly-list');
    hourlyList.innerHTML = ''; // Clear previous content

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
    dailyList.innerHTML = ''; // Clear previous content

    daily.forEach(day => {
        const item = document.createElement('div');
        item.className = 'forecast-item';
        // Note: For daily, we show the min/max temp
        item.innerHTML = `
            <div class="day">${day.day}</div>
            <div class="icon">${day.icon}</div>
            <div class="temp">${day.max}°/${day.min}°C</div>
            <div class="condition">${day.condition}</div>
        `;
        dailyList.appendChild(item);
    });
}

// --- 3. SERVICE WORKER REGISTRATION ---

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Register sw.js relative to the site root
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

// --- 4. INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Render all the static weather data
    renderCurrentWeather(SIMULATED_WEATHER_DATA.current);
    renderHourlyForecast(SIMULATED_WEATHER_DATA.hourly);
    renderDailyForecast(SIMULATED_WEATHER_DATA.daily);
    
    // 2. Register the PWA Service Worker
    registerServiceWorker();
});
