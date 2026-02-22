function ownerCommand(message) {
    const ownerId = 'YOUR_BOT_OWNER_ID'; // Replace with your bot owner's ID
    const senderId = message.sender.id; // Assuming message.sender.id contains sender ID

    // Check if the sender is the owner
    if (senderId === ownerId) {
        // Owner has permission
        // Your code for owner command execution goes here
    } else {
        // Sender is not the owner
        // Handle permission denial if necessary
    }
}