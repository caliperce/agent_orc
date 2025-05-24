const axios = require("axios");
const fs = require('fs');
const mongoose = require('mongoose');
const env = require('dotenv');
const connectDB = require('../server/db');
const { processAndSendWebhook } = require("./webhook");
const Video = require('./videoModel');  // This now imports the model directly
const { time } = require("console");
console.log("gonna connect to db")
connectDB().catch(console.error);

env.config();

// // Define the Video schema
// const videoSchema = new mongoose.Schema({
//     url: { type: String, required: true },
//     title: { type: String, required: true },
//     channelUrl: { type: String, required: true },
//     transcript: [{
//         start_time: Number,
//         end_time: Number,
//         duration: Number,
//         text: String
//     }],
//     transcript_language: [{
//         language: String,
//         auto_translate: Boolean
//     }],
//     timestamp: { type: String },
//     chapters: [{
//         title: String,
//         time_stamp: String,
//         image: String
//     }],
//     description: { type: String },
//     createdAt: { type: Date, default: Date.now },
//     questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' }
// });

// Create the Video model
// const Video = mongoose.model('Brightdata_Output', videoSchema);

// Connect to MongoDB using the shared connection
const headers = {
    "Authorization": "Bearer 644ab8d2-a4d5-4a80-b653-52e27950a08a",
    "Content-Type": "application/json",
};

console.log("🚀 Starting YouTube data collection process...");
console.log("mongooooo", process.env.MONGODB_URL)


// Function to check status
const checkStatus = async (snapshotId) => {
    try {
        console.log("⏳ Checking job status for snapshot:", snapshotId);
        const response = await axios.get(
            `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}`,
            { 
                headers,
                responseType: 'stream',
                timeout: 60000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        // Log the response status
        console.log("📊 Response Status:", response.status);
        
        // Convert stream to string
        let data = '';
        for await (const chunk of response.data) {
            data += chunk;
        }
        
        // Clean the data string
        data = data.trim();
        
        // Try to parse as a single JSON object first
        try {
            const singleObject = JSON.parse(data);
            if (singleObject) {
                console.log("📊 Successfully parsed single JSON object");
                const extractedData = [{
                    url: singleObject.url || '',
                    title: singleObject.title || '',
                    channelUrl: singleObject.channel_url || '',
                    transcript: singleObject.formatted_transcript ? singleObject.formatted_transcript : singleObject.transcript,
                    transcript_language: singleObject.transcript_language || [],
                    timestamp: singleObject.timestamp || null,
                    chapters: singleObject.chapters || null,
                    description: singleObject.description || '',
                }];

                // Only save to MongoDB if status is 200 and we have valid data
                if (response.status === 200 && extractedData[0].url && extractedData[0].title && extractedData[0].channelUrl) {
                    console.log("💾 Saving data to MongoDB...");
                    for (const videoData of extractedData) {
                        try {
                            // Add the questionId to the video data before saving
                            const video = new Video({
                                ...videoData,
                                questionId: questionDoc._id // This will reference the question document
                            });
                            await video.save();
                            console.log(`✅ Saved data: ${videoData.title}`);
                        } catch (error) {
                            console.error(`❌ Error saving video ${videoData.title}:`, error.message);
                        }
                    }
                    console.log("🎉 All videos saved to MongoDB!");
                    return extractedData;
                } else {
                    console.log("⏳ Data not ready yet, waiting...");
                    return new Promise((resolve) => {
                        setTimeout(async () => {
                            const result = await checkStatus(snapshotId);
                            resolve(result);
                        }, 10000);
                    });
                }
            }
        } catch (singleParseError) {
            console.log("Not a single JSON object, trying to parse as multiple objects...");
        }

        // If single object parsing failed, try parsing as multiple objects
        const jsonObjects = data.split('\n').filter(line => line.trim()).map(line => {
            try {
                return JSON.parse(line);
            } catch (error) {
                console.error("❌ Error parsing line:", line);
                return null;
            }
        }).filter(obj => obj !== null);

        console.log(`📊 Successfully parsed ${jsonObjects.length} objects`);
        
        // Only proceed if status is 200 and we have valid data
        if (response.status === 200 && jsonObjects.length > 0) {
            console.log("✨ Data is ready!");
            
            // Extract the video data from each object
            const extractedData = jsonObjects.map(responseData => ({
                url: responseData.url || '',
                title: responseData.title || '',
                channelUrl: responseData.channel_url || '',
                transcript: responseData.formatted_transcript ? responseData.formatted_transcript : responseData.transcript,
                transcript_language: responseData.transcript_language || [],
                timestamp: responseData.timestamp || null,
                chapters: responseData.chapters || null,
                description: responseData.description || ''
            }));

            // Only save to MongoDB if we have valid data
            if (extractedData.some(data => data.url && data.title && data.channelUrl)) {
                console.log("💾 Saving data to MongoDB...");
                for (const videoData of extractedData) {
                    if (videoData.url && videoData.title && videoData.channelUrl) {
                        try {
                            const video = new Video(videoData);
                            await video.save();
                            console.log(`✅ Saved data: ${videoData.title}`);
                        } catch (error) {
                            console.error(`❌ Error saving video ${videoData.title}:`, error.message);
                        }
                    } else {
                        console.log("⏳ Skipping video with missing required fields");
                    }
                }
                console.log("🎉 All videos saved to MongoDB!");
                return extractedData;
            }
        }
        
        // If we get here, either status is not 200 or data is not ready
        console.log("⏳ Job is still processing...");
        console.log("⏳ Current structure:", jsonObjects[0] ? Object.keys(jsonObjects[0]) : "No data");
        console.log("⏳ Checking again in 10 seconds...");
        
        // Keep polling every 10 seconds
        return new Promise((resolve) => {
            setTimeout(async () => {
                const result = await checkStatus(snapshotId);
                resolve(result);
            }, 10000);
        });
        
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
// const downloadData = async (snapshotId) => {
//     try {
//         console.log("📥 Starting data download...");
//         const response = await axios.get(
//             `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}/download?format=json`,
//             { headers }
//         );

//         const jsonData = response.data;
//         console.log(`📊 Found ${jsonData.length} videos to process`);

//         const extractedData = jsonData.map(video => ({
//             url: video.url,
//             title: video.title,
//             video_id: video.video_id,
//             channel_url: video.channel_url,
//             related_videos: video.related_videos,
//             transcript: video.transcript ? video.transcript.formatted_transcript : null
//         }));

//         console.log("💾 Writing data to file...");
        
//         fs.writeFile('youtube_urls.json', JSON.stringify(extractedData, null, 2), (err) => {
//             if (err) {
//                 console.error("❌ Error writing to file:", err.message);
//             } else {
//                 console.log("✅ Successfully saved URLs to youtube_urls.json");
//                 console.log("🎉 Process completed!");
//             }
//         });
//     } catch (error) {
//         console.error("❌ Error downloading data:", error.message);
//         if (error.response) {
//             console.error("Response data:", error.response.data);
//             console.error("Response status:", error.response.status);
//         }
//     }
// };

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


// Export both startProcess and Video
module.exports = { startProcess, Video };