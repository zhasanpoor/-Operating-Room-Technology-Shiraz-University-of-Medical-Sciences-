require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./database');

function autoSeed() {
    const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
    if (catCount === 0) {
        console.log('Database empty, running auto-seed...');
        require('./seed');
        require('./seed-content');
        console.log('Auto-seed completed!');
    }
}
autoSeed();

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000
});
app.use('/api/', limiter);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', apiRoutes);

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'خطای سرور' });
});

app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  تکنولوژی اتاق عمل - دانشگاه شیراز`);
    console.log(`========================================`);
    console.log(`  سایت اصلی:    http://localhost:${PORT}`);
    console.log(`  پنل مدیریت:   http://localhost:${PORT}/admin`);
    console.log(`  API:          http://localhost:${PORT}/api`);
    console.log(`========================================\n`);
});
