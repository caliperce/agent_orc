const axios = require("axios");
const fs = require('fs');

// Add a flag to track if we've already downloaded the data
let hasDownloaded = false;

const headers = {
    "Authorization": "Bearer 644ab8d2-a4d5-4a80-b653-52e27950a08a",
    "Content-Type": "application/json",
};

console.log("🚀 Starting YouTube data collection process...");

// Function to check status
const checkStatus = async (snapshotId) => {
    if (hasDownloaded) {
        console.log("✅ Process completed, stopping status checks");
        return;
    }

    try {
        console.log("⏳ Checking job status for snapshot:", snapshotId);
        const response = await axios.get(
            `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}`,
            { headers }
        );

        // Log the response status and data
        console.log("📊 Response Status:", response.status);
        console.log("📊 Response Data:", JSON.stringify(response.data, null, 2));

        // Check if response.data exists and has video data
        if (!response.data || !response.data.url || !response.data.title) {
            console.log("⏳ Job is still processing...");
            console.log("⏳ Checking again in 10 seconds...");
            if (!hasDownloaded) {
                // Convert setTimeout to a Promise
                return new Promise((resolve) => {
                    setTimeout(async () => {
                        const result = await checkStatus(snapshotId);
                        resolve(result);
                    }, 10000);
                });
            }
            return;
        }

        // If we get here, we have the video data
        console.log("✨ Data is ready! Found video:", response.data.title);
        hasDownloaded = true;
        
        // Process the data directly from the response
        const videoData = response.data;
        const extractedData = {
            url: videoData.url,
            title: videoData.title,
            video_id: videoData.video_id,
            channel_url: videoData.channel_url,
            transcript: videoData.formatted_transcript || videoData.transcript || null
        };

        return extractedData;
        
    } catch (error) {
        console.error("❌ Error checking status:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
        }
        throw error;
    }
};

// Function to download data
const downloadData = async (snapshotId) => {
    try {
        console.log("📥 Starting data download...");
        const response = await axios.get(
            `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}/download?format=json`,
            { headers }
        );

        const jsonData = response.data;
        console.log(`📊 Found ${jsonData.length} videos to process`);

        const extractedData = jsonData.map(video => ({
            url: video.url,
            title: video.title,
            video_id: video.video_id,
            channel_url: video.channel_url,
            related_videos: video.related_videos,
            transcript: video.transcript ? video.transcript.formatted_transcript : null
        }));

        console.log("💾 Writing data to file...");
        
        fs.writeFile('youtube_urls.json', JSON.stringify(extractedData, null, 2), (err) => {
            if (err) {
                console.error("❌ Error writing to file:", err.message);
            } else {
                console.log("✅ Successfully saved URLs to youtube_urls.json");
                console.log("🎉 Process completed!");
            }
        });
    } catch (error) {
        console.error("❌ Error downloading data:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
        }
    }
};

// Remove the hardcoded data array and replace with a function
const createDataObject = (keyword) => {
    return [
        {
            "keyword": keyword,
            "num_of_posts": "3",
            "start_date": "",
            "end_date": "",
            "country": ""
        }
    ];
};

// Modify the startProcess function to return the data
const startProcess = async (keyword) => {
    try {
        console.log("📸 Creating snapshot...");
        const data = createDataObject(keyword);
        
        const response = await axios.post(
            "https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_lk56epmy2i5g7lzu0k&include_errors=true&type=discover_new&discover_by=keyword",
            data,
            { headers }
        );

        console.log("📸 Snapshot created successfully");
        console.log("📸 Snapshot ID:", response.data.snapshot_id);
        
        if (!response.data.snapshot_id) {
            console.error("❌ No snapshot ID in response");
            return null;
        }

        const result = await checkStatus(response.data.snapshot_id);
        return result; // Return the data to the caller
    } catch (error) {
        console.error("❌ Error creating snapshot:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
        }
        throw error; // Re-throw the error to be handled by the caller
    }
};

// Export the startProcess function
module.exports = { startProcess };