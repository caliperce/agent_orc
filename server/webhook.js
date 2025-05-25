const axios = require('axios');
const connectDB = require('../server/db');
const Video = require('./videoModel');
const Question = require('./questionModel');
const { writeToGoogleDocs } = require('./googleDocs');
connectDB().catch(console.error)

// Webhook URL
const WEBHOOK_URL = 'https://run.relay.app/api/v1/playbook/cmb0q8h9d0u1h0okpbc9nhn8i/trigger/dxnt1ssuARAPq9Xw2679rw';

// Function to send webhook
const sendWebhook = async (data) => {
    try {
        console.log("\n🚀 Starting trigger request...");
        
        // Format the data for trigger endpoint
        const triggerData = {
            runId: Date.now().toString(),
            data: JSON.stringify({
                message: "Data has been written to Google Docs",
                question : data.question,
            }),
            documentId: data.documentId,
        };

        const response = await axios.post(WEBHOOK_URL, triggerData, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log("\n✅ Trigger response received:");
        console.log("Triggered data", triggerData)
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
        console.log("\n🔍 Looking for question and videos with questionId:", questionId);
        
        // Find the question and all videos associated with it
        const [question, videos] = await Promise.all([
            Question.findById(questionId),
            Video.find({ questionId: questionId })
        ]);
        
        if (!question) {
            console.log("❌ No question found for ID:", questionId);
            return {
                error: true,
                message: "No question found for the given ID"
            };
        }

        if (!videos || videos.length === 0) {
            console.log("❌ No videos found for question ID:", questionId);
            return {
                error: true,
                message: "No videos found for the given question ID"
            };
        }

        console.log(`\n📊 Found question and ${videos.length} videos to process`);
        
        // First, write to Google Docs
        console.log("\n📝 Writing data to Google Docs...");
        const { documentId, documentUrl } = await writeToGoogleDocs(question, videos);
        console.log("✅ Data written to Google Docs with ID:", documentId);
        console.log("✅ Document URL:", documentUrl);

        // Then send webhook with document ID and URL
        console.log("\n🎉 Sending webhook trigger...");
        const result = await sendWebhook({ documentId, documentUrl });
        console.log("✅ Webhook sent successfully");
        
        return {
            success: true,
            documentId,
            documentUrl,
           webhookResult: result
        };
    } catch (error) {
        console.error("\n❌ Error in processAndSendWebhook:", error.message);
        return {
            error: true,
            message: error.message,
            details: error
        };
    }
};

processAndSendWebhook("68319a2e3e14de958368f16c")

module.exports = {
    sendWebhook,
    processAndSendWebhook
}; 