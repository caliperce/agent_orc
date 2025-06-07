const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');



// Function to check if results are ready
async function checkResults(snapshotId) {
    try {
        const response = await axios.get(
            `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}`,
            {
                headers: {
                    "Authorization": "Bearer 644ab8d2-a4d5-4a80-b653-52e27950a08a",
                    "Content-Type": "application/json",
                },
            }
        );
        console.log('Current status:', response.status);
        console.log(response.data);
        return response;
    } catch (error) {
        console.error('Error checking results:', error);
        return null;
    }
}

// Function to save results to JSON file
async function saveResultsToFile(results,question) {
    try {
        const filePath = path.join(__dirname, 'Youtube_fetched_transcript_url.json');
        // Since results.data is not an array, we'll create an object with just the fields we want
        const actual_data = {
            user_question: question,
            url: results.data.url,
            title: results.data.title,
            transcript: results.data.transcript, 
            formatted_transcript: results.data.formatted_transcript,
            url: results.data.url,
            date: results.data.date_posted,
            description: results.data.description,
            
        };
        
        // Save just our filtered data to the file
        await fs.writeFile(filePath, JSON.stringify(actual_data, null, 2));
        console.log('Results saved successfully to Youtube_fetched_transcript_url.json');
    } catch (error) {
        console.error('Error saving results to file:', error);
    }
}

// Main function to handle the entire process for a given URL
async function fetchAndPollResultsForUrl(url,question) {
    console.log(question);
    console.log(url);
    console.log("--------------------------------");
    // Step 1: Build the data object from the URL
    const data = JSON.stringify([{ url: url, country: "" }]);

    try {
        // Initial request to create snapshot
        console.log('Creating snapshot...');
        const response = await axios.post(
            "https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_lk56epmy2i5g7lzu0k&include_errors=true",
            data,
            {
                headers: {
                    "Authorization": "Bearer 644ab8d2-a4d5-4a80-b653-52e27950a08a",
                    "Content-Type": "application/json",
                },
            }
        );

        const snapshotId = response.data.snapshot_id;
        console.log('Snapshot created with ID:', snapshotId);

        // Poll for results every 8 seconds
        const pollInterval = setInterval(async () => {
            console.log('Checking for results...');
            const results = await checkResults(snapshotId);

            // Check if we have the complete video data
            if (results.status === 200) {
                if (pollInterval) {
                    clearInterval(pollInterval);
                    console.log('Successfully cleared polling interval');
                }
                console.log('Results are ready!');
                console.log(results.data);
                await saveResultsToFile(results,question);
                console.log('Polling stopped. Process complete.');
            } else if (results && results.status === 'failed') {
                if (pollInterval) {
                    clearInterval(pollInterval);
                }
                console.error('Snapshot processing failed:', results);
                console.log('Polling stopped due to failure.');
            } else {
                console.log('Results not ready yet, waiting...');
            }
        }, 8000); // Poll every 8 seconds

    } catch (error) {
        console.error('Error in main process:', error);
    }
}
module.exports = {
    fetchAndPollResultsForUrl
}
// Usage: just call this function with any YouTube URL
fetchAndPollResultsForUrl("https://youtu.be/MnBZlEQ14fY?si=3pyWs5I0JYGjRYBa","what happened here?");