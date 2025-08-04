import { envConfig } from './config/envConfig.js';
import { connectDB } from './db/connection.js';
import { app } from './app.js';
import { createSuperAdmin } from '../scripts/createSuperAdmin.js';

// Start the server only after a successful DB connection
const startServer = async () => {
  try {
    await connectDB();
    
    // Create super admin if needed
    await createSuperAdmin();
    
    app.listen(envConfig.port, () => {
      console.log(`🚀 Server is running on port ${envConfig.port} [${envConfig.nodeEnv}]`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1); // Exit with failure code
  }
};

startServer();
