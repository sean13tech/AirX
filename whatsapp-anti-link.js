// WhatsApp Anti-Link Script
// This script is designed to prevent users from posting links in WhatsApp groups.

const antiLink = (message) => {
    const linkPattern = /https?:\/\/\S+/i;
    if (linkPattern.test(message)) {
        console.log('Link detected and blocked!');
        return true; // Link found
    }
    return false; // No link found
};

// Example usage
const userMessage = 'Check this out: https://example.com';
if (antiLink(userMessage)) {
    console.log('Message contains forbidden link and will not be sent.');
} else {
    console.log('Message is safe to send.');
}