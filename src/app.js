import express from 'express';
import cors from 'cors';
import errorHandler from './middlewares/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import departmentRoutes from './routes/department.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import companyProfileRoutes from './routes/companyProfile.routes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/company-profile', companyProfileRoutes);

// Global error handler
app.use(errorHandler);

export default app;
