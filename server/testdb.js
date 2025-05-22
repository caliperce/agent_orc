const mongoose = require('mongoose');
const env = require('dotenv');  

env.config();

// This is the connection URL for MongoDB. We're connecting to a database named 'test'
// For local MongoDB, the URL typically looks like this
const mongoURL = process.env.MONGODB_URL
console.log(mongoURL)


// Let's try to connect to MongoDB
mongoose.connect(mongoURL, {
  // These options help avoid some deprecation warnings
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  // This code runs if the connection is successful
  console.log('Successfully connected to MongoDB!');
})
.catch((error) => {
  // This code runs if there's an error connecting
  console.error('Error connecting to MongoDB:', error);
});

// Let's create a simple test schema (like a blueprint for our data)
const TestSchema = new mongoose.Schema({
  name: String,
  date: { type: Date, default: Date.now }
});

// Create a model from our schema
const Test = mongoose.model('Test', TestSchema);

// Let's create a test document
const testDoc = new Test({
  name: 'Test Entry'
});

// Save the test document to the database
testDoc.save()
  .then(() => {
    console.log('Test document saved successfully!');
  })
  .catch((error) => {
    console.error('Error saving test document:', error);
  });
