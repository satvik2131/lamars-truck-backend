const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const bodyParser = require("body-parser");
const Data = require("./models/datamodel");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");
require("dotenv").config(); // Ensure you have a .env file locally for development
const cors = require("cors");

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000; // Use PORT from environment variables or default to 3000

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
app.use(cors());

// Set up Multer for multiple file uploads
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage: storage });

// Route to handle form submission for multiple image uploads
app.post("/api/truck/data", upload.array("images", 10), async (req, res) => {
  try {
    const { name, description } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // Array to store image URLs
    const imageUrls = [];

    // Function to upload a single image to Cloudinary
    const uploadImage = (file) => {
      return new Promise((resolve, reject) => {
        const stream = Readable.from(file.buffer);
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: "image", folder: "uploads" },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result.secure_url);
          }
        );
        stream.pipe(uploadStream);
      });
    };

    // Upload all images sequentially
    for (const file of files) {
      const imageUrl = await uploadImage(file);
      imageUrls.push(imageUrl);
    }

    // Create a new document in the database with the array of image URLs
    const newData = new Data({
      name,
      description,
      imageUrls, // Store all Cloudinary image URLs
    });

    await newData.save();
    res
      .status(201)
      .json({ message: "Data successfully uploaded!", data: newData });
  } catch (error) {
    res.status(500).json({ message: "Failed to upload data", error });
  }
});

// Route to fetch all data including the images
app.get("/api/truck/data", async (req, res) => {
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
