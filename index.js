const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const bodyParser = require("body-parser");
const Data = require("./models/datamodel");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");
require("dotenv").config(); // Ensure you have a .env file locally for development

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000; // Use PORT from environment variables or default to 3000

console.log(process.env.MONGODB_URI);

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });

// Body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up Multer for file uploads
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage: storage });

// Route to handle form submission
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const { name, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Convert buffer to stream for Cloudinary
    const stream = Readable.from(file.buffer);

    // Upload image to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "uploads" },
      async (error, result) => {
        if (error) {
          return res
            .status(500)
            .json({ message: "Failed to upload image to Cloudinary", error });
        }

        // Create a new document in the database
        const newData = new Data({
          name,
          description,
          imageUrl: result.secure_url, // Save the Cloudinary image URL
        });

        try {
          await newData.save();
          res
            .status(201)
            .json({ message: "Data successfully uploaded!", data: newData });
        } catch (err) {
          res.status(500).json({ message: "Failed to save data", error: err });
        }
      }
    );

    // Pipe the file buffer to Cloudinary upload stream
    stream.pipe(uploadStream);
  } catch (error) {
    res.status(500).json({ message: "Failed to upload data", error });
  }
});

// Route to fetch all data including the images
app.get("/data", async (req, res) => {
  try {
    const data = await Data.find();
    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch data", error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
