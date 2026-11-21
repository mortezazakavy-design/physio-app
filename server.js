const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// راه‌اندازی دیتابیس SQLite
const db = new Database('database.db');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'student', status TEXT DEFAULT 'pending');
CREATE TABLE IF NOT EXISTS dictionaries(id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, value TEXT);
CREATE TABLE IF NOT EXISTS submissions(id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, name TEXT, college TEXT, major TEXT, semester TEXT, data TEXT, submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
`);

// ساخت ادمین پیش‌فرض
try {
    db.prepare("INSERT INTO users (username, password, role, status) VALUES ('admin', 'admin123', 'admin', 'approved')").run();
} catch(e) {} 

app.use(express.json());
app.use(express.static('public'));

// --- API Routes ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
    if (!user) return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    res.json({ id: user.id, username: user.username, role: user.role, status: user.status });
});

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    try {
        db.prepare('INSERT INTO users (username, password, role, status) VALUES (?, ?, "student", "pending")').run(username, password);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: 'این نام کاربری قبلا ثبت شده است' });
    }
});

app.post('/api/change-password', (req, res) => {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(req.body.new_password, req.body.id);
    res.json({ success: true });
});

app.get('/api/dicts', (req, res) => {
    const rows = db.prepare('SELECT type, value FROM dictionaries').all();
    const dicts = { college: [], major: [], semester: [] };
    rows.forEach(r => { if (dicts[r.type]) dicts[r.type].push(r.value); });
    if (dicts.semester.length === 0) dicts.semester = ['مهر ۱۴۰۳', 'بهمن ۱۴۰۳'];
    res.json(dicts);
});

app.post('/api/submit', (req, res) => {
    const d = req.body.data;
    db.prepare('INSERT INTO submissions (student_id, name, college, major, semester, data) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.body.student_id, d.name, d.college, d.major, d.semester, JSON.stringify(d));
    res.json({ success: true });
});

app.get('/api/admin/users', (req, res) => {
    const users = db.prepare('SELECT id, username, password, status FROM users WHERE role = "student"').all();
    res.json(users);
});

app.post('/api/admin/user-status', (req, res) => {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(req.body.status, req.body.id);
    res.json({ success: true });
});

app.post('/api/admin/add-dict', (req, res) => {
    db.prepare('INSERT INTO dictionaries (type, value) VALUES (?, ?)').run(req.body.type, req.body.value);
    res.json({ success: true });
});

app.get('/api/admin/forms', (req, res) => {
    const rows = db.prepare('SELECT id, name, data FROM submissions').all();
    res.json(rows);
});

app.post('/api/admin/update-profile', (req, res) => {
    try {
        db.prepare('UPDATE users SET username = ?, password = ? WHERE id = ?').run(req.body.username, req.body.password, req.body.id);
        res.json({ success: true });
    } catch(e) {
        res.status(400).json({ error: 'نام کاربری تکراری است' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
