// settings-display.js

// Function to fetch bot settings
async function fetchBotSettings() {
    try {
        const response = await fetch('/api/bot-settings');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const settings = await response.json();
        displaySettings(settings);
    } catch (error) {
        console.error('Failed to fetch bot settings:', error);
        displayError('Failed to load settings. Please try again later.');
    }
}

// Function to display settings in the UI
function displaySettings(settings) {
    const settingsContainer = document.getElementById('settings-container');
    settingsContainer.innerHTML = ''; // Clear previous settings
    Object.keys(settings).forEach(key => {
        const settingItem = document.createElement('div');
        settingItem.textContent = `${key}: ${settings[key]}`;
        settingsContainer.appendChild(settingItem);
    });
}

// Function to display error messages
function displayError(message) {
    const settingsContainer = document.getElementById('settings-container');
    settingsContainer.innerHTML = `<div class='error'>${message}</div>`;
}

// Fetch settings on page load
window.onload = fetchBotSettings;