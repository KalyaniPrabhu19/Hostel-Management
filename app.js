import express, { urlencoded, json, static as static_ } from 'express';
import { hash, compare } from 'bcrypt';
import { dirname, join } from 'path';
import connection from './db.js';
import { fileURLToPath } from 'url';

const app = express();
import cors from 'cors';
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(urlencoded({ extended: true }));
app.use(json());
app.use(static_('public'));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public/start.html'));
});

// Registration route
app.post('/register', async (req, res) => {
  const { user_id, password, role } = req.body;
  try {
    const hashedPassword = await hash(password, 10);
    const query = 'INSERT INTO users (user_id, password, role) VALUES (?, ?, ?)';
    connection.query(query, [user_id, hashedPassword, role], (err, result) => {
      if (err) {
        console.error(err);
         return res.status(500).json({ message: 'Database error', error: err.message });
}

      res.status(200).send('Registered successfully');
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});


// Login route
app.post('/login', (req, res) => {
  const { user_id, password } = req.body;

  if (!user_id || !password) {
    return res.status(400).send('Missing user ID or password');
  }

  const query = 'SELECT * FROM users WHERE user_id = ?';
  connection.query(query, [user_id], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(401).send('Invalid user ID or password');
    }

    const user = results[0];
    const match = await compare(password, user.password);

    if (!match) {
      return res.status(401).send('Invalid user ID or password');
    }

    res.status(200).json({ message: 'Login successful', role: user.role });
  });
});



// Serve dashboards
app.get('/student', (req, res) => {
  res.sendFile(join(__dirname, 'public/student.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'public/admin.html'));
});


app.post("/api/student", (req, res) => {
  const data = req.body;
  const sqlCheck = "SELECT * FROM student WHERE roll_no = ?";
  connection.query(sqlCheck, [data.roll_no], (err, results) => {
    if (err) return res.status(500).json({ message: "db error", error: err });

    if (results.length > 0) {
      // Update existing record
      const sqlUpdate = `
        UPDATE student SET
        f_name=?, m_name=?, l_name=?, department=?, course_year=?, student_phone=?,
        student_email_Id=?, dob=?, gender=?, age=?, guardian_name=?, guardian_phone=?
        WHERE roll_no=?
      `;
      const values = [
        data.f_name, data.m_name, data.l_name, data.Department, data.Course_year,
        data.student_phone, data.student_email_Id, data.dob, data.gender,
        data.age, data.guardian_name, data.guardian_phone, data.roll_no
      ];
      connection.query(sqlUpdate, values, (err) => {
        if (err) return res.status(500).json({ message: "Update failed", error: err });
        res.json({ message: "Student details updated successfully!" });
      });
    } else {
      // Insert new record
      const sqlInsert = `
        INSERT INTO student 
        (roll_no, f_name, m_name, l_name, department, course_year, student_phone, student_email_Id, dob, gender, age, guardian_name, guardian_phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        data.roll_no, data.f_name, data.m_name, data.l_name, data.department,
        data.course_year, data.student_phone, data.student_email_Id, data.dob,
        data.gender, data.agege, data.guardian_name, data.guardian_phone
      ];
      connection.query(sqlInsert, values, (err) => {
        if (err) return res.status(500).json({ message: "Insert failed", error: err });
        res.json({ message: "Student added successfully!" });
      });
    }
  });
});

app.use((req, res) => {
  console.log("⚠️ Route not found:", req.method, req.url);
  res.status(404).send("Route not found");
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));