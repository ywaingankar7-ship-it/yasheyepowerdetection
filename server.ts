import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "visionx-secret-key-2026";
const db = new Database("visionx.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'staff', -- 'admin', 'doctor', 'staff'
    branch_id INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    age INTEGER,
    gender TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'frame', 'lens'
    brand TEXT,
    model TEXT,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    details TEXT -- JSON string
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS eye_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    results TEXT, -- JSON string
    image_url TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );
`);

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
    "Admin User",
    "admin@visionx.com",
    hashedPassword,
    "admin"
  );
}

// Seed Inventory if empty
const invCount = db.prepare("SELECT COUNT(*) as count FROM inventory").get() as any;
if (invCount.count === 0) {
  const items = [
    { type: 'frame', brand: 'Ray-Ban', model: 'Aviator Classic', price: 150, stock: 12, details: { color: 'Gold', material: 'Metal' } },
    { type: 'frame', brand: 'Oakley', model: 'Holbrook', price: 130, stock: 8, details: { color: 'Matte Black', material: 'O Matter' } },
    { type: 'frame', brand: 'Prada', model: 'Linear Rossa', price: 280, stock: 4, details: { color: 'Grey', material: 'Acetate' } },
    { type: 'lens', brand: 'Essilor', model: 'Crizal Sapphire', price: 85, stock: 25, details: { coating: 'Anti-reflective', index: 1.6 } },
    { type: 'lens', brand: 'Zeiss', model: 'BlueGuard', price: 95, stock: 15, details: { coating: 'Blue light filter', index: 1.67 } },
  ];
  const stmt = db.prepare("INSERT INTO inventory (type, brand, model, price, stock, details) VALUES (?, ?, ?, ?, ?, ?)");
  items.forEach(item => stmt.run(item.type, item.brand, item.model, item.price, item.stock, JSON.stringify(item.details)));
}

// Seed Customers if empty
const custCount = db.prepare("SELECT COUNT(*) as count FROM customers").get() as any;
if (custCount.count === 0) {
  const customers = [
    { name: 'John Doe', email: 'john@example.com', phone: '+1 555 0123', address: '456 Oak Ave, Springfield', age: 25, gender: 'Male' },
    { name: 'Jane Smith', email: 'jane@example.com', phone: '+1 555 0456', address: '789 Pine St, Metropolis', age: 34, gender: 'Female' },
    { name: 'Robert Brown', email: 'robert@example.com', phone: '+1 555 0789', address: '101 Maple Ln, Gotham', age: 62, gender: 'Male' },
  ];
  const stmt = db.prepare("INSERT INTO customers (name, email, phone, address, age, gender) VALUES (?, ?, ?, ?, ?, ?)");
  customers.forEach(c => stmt.run(c.name, c.email, c.phone, c.address, c.age, c.gender));
}

// Seed Appointments if empty
const apptCount = db.prepare("SELECT COUNT(*) as count FROM appointments").get() as any;
if (apptCount.count === 0) {
  const appointments = [
    { customer_id: 1, date: new Date().toISOString().split('T')[0], time: '10:00 AM', status: 'pending', notes: 'Routine checkup' },
    { customer_id: 2, date: new Date().toISOString().split('T')[0], time: '11:30 AM', status: 'approved', notes: 'Lens replacement' },
    { customer_id: 3, date: new Date().toISOString().split('T')[0], time: '02:00 PM', status: 'completed', notes: 'New frame selection' },
  ];
  const stmt = db.prepare("INSERT INTO appointments (customer_id, date, time, status, notes) VALUES (?, ?, ?, ?, ?)");
  appointments.forEach(a => stmt.run(a.customer_id, a.date, a.time, a.status, a.notes));
}

const app = express();
app.use(express.json());

// File Upload Setup
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

app.use("/uploads", express.static(uploadDir));

// Middleware: Auth
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- API ROUTES ---

// Auth
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
});

// Customers
app.get("/api/customers", authenticate, (req, res) => {
  const customers = db.prepare("SELECT * FROM customers ORDER BY created_at DESC").all();
  res.json(customers);
});

app.post("/api/customers", authenticate, (req, res) => {
  const { name, email, phone, address, age, gender } = req.body;
  const result = db.prepare("INSERT INTO customers (name, email, phone, address, age, gender) VALUES (?, ?, ?, ?, ?, ?)").run(
    name, email, phone, address, age, gender
  );
  res.json({ id: result.lastInsertRowid });
});

// Analytics & Reports
app.get("/api/analytics/eye-conditions", authenticate, (req, res) => {
  const tests = db.prepare("SELECT results FROM eye_tests").all();
  const stats = { myopia: 0, hyperopia: 0, astigmatism: 0, normal: 0 };
  tests.forEach((t: any) => {
    const results = JSON.parse(t.results);
    const summary = (results.summary || "").toLowerCase();
    if (summary.includes("myopia")) stats.myopia++;
    else if (summary.includes("hyperopia")) stats.hyperopia++;
    else if (summary.includes("astigmatism")) stats.astigmatism++;
    else stats.normal++;
  });
  res.json(stats);
});

app.get("/api/analytics/demographics", authenticate, (req, res) => {
  const genderStats = db.prepare("SELECT gender, COUNT(*) as count FROM customers GROUP BY gender").all();
  const ageStats = db.prepare(`
    SELECT 
      CASE 
        WHEN age < 18 THEN '0-17'
        WHEN age BETWEEN 18 AND 35 THEN '18-35'
        WHEN age BETWEEN 36 AND 60 THEN '36-60'
        ELSE '60+'
      END as age_group,
      COUNT(*) as count 
    FROM customers 
    GROUP BY age_group
  `).all();
  res.json({ gender: genderStats, age: ageStats });
});

app.get("/api/activity-logs", authenticate, (req, res) => {
  const logs = db.prepare(`
    SELECT l.*, u.name as user_name 
    FROM activity_logs l 
    JOIN users u ON l.user_id = u.id 
    ORDER BY l.timestamp DESC 
    LIMIT 100
  `).all();
  res.json(logs);
});

// Inventory
app.get("/api/inventory", authenticate, (req, res) => {
  const items = db.prepare("SELECT * FROM inventory").all();
  res.json(items);
});

app.post("/api/inventory", authenticate, (req, res) => {
  const { type, brand, model, price, stock, details } = req.body;
  const result = db.prepare("INSERT INTO inventory (type, brand, model, price, stock, details) VALUES (?, ?, ?, ?, ?, ?)").run(
    type, brand, model, price, stock, JSON.stringify(details)
  );
  res.json({ id: result.lastInsertRowid });
});

// Appointments
app.get("/api/appointments", authenticate, (req, res) => {
  const appointments = db.prepare(`
    SELECT a.*, c.name as customer_name 
    FROM appointments a 
    JOIN customers c ON a.customer_id = c.id 
    ORDER BY a.date ASC, a.time ASC
  `).all();
  res.json(appointments);
});

app.post("/api/appointments", authenticate, (req, res) => {
  const { customer_id, date, time, notes } = req.body;
  const result = db.prepare("INSERT INTO appointments (customer_id, date, time, notes) VALUES (?, ?, ?, ?)").run(
    customer_id, date, time, notes
  );
  res.json({ id: result.lastInsertRowid });
});

app.patch("/api/appointments/:id", authenticate, (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ success: true });
});

// Manual Eye Test & AI Result Storage
app.get("/api/eye-tests", authenticate, (req, res) => {
  const tests = db.prepare(`
    SELECT t.*, c.name as customer_name 
    FROM eye_tests t 
    JOIN customers c ON t.customer_id = c.id 
    ORDER BY t.date DESC
  `).all();
  res.json(tests);
});

app.post("/api/customers/test", authenticate, (req, res) => {
  const { customer_id, results } = req.body;
  const result = db.prepare("INSERT INTO eye_tests (customer_id, results) VALUES (?, ?)").run(
    customer_id, JSON.stringify(results)
  );
  res.json({ id: result.lastInsertRowid });
});

// Analytics
app.get("/api/analytics", authenticate, (req, res) => {
  const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM customers").get() as any;
  const lowStock = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE stock < 5").get() as any;
  const appointmentsToday = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE date = date('now')").get() as any;
  const aiTests = db.prepare("SELECT COUNT(*) as count FROM eye_tests").get() as any;

  res.json({
    stats: {
      totalCustomers: totalCustomers.count,
      lowStock: lowStock.count,
      appointmentsToday: appointmentsToday.count,
      aiTests: aiTests.count
    }
  });
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist/index.html")));
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VisionX Server running on http://localhost:${PORT}`);
  });
}

startServer();
