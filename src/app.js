import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import errorHandler from './middlewares/errorHandler.js';
import adminRoutes from './routes/admin.routes.js';
import departmentRoutes from './routes/department.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import companyProfileRoutes from './routes/companyProfile.routes.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

// 🔐 Core Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// ✅ Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 📦 API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/company-profile', companyProfileRoutes); // stays singular as it's always 1

// ❌ 404 Catch-All
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// 🧯 Global Error Handler
app.use(errorHandler);

export default app;
