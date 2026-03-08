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