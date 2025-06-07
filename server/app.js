const express = require("express");
const bodyParser = require("body-parser");
const env = require('dotenv');
const mongoose = require('mongoose');
const { startProcess,Video } = require('./brightdata');
const { processAndSendWebhook, sendWebhook } = require('./webhook');
const Question = require('./questionModel');
const connectDB = require('./db');
const { fetchAndPollResultsForUrl} = require('./fetch_transcripts/yt-trans');
connectDB().then(console.log('Connection from app.js')).catch(console.error)

env.config();

// // Question schema
// const schema = new mongoose.Schema({
//   question: String,
//   date: { type: Date, default: Date.now },
//   status: { 
//     type: String, 
//     enum: ['pending', 'inprocess', 'completed'],
//     default: 'pending'
//   },
//   videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brightdata_Output' }
// });

// const Question = mongoose.model('Question', schema);

const app = express();
app.use(bodyParser.json({limit: '150mb'})); // Increased JSON size limit to 100mb
app.use(bodyParser.urlencoded({limit: '150mb', extended: true})); // Also increase URL-encoded payload limit

// Connect to MongoDB
// connectDB().catch(console.error);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/hello", (req, res) => {
  console.log(req.query);
  const question = req.query.question;
  const questionDoc = new Question({question: question});
  questionDoc.save().then(()=>{
    res.send(`Hello World - ${req.query.question}`);
  }).catch((error)=>{
    res.send(`Error - ${error}`);
  })
});

app.post("/hello", async (req, res) => {
  const question = req.body.question;

  try {
    // Create question with pending status
    const questionDoc = new Question({
      question: question,
      status: 'pending'
    });
    
    // Save the question first
    await questionDoc.save();
    
    // Update status to inprocess
    questionDoc.status = 'inprocess';
    await questionDoc.save();

    // Return immediately with the question ID
    res.json({
      success: true,
      questionId: questionDoc._id,
      status: 'inprocess'
    });

    // Use process.nextTick to ensure this runs after the response is sent
    process.nextTick(async () => {
      try {
        const videoData = await startProcess(question);
        
        if (!videoData || !Array.isArray(videoData)) {
          throw new Error('Invalid video data received');
        }

        // Process each video in the array
        for (const data of videoData) {
          // Check if required fields are present
          if (!data.url || !data.title || !data.channelUrl) {
            console.error('Missing required fields:', data);
            continue; // Skip this video and continue with the next one
          }

          // Create video document with reference to question
          const videoDoc = new Video({
            ...data,
            questionId: questionDoc._id
          });
          
          // Save video document
          await videoDoc.save();
          console.log(`✅ Saved video: ${data.title}`);
        }
        
        // Update question with completed status
        questionDoc.status = 'completed';
        await questionDoc.save();

        // Send webhook with the video data
        try {
          await processAndSendWebhook(questionDoc._id);
          console.log("questionId sent to webhook", questionDoc._id);
        } catch (webhookError) {
          console.error("❌ Failed to send webhook:", webhookError.message);
          // Don't throw the error here, as the data is already saved
        }

      } catch (error) {
        console.error('Error in background process:', error);
        questionDoc.status = 'pending';
        await questionDoc.save();
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post("/fetch-transcripts", async (req, res) => {
  const { url, question } = req.body;
  
  
  // Check if both url and question are provided
  if (!url || !question) {
    return res.status(400).json({
      success: false,
      error: "Please provide both url and question"
    });
  }

  const data = await fetchAndPollResultsForUrl(url,question);
  res.json({
    success: true,
    url: url,
    question: question,
    data: data
  });
});

app.post("/test-webhook", async (req, res) => {
    try {
        const questionId = req.body.questionId;
        if (!questionId) {
            return res.status(400).json({ error: "Please provide a questionId" });
        }

        console.log("🧪 Testing webhook for questionId:", questionId);
        const result = await processAndSendWebhook(questionId);
        
        res.json({
            success: true,
            message: "Webhook test completed",
            data: result
        });
    } catch (error) {
        console.error("❌ Test webhook error:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post("/test-single-video", async (req, res) => {
    try {
        // Get the first video from Brightdata_Output collection
        const video = await Video.findOne({});
        
        if (!video) {
            return res.status(404).json({ 
                success: false, 
                error: "No videos found in the database" 
            });
        }

        console.log("\n🧪 Test Video Details:");
        console.log("Title:", video.title);
        console.log("URL:", video.url);
        console.log("Channel URL:", video.channelUrl);
        
        // Send just this single video through the webhook directly
        const result = await sendWebhook([video]);
        
        // Check if the result contains an error
        if (result && result.error) {
            return res.status(500).json({
                success: false,
                message: "Webhook test failed",
                error: result.message,
                details: result.details
            });
        }
        
        res.json({
            success: true,
            message: "✅ Webhook test successful! Data was sent and accepted by the webhook server.",
            details: {
                status: "Accepted (202)",
                timestamp: result.timestamp,
                video: {
                    title: video.title,
                    url: video.url,
                    channelUrl: video.channelUrl
                }
            }
        });
    } catch (error) {
        console.error("\n❌ Test webhook error:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response ? error.response.data : null
        });
    }

});



// For local development

console.log('Starting server...');
// Listen on the port provided by Heroku or default to 8080
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("Server is running on port", port);
  // Only show localhost URL in development
  if (process.env.NODE_ENV !== 'production') {
    console.log("http://localhost:" + port);
  }
});

// Export the Express API
module.exports = app;

