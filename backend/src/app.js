require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const morgan       = require('morgan');

const errorHandler    = require('./middleware/errorHandler');
const authRoutes      = require('./routes/authRoutes');
const memberRoutes    = require('./routes/memberRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin:      process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status:      'ok',
      service:     'FitSync API',
      version:     '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp:   new Date().toISOString(),
    },
    message: 'API is running',
    errors:  null,
  });
});

app.use('/api/auth',      authRoutes);
app.use('/api/members',   memberRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ---- 404 handler for undefined routes ----
app.use((req, res) => {
  res.status(404).json({
    success: false,
    data:    null,
    message: `Route not found: ${req.method} ${req.path}`,
    errors:  null,
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Server] FitSync API running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app;