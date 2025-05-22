const express = require("express");
const bodyParser = require("body-parser");
const env = require('dotenv');
const mongoose = require('mongoose');
const https = require('https');

env.config();

const mongoURL = process.env.MONGODB_URL;
console.log(mongoURL)

// New Video schema with the requested fields
const videoSchema = new mongoose.Schema({
  url: { type: String, required: true },  // URL of the video
  title: { type: String, required: true },  // Title of the video
  channelUrl: { type: String, required: true },  // Channel URL
  transcript: { type: String },  // Transcript (can be formatted or raw)
  date: { type: Date, default: Date.now }  // Keeping the date field for tracking when videos are added
});

const Video = mongoose.model('Brightdata_Output', videoSchema);

const schema = new mongoose.Schema({
  question: String,
  date: { type: Date, default: Date.now }
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
  console.log(req.body)
  const question = req.body.question;

  const questionDoc = new Question({question: question});
  questionDoc.save().then(()=>{
    res.send(`Hello World - ${req.query.question}`);
  }).catch((error)=>{
    res.send(`Error - ${error}`);
  })

  
  try {
    const { startProcess } = require('./brightdata');
    const videoData = await startProcess(question);
    res.json({
      success: true,
      keyword: question,
      data: videoData
    });
    const videoDoc = new Video(videoData);
    videoDoc.save().then(()=>{
      console.log("Video saved");
    }).catch((error)=>{
      console.log("Error saving video", error);
    })
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// For local development
if (process.env.NODE_ENV !== 'production') {
  mongoose.connect(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('Successfully connected to MongoDB!');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

  app.listen(8080, () => {
    console.log("Server is running on port 8080");
    console.log("http://localhost:8080");
  });
}

// Export the Express API
module.exports = app;

