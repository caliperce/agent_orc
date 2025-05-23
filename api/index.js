const app = require('../server/app');
const connectDB = require('../server/db');
console.log("gonna connect to db")
connectDB().catch(console.error);

module.exports = app; 