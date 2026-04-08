const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/telemetry', require('./routes/telemetry'));
app.use('/api/metrics', require('./routes/metrics'));

// Connect to MongoDB
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hsis';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`HSIS Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB. Starting server without DB for auth mockup...', err.message);
    // Even if DB fails, start the server so the frontend can hit it (we will mock login if DB fails)
    app.listen(PORT, () => {
      console.log(`HSIS Backend running on port ${PORT} (DB Offline)`);
    });
  });
