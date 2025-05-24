const mongoose = require('mongoose');

// Define the Video schema
const videoSchema = new mongoose.Schema({
    url: { type: String, required: true },
    title: { type: String, required: true },
    channelUrl: { type: String, required: true },
    transcript: [{
        start_time: Number,
        end_time: Number,
        duration: Number,
        text: String
    }],
    transcript_language: [{
        language: String,
        auto_translate: Boolean
    }],
    timestamp: { type: String },
    chapters: [{
        title: String,
        time_stamp: String,
        image: String
    }],
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' }
});

// Create and export the Video model
module.exports = mongoose.model('Brightdata_Output', videoSchema);