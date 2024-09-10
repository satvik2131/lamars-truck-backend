const mongoose = require("mongoose");

const DataSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  imageUrls: [{ type: String, required: true }], // Array of image URLs
});

module.exports = mongoose.model("Data", DataSchema);
