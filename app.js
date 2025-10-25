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
        console.error("❌ Database error:", err);
        return res.status(500).json({ message: 'Database error', error: err.message });
      }

      console.log("✅ Registered:", user_id, "as", role);

      // ✅ tell frontend where to go
      if (role === "admin") {
        res.json({ redirect: "admin.html" });
      } else {
        res.json({ redirect: "student.html" });
      }
    });

  } catch (err) {
    console.error("❌ Internal error:", err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Login route
  app.post('/login', (req, res) => {
  const { user_id, password } = req.body;


  connection.query('SELECT * FROM users WHERE user_id = ?', [user_id], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ message: "Invalid user ID or password" });
    }

    const user = results[0];
    const match = await compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Incorrect password" });

    // ✅ send both fields
    res.json({
      user_id: user.user_id,
      role: user.role
    });

  });
});


// Serve dashboards
app.get('/student', (req, res) => {
  res.sendFile(join(__dirname, 'public/student.html'));
});


app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'public/admin.html'));
});

//saves student details
app.post("/saveStudentDetails", (req, res) => {
  const {
    roll_no,
    f_name,
    m_name,
    l_name,
    department,
    course_year,
    student_phone,
    student_email_Id,
    dob,
    gender,
    age,
    guardian_name,
    guardian_phone,
  } = req.body;

  const student_id = req.body.user_id; // coming from frontend (logged in user)

  console.log("🟢 Trying to save student for user_id:", student_id);

  // check if user exists
  connection.query(
    "SELECT * FROM users WHERE user_id = ?",
    [student_id],
    (err, userResults) => {
      if (err) {
        console.error("❌ Error checking user:", err);
        return res.status(500).json({ message: "Database error while checking user" });
      }

      if (userResults.length === 0) {
        console.warn("⚠️ No user found with ID:", student_id);
        return res.status(400).json({ message: "User not found in users table" });
      }

      console.log("✅ User exists. Proceeding to insert student...");

      const query = `
        INSERT INTO students (
          student_id, roll_no, f_name, m_name, l_name, department, course_year,
          student_phone, student_email_Id, dob, gender, age, guardian_name, guardian_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          roll_no = VALUES(roll_no),
          f_name = VALUES(f_name),
          m_name = VALUES(m_name),
          l_name = VALUES(l_name),
          department = VALUES(department),
          course_year = VALUES(course_year),
          student_phone = VALUES(student_phone),
          student_email_Id = VALUES(student_email_Id),
          dob = VALUES(dob),
          gender = VALUES(gender),
          age = VALUES(age),
          guardian_name = VALUES(guardian_name),
          guardian_phone = VALUES(guardian_phone);
      `;

      connection.query(
        query,
        [
          student_id,
          roll_no,
          f_name,
          m_name,
          l_name,
          department,
          course_year,
          student_phone,
          student_email_Id,
          dob,
          gender,
          age,
          guardian_name,
          guardian_phone,
        ],
        (err, results) => {
          if (err) {
            console.error("❌ Error inserting student:", err);
            return res.status(500).json({ message: "Error saving student details", error: err.message });
          }
          console.log("✅ Student details saved successfully!");
          res.status(200).json({ message: "Student details saved successfully" });
        }
      );
    }
  );
});

//fetches saved student details
app.get("/api/student", (req, res) => {
  const userId = req.query.user_id;
  console.log("📥 Incoming student fetch for:", userId);

  if (!userId) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  const sql = `
    SELECT s.*, h.hostel_name, r.room_type
    FROM students s
    LEFT JOIN hostels h ON s.hostel_id = h.hostel_id
    LEFT JOIN rooms r ON s.room_id = r.room_id
    WHERE s.student_id = ?;
  `;

  connection.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("❌ SQL Error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      console.log("⚠️ No student found for:", userId);
      return res.status(404).json({ error: "No student record found" });
    }

    console.log("✅ Student found:", results[0]);
    res.json(results[0]);
  });
});


// ✅ Fetch all hostels under a specific admin
app.get('/admin/hostels/:admin_id', (req, res) => {
  const adminId = req.params.admin_id;

  const query = `
    SELECT 
      hostel_id,
      hostel_name,
      address ,
      total_rooms 
    FROM hostels
    WHERE admin_id = ?;
  `;

  connection.query(query, [adminId], (err, results) => {
   if (err) {
      console.error("❌ DB Error:", err.sqlMessage || err.message);
      return res.status(500).json({ error: err.sqlMessage || err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "No hostels found for this admin." });
    }

    console.log(`✅ Hostels fetched for admin ${adminId}:`, results);
    res.json(results);
  });
});

// Example: Get all students for the logged-in admin
app.get('/admin/students', (req, res) => {
  const adminId = req.query.admin_id;

  const query = `
    SELECT s.student_id, s.f_name, s.l_name, s.room_id, s.hostel_id,h.hostel_name
    FROM students s
    JOIN hostels h ON s.hostel_id = h.hostel_id
    WHERE h.admin_id = ?;
  `;

  connection.query(query, [adminId], (err, results) => {
    if (err) return res.status(500).send('Database error');
    res.json(results);
  });
});

// Show all rooms + hostels + student booking status
app.get('/api/rooms', (req, res) => {
  const userId = req.query.user_id;

  const query = `
    SELECT 
      h.hostel_name, r.room_id,  r.room_type,
      r.occupied, r.status, r.rent,
      CASE 
        WHEN s.room_id = r.room_id THEN 'booked'
        ELSE r.status
      END AS booking_status
    FROM rooms r
    JOIN hostels h ON r.hostel_id = h.hostel_id
    LEFT JOIN students s ON s.student_id = ?
    ORDER BY h.hostel_name, r.room_id;
  `;

  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error loading rooms:', err);
      return res.status(500).json({ message: 'Error loading rooms', error: err });
    }
    res.json(results);
  });
});

// Book a room
app.post('/api/book-room', (req, res) => {
  const { room_id, student_id } = req.body;

  const checkQuery = 'SELECT room_id FROM students WHERE student_id = ?';
  connection.query(checkQuery, [student_id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    if (result[0]?.room_id) {
      return res.status(400).json({ message: 'You already have a booked room.' });
    }

    const updateRoom = `
      UPDATE rooms 
      SET occupied = occupied + 1,
          status = CASE WHEN occupied + 1 >= capacity THEN 'full' ELSE 'available' END
      WHERE room_id = ?;
    `;
    connection.query(updateRoom, [room_id], err2 => {
      if (err2) return res.status(500).json({ message: 'Error updating room', error: err2 });

      const updateStudent = 'UPDATE students SET room_id = ? WHERE student_id = ?';
      connection.query(updateStudent, [room_id, student_id], err3 => {
        if (err3) return res.status(500).json({ message: 'Error booking room', error: err3 });
        res.json({ message: 'Room booked successfully!' });
      });
    });
  });
});

app.get("/api/payment/:student_id", (req, res) => {
  const { student_id } = req.params;

  const query = `
    SELECT s.student_id, s.room_id, r.rent, f.*
    FROM students s
    LEFT JOIN rooms r ON s.room_id = r.room_id
    LEFT JOIN fee_payments f ON s.student_id = f.student_id
    WHERE s.student_id = ?;
  `;

  connection.query(query, [student_id], (err, results) => {
    if (err) {
      console.error("❌ Fetch error:", err);
      return res.json({ error: "Database error fetching payment data." });
    }

    if (results.length === 0) {
      return res.json({ error: "Student not found." });
    }

    const data = results[0];

    // If no payment record, create one automatically
    if (!data.fee_payment_id) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 7-day due period

      const insertQuery = `
        INSERT INTO fee_payments (student_id, amount, due_date, status)
        VALUES (?, ?, ?, 'unpaid');
      `;

      connection.query(insertQuery, [student_id, data.rent, dueDate], (insertErr) => {
        if (insertErr) {
          console.error("❌ Insert error:", insertErr);
          return res.json({ error: "Could not create fee payment record." });
        }

        connection.query(query, [student_id], (err2, updated) => {
          if (err2) return res.json({ error: "Error refetching payment record." });
          const row = updated[0];
          res.json({
            student: { student_id: row.student_id, room_id: row.room_id },
            payment: {
              fee_payment_id: row.fee_payment_id,
              amount: row.rent,
              due_date: row.due_date,
              payment_date: row.payment_date,
              status: row.status,
              payment_method: row.payment_method,
              transaction_id: row.transaction_id,
              remarks: row.remarks
            }
          });
        });
      });
    } else {
      // Payment exists already
      res.json({
        student: { student_id: data.student_id, room_id: data.room_id },
        payment: {
          fee_payment_id: data.fee_payment_id,
          amount: data.amount || data.rent,
          due_date: data.due_date,
          payment_date: data.payment_date,
          status: data.status,
          payment_method: data.payment_method,
          transaction_id: data.transaction_id,
          remarks: data.remarks
        }
      });
    }
  });
});

// 🧩 POST payment update (mark as paid)
app.post("/api/pay/:student_id", (req, res) => {
  const { student_id } = req.params;
  const { payment_method, remarks } = req.body;

  const transaction_id = "TXN" + Date.now();
  const payment_date = new Date();

  const updateQuery = `
    UPDATE fee_payments
    SET status='paid',
        payment_method=?,
        transaction_id=?,
        remarks=?,
        payment_date=?
    WHERE student_id=?;
  `;

  connection.query(
    updateQuery,
    [payment_method, transaction_id, remarks, payment_date, student_id],
    (err, result) => {
      if (err) {
        console.error("❌ Payment update error:", err);
        return res.json({ error: "Failed to update payment." });
      }

      if (result.affectedRows === 0) {
        return res.json({ error: "No record found for student." });
      }

      res.json({ message: "Payment successful! 🎉" });
    }
  );
});

// Serve main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "studentpay.html"));
});

//admin manage hoste and rooms
app.get('/admin/manage/:admin_id', (req, res) => {
  const adminId = req.params.admin_id;

  const query = `
    SELECT 
      h.hostel_id, h.hostel_name, h.address,
      r.room_id, r.room_number, r.room_type, r.capacity,
      f.payment_id, f.amount, f.status AS payment_status
    FROM hostels h
    JOIN rooms r ON h.hostel_id = r.hostel_id
    LEFT JOIN fee_payments f ON r.room_id = f.room_id
    JOIN admins a ON h.admin_id = a.admin_id
    WHERE a.admin_id = ?;
  `;

  connection.query(query, [adminId], (err, results) => {
    if (err) {
      console.error("❌ Database Error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);
  });
});






const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));