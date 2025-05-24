const axios = require('axios');
const connectDB = require('../server/db');
const Video = require('./videoModel');


// Webhook URL
const WEBHOOK_URL = 'https://run.relay.app/api/v1/playbook/cmb0q8h9d0u1h0okpbc9nhn8i/trigger/dxnt1ssuARAPq9Xw2679rw';

// Function to send webhook
const sendWebhook = async (data) => {
    try {
        console.log("\n🚀 Starting trigger request...");
        
        // Make videos an array of video objects
        const videoData = Array.isArray(data) ? data : [data];
        
        // Format the data for trigger endpoint
        const triggerData = {
            runId: Date.now().toString(),
            data: JSON.stringify(videoData)  // Convert the array to a string
        };


        console.log("actual data", triggerData.data)
        
        const response = await axios.post(WEBHOOK_URL, triggerData, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log("\n✅ Trigger response received:");
        console.log("Status:", response.status);
        console.log("Headers:", response.headers);
        
        // Handle empty response
        if (!response.data) {
            console.log("⚠️ Empty response received from trigger");
            return {
                status: response.status,
                message: "Trigger received but returned empty response",
                timestamp: new Date().toISOString()
            };
        }
        
        console.log("Data:", JSON.stringify(response.data, null, 2));
        return response.data;
        
    } catch (error) {
        console.error("\n❌ Trigger Error Details:");
        console.error("Error message:", error.message);
        
        if (error.response) {
            console.error("\n📥 Server Response:");
            console.error("Status:", error.response.status);
            console.error("Headers:", error.response.headers);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
            
            // Special handling for 403 errors
            if (error.response.status === 403) {
                console.error("\n🔍 403 Error Details:");
                console.error("Response Headers:", JSON.stringify(error.response.headers, null, 2));
                console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
                
                return {
                    error: true,
                    status: 403,
                    message: "Trigger URL appears to be invalid or expired. Please check the URL in your Relay dashboard.",
                    details: {
                        headers: error.response.headers,
                        data: error.response.data
                    }
                };
            }
            
            return {
                error: true,
                status: error.response.status,
                message: error.response.data?.message || error.message,
                details: error.response.data
            };
        } else if (error.request) {
            console.error("\n❌ No response received");
            console.error("Request details:", error.request);
            
            return {
                error: true,
                message: "No response received from trigger server",
                details: error.request
            };
        } else {
            console.error("\n❌ Request setup error:", error.message);
            
            return {
                error: true,
                message: "Error setting up trigger request",
                details: error.message
            };
        }
    }
};

// Function to fetch data from MongoDB and send webhook
const processAndSendWebhook = async (questionId) => {
    try {
        console.log("\n🔍 Looking for videos with questionId:", questionId);
        
        // Find all videos associated with the question
        const videos = await Video.find({ questionId: questionId });
        
        if (!videos || videos.length === 0) {
            console.log("❌ No videos found for question ID:", questionId);
            return {
                error: true,
                message: "No videos found for the given question ID"
            };
        }

        console.log(`\n📊 Found ${videos.length} videos to process`);
        console.log("📝 First video title:", videos[0].title);
        console.log("\n🎉 Trigger process has started ");
        const result = await sendWebhook(videos)
        console.log("result", result)
        return result
    } catch (error) {
        console.error("\n❌ Error in processAndSendWebhook:", error.message);
        return {
            error: true,
            message: error.message,
            details: error
        };
    }
};




module.exports = {
    sendWebhook,
    processAndSendWebhook
}; 