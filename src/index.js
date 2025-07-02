import envConfig from './config/envConfig.js';
import connectDB from './db/connection.js';
import app from './app.js';

// Connect to MongoDB
connectDB();

app.get('/', (req, res) => {
  res.send('Welcome to NFC Workforce Manager API');
});

// Start server
app.listen(envConfig.port, () => {
  console.log(`Server is running on port ${envConfig.port}`);
});
