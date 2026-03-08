const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../config/db');
const { validationResult } = require('express-validator');

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY    = parseInt(process.env.JWT_EXPIRY || '86400'); // 24h default
