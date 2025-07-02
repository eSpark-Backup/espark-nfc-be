import express from 'express';
import cors from 'cors';
import errorHandler from './middlewares/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import departmentRoutes from './routes/department.routes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);

// Global error handler
app.use(errorHandler);

export default app;
