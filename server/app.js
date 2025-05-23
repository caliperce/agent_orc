const express = require("express");
const bodyParser = require("body-parser");
const env = require('dotenv');
const mongoose = require('mongoose');
const axios = require('axios');  // Add axios for making HTTP requests
const { startProcess, Video } = require('./brightdata');  // Import both startProcess and Video model

env.config();

const mongoURL = process.env.MONGODB_URL;
const WEBHOOK_URL = 'https://run.relay.app/api/v1/playbook/cmay1ijw904j50okobj1lehh4/webhook/cmb0fo5mm000i3b6uea20x6wq';

// Function to send webhook
const sendWebhook = async (data) => {
    try {
        console.log("🚀 Sending webhook with data...");
        const response = await axios.post(WEBHOOK_URL, data);
        console.log("✅ Webhook sent successfully:", response.status);
        return response.data;
    } catch (error) {
        console.error("❌ Error sending webhook:", error.message);
        if (error.response) {
            console.error("Webhook response data:", error.response.data);
            console.error("Webhook response status:", error.response.status);
        }
        throw error;
    }
};

// Question schema
const schema = new mongoose.Schema({
  question: String,
  date: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'inprocess', 'completed'],
    default: 'pending'
  },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brightdata_Output' }
});

const Question = mongoose.model('Question', schema);

const app = express();
app.use(bodyParser.json());

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
          await sendWebhook(videoData);
          console.log("🎉 Webhook sent successfully after data save!");
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

// For local development
  mongoose.connect(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000
  })
  .then(() => {
    console.log('Successfully connected to MongoDB!');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

  app.listen(process.env.PORT || 8080, () => {
    console.log("Server is running on port 8080");
    console.log("http://localhost:8080");
  });

// Export the Express API
module.exports = app;

