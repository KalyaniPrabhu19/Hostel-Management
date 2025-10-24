const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const connection = require('./db');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/start.html'));
});

// Registration route
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);
  const query = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
  connection.query(query, [username, hashedPassword, role], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error registering user');
    }

    if (role === 'student') {
      res.redirect('/student');
    } else {
      res.redirect('/admin');
    }
  });
});

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM users WHERE username = ?';
  connection.query(query, [username], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).send('Invalid username or password');
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(401).send('Invalid username or password');

    if (user.role === 'student') res.redirect('/student');
    else res.redirect('/admin');
  });
});

// Serve dashboards
app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/student.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
