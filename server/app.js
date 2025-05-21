const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});
app.get("/hello/:question", (req, res) => {
  res.send(`Hello - ${req.params.question}`);
});

app.listen(8080, () => {
  console.log("Server is running on port 8080");
  console.log("http://localhost:8080");
});

