const mongoose = require('mongoose');

// Question schema
const questionSchema = new mongoose.Schema({
    question: String,
    date: { type: Date, default: Date.now },
    status: { 
        type: String, 
        enum: ['pending', 'inprocess', 'completed'],
        default: 'pending'
    },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brightdata_Output' }
});

const Question = mongoose.model('Question', questionSchema);

module.exports = Question; 