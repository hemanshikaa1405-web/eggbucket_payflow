const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const { Pool } = require('pg');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL. Set it to your Supabase Postgres connection string so the API and frontend stay in sync.');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
// Trust first proxy (e.g. when running behind a tunneling service) to allow express-rate-limit
// to safely read x-forwarded-for header without throwing errors. Adjust as needed for production.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Ensure users file exists
try {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
} catch (e) {
    console.error('Failed to ensure users file:', e.message);
}

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for local static serving if needed, or configure properly
}));
app.use(cors({
    origin: '*', // Allow all for local/tunnel usage
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));

// Serve static files (do not auto-serve index.html so root can redirect to login)
app.use(express.static(__dirname, { index: false }));

// Root route - redirect to login page so users see sign-in first
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Simple Auth (file-backed) ---
function readUsers() {
    try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '[]'); } catch (e) { return []; }
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function generateToken(user) {
    return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

app.post('/api/auth/register', async (req, res) => {
    const { username, password, name } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const users = readUsers();
    if (users.find(u => u.username === username)) return res.status(409).json({ error: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = { id: require('crypto').randomUUID(), username, name: name || '', password: hashed, createdAt: new Date().toISOString() };
    users.push(user);
    writeUsers(users);
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username, name: user.name } });
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const users = readUsers();
    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username, name: user.name } });
});

// Logout: clear the HttpOnly cookie
app.post('/api/auth/logout', (req, res) => {
    const useSecureCookie = req.protocol === 'https' || process.env.FORCE_HTTPS === '1';
    res.clearCookie('sc_token', { httpOnly: true, secure: useSecureCookie, sameSite: 'lax' });
    res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', (req, res) => {
    const auth = req.headers.authorization || '';
    const token = auth.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try {
        const data = jwt.verify(token, JWT_SECRET);
        const users = readUsers();
        const user = users.find(u => u.id === data.id);
        if (!user) return res.status(401).json({ error: 'Invalid token' });
        return res.json({ id: user.id, username: user.username, name: user.name });
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
});

// Forgot password - generate reset token (demo: return reset link)
app.post('/api/auth/forgot', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });

    const users = readUsers();
    const user = users.find(u => u.username === username);
    if (!user) return res.status(200).json({ message: 'If the account exists, a reset link will be generated.' });

    // generate token and expiry
    const token = require('crypto').randomBytes(24).toString('hex');
    const expires = Date.now() + (60 * 60 * 1000); // 1 hour

    user.resetToken = token;
    user.resetExpires = expires;
    writeUsers(users);

    // Demo: return reset link in response since email isn't configured
    const resetLink = `/reset.html?uid=${user.id}&token=${token}`;
    return res.json({ message: 'Reset link generated (demo).', resetLink });
});

// Reset password
app.post('/api/auth/reset', async (req, res) => {
    const { uid, token, password } = req.body;
    if (!uid || !token || !password) return res.status(400).json({ error: 'uid, token and password required' });

    const users = readUsers();
    const user = users.find(u => u.id === uid);
    if (!user || !user.resetToken || !user.resetExpires) return res.status(400).json({ error: 'Invalid or expired token' });

    if (user.resetToken !== token || Date.now() > (user.resetExpires || 0)) {
        return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    delete user.resetToken;
    delete user.resetExpires;
    writeUsers(users);

    return res.json({ message: 'Password has been reset' });
});

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// --- Validation Schemas ---
const employeeSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    department: Joi.string().trim().max(100).allow('', null),
    phone: Joi.string().trim().max(20).allow('', null)
});

const recordSchema = Joi.object({
    employeeId: Joi.string().uuid().required(),
    month: Joi.string().regex(/^\d{4}-\d{2}$/).required(),
    trays: Joi.number().integer().min(0).optional(),
    bonus: Joi.number().min(0).optional(),
    type: Joi.string().valid('tray_sales','aq_fleet','intern','supervisor').optional(),
    aqCount: Joi.number().integer().min(0).optional(),
    aqCost: Joi.number().min(0).optional(),
    monthlySalary: Joi.number().min(0).optional(),
    baseSalary: Joi.number().min(0).required(),
    incentive: Joi.number().min(0).required(),
    totalSalary: Joi.number().min(0).required(),
    inputs: Joi.object().required(),
    results: Joi.object().optional()
});

// Validation Middleware
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        return res.status(400).json({
            error: 'Validation failed',
            details: error.details.map(d => d.message)
        });
    }
    next();
};

// Response Sanitization Utility
const sanitizeEmployee = (emp) => {
    if (!emp) return null;
    const { createdAt, updatedAt, ...rest } = emp;
    return rest;
};

const sanitizeRecord = (rec) => {
    if (!rec) return null;
    const { createdAt, updatedAt, ...rest } = rec;
    if (rest.employee) rest.employee = sanitizeEmployee(rest.employee);
    return rest;
};

// --- Employee Endpoints ---

app.get('/api/employees', async (req, res, next) => {
    try {
        const employees = await prisma.employee.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(employees.map(sanitizeEmployee));
    } catch (error) {
        next(error);
    }
});

app.post('/api/employees', validate(employeeSchema), async (req, res, next) => {
    const { name, department, phone } = req.body;
    try {
        const employee = await prisma.employee.create({
            data: { name, department, phone },
        });
        res.status(201).json(sanitizeEmployee(employee));
    } catch (error) {
        next(error);
    }
});

app.put('/api/employees/:id', validate(employeeSchema), async (req, res, next) => {
    const { id } = req.params;
    const { name, department, phone } = req.body;
    try {
        const employee = await prisma.employee.update({
            where: { id },
            data: { name, department, phone },
        });
        res.json(sanitizeEmployee(employee));
    } catch (error) {
        next(error);
    }
});

app.delete('/api/employees/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        await prisma.employee.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// --- Salary Record Endpoints ---

app.get('/api/records', async (req, res, next) => {
    const { employeeId } = req.query;
    try {
        const records = await prisma.salaryRecord.findMany({
            where: employeeId ? { employeeId } : {},
            include: { employee: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(records.map(sanitizeRecord));
    } catch (error) {
        next(error);
    }
});

app.post('/api/records', validate(recordSchema), async (req, res, next) => {
    const {
        employeeId,
        month,
        trays = 0,
        bonus = 0,
        type,
        aqCount,
        aqCost,
        monthlySalary,
        baseSalary,
        incentive,
        totalSalary,
        inputs,
        results
    } = req.body;
    try {
        // Check if employee exists
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const record = await prisma.salaryRecord.create({
            data: {
                employeeId,
                month,
                trays,
                bonus,
                type,
                aqCount,
                aqCost,
                monthlySalary,
                baseSalary,
                incentive,
                totalSalary,
                inputs,
                results,
            },
        });
        res.status(201).json(sanitizeRecord(record));
    } catch (error) {
        next(error);
    }
});

app.put('/api/records/:id', validate(recordSchema), async (req, res, next) => {
    const { id } = req.params;
    const {
        employeeId,
        month,
        trays = 0,
        bonus = 0,
        type,
        aqCount,
        aqCost,
        monthlySalary,
        baseSalary,
        incentive,
        totalSalary,
        inputs,
        results
    } = req.body;
    try {
        const record = await prisma.salaryRecord.update({
            where: { id },
            data: {
                employeeId,
                month,
                trays,
                bonus,
                type,
                aqCount,
                aqCost,
                monthlySalary,
                baseSalary,
                incentive,
                totalSalary,
                inputs,
                results,
            },
        });
        res.json(sanitizeRecord(record));
    } catch (error) {
        next(error);
    }
});

app.delete('/api/records/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        await prisma.salaryRecord.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);

    // Prisma specific errors
    if (err.code === 'P2002') {
        return res.status(409).json({ error: 'Unique constraint violation' });
    }
    if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Record not found' });
    }

    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message;

    res.status(status).json({ error: message });
});

// Export app for Vercel
module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
