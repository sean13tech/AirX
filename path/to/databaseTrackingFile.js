// Updated getUpdateHistory function to work with single-record design

function getUpdateHistory() {
    // Fetching only the single record from the database
    const updateHistory = db.query('SELECT * FROM updates WHERE id = 1');
    return updateHistory;
}

// Updated timestamps configuration to ensure uniformity across all functions
const timestampsConfig = {
    includeTimestamps: true,
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
};

// Ensure all functions handle single-record pattern properly
function saveUpdateRecord(newData) {
    // Assuming a single record is updated instead of inserting multiple
    db.query('UPDATE updates SET data = ?, updated_at = NOW() WHERE id = 1', [newData]);
}

// Other functions will also need similar adjustments to ensure they work with the single-record structure.
