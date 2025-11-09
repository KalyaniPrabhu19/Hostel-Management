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

// Sign-up route
app.post('/sign-up', async (req, res) => {
  const { user_id, password, role } = req.body;

  try {
    const hashedPassword = await hash(password, 10);
    const query = 'INSERT INTO users (user_id, password, role) VALUES (?, ?, ?)';

    connection.query(query, [user_id, hashedPassword, role], (err, result) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res.status(500).json({ message: 'Database error', error: err.message });
      }

      console.log("✅ Signed-up:", user_id, "as", role);

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
app.get("/student/:user_id", (req, res) => {
  const { user_id } = req.params;
  const sql = `SELECT * FROM students WHERE student_id = ?`;

  connection.query(sql, [user_id], (err, result) => {
    if (err) {
      console.error("❌ Error fetching student details:", err);
      return res.status(500).json({ message: "Server error" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(result[0]); // send all details
  });
});

// ✅ Save or update student details
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

//manage
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

// Get all students belonging to hostels managed by a specific admin
app.get("/admin/students", (req, res) => {
  const { admin_id } = req.query;
  if (!admin_id) {
    return res.status(400).json({ message: "Missing admin_id" });
  }

  const query = `
    SELECT 
      s.student_id,
      s.f_name,
      s.student_email_Id,
      s.student_phone,
      s.guardian_name,
      s.guardian_phone,
      h.hostel_name,
      s.room_id,
      p.amount AS payment_amount,
      p.status AS payment_status
    FROM students s
    INNER JOIN hostels h ON s.hostel_id = h.hostel_id
    LEFT JOIN fee_payments p ON s.student_id = p.student_id
    WHERE h.admin_id = ?;
  `;

  connection.query(query, [admin_id], (err, rows) => {
    if (err) {
      console.error("❌ Error fetching students:", err);
      return res.status(500).json({ message: "Server error", error: err.message });
    }
    res.json(rows);
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
  console.log("📩 Booking attempt received:", { room_id, student_id });

  if (!room_id || !student_id) {
    return res.status(400).json({ message: "Missing room_id or student_id" });
  }

  // 1️⃣ Check if student already has a room
  const checkStudent = 'SELECT room_id FROM students WHERE student_id = ?';
  connection.query(checkStudent, [student_id], (err, studentResult) => {
    if (err) {
      console.error("❌ Error checking student:", err);
      return res.status(500).json({ message: "Error checking student", error: err });
    }

    if (studentResult.length > 0 && studentResult[0].room_id) {
      console.log("⚠️ Student already booked:", studentResult[0].room_id);
      return res.status(400).json({ message: "You already have a booked room." });
    }

    // 2️⃣ Get room info
    const getRoom = 'SELECT hostel_id, capacity FROM rooms WHERE room_id = ?';
    connection.query(getRoom, [room_id], (err2, roomResult) => {
      if (err2) {
        console.error("❌ Error fetching room:", err2);
        return res.status(500).json({ message: "Error fetching room", error: err2 });
      }

      if (roomResult.length === 0) {
        console.log("⚠️ Room not found");
        return res.status(404).json({ message: "Room not found" });
      }

      const { hostel_id, capacity } = roomResult[0];
      console.log(`🏠 Found room ${room_id} under hostel ${hostel_id}, capacity ${capacity}`);

      // 3️⃣ Count how many students already booked this room
      const countQuery = 'SELECT COUNT(*) AS bookedCount FROM students WHERE room_id = ?';
      connection.query(countQuery, [room_id], (err3, countResult) => {
        if (err3) {
          console.error("❌ Error counting bookings:", err3);
          return res.status(500).json({ message: "Error counting bookings", error: err3 });
        }

        const bookedCount = countResult[0].bookedCount;
        console.log(`👥 Already booked: ${bookedCount}/${capacity}`);

        if (bookedCount >= capacity) {
          console.log("🚫 Room is full");
          return res.status(400).json({ message: "Room is already full." });
        }

        // 4️⃣ Update student with room_id and hostel_id
        const updateStudent = `
          UPDATE students
          SET room_id = ?, hostel_id = ?
          WHERE student_id = ?;
        `;
        connection.query(updateStudent, [room_id, hostel_id, student_id], (err4, updateResult) => {
          if (err4) {
            console.error("❌ Error updating student:", err4);
            return res.status(500).json({ message: "Error updating student", error: err4 });
          }

          console.log(`📝 Student ${student_id} updated with room ${room_id}, hostel ${hostel_id}`);

          // 5️⃣ Check total count again & update room status
          const countAgain = `
            SELECT COUNT(*) AS bookedCount, capacity
            FROM rooms
            LEFT JOIN students ON rooms.room_id = students.room_id
            WHERE rooms.room_id = ?;
          `;
          connection.query(countAgain, [room_id], (err5, result5) => {
            if (err5) {
              console.error("❌ Error counting after booking:", err5);
              return res.status(500).json({ message: "Error updating room", error: err5 });
            }

            const bookedCountAfter = result5[0].bookedCount;
            const capacityAfter = result5[0].capacity;
            const newStatus = bookedCountAfter >= capacityAfter ? 'full' : 'available';

            const updateRoomStatus = 'UPDATE rooms SET status = ? WHERE room_id = ?';
            connection.query(updateRoomStatus, [newStatus, room_id], (err6) => {
              if (err6) {
                console.error("❌ Error updating room status:", err6);
                return res.status(500).json({ message: "Error updating room", error: err6 });
              }

              console.log(`✅ Room ${room_id} now marked as '${newStatus}'`);
              res.json({
                message: "Room booked successfully!",
                student_id,
                room_id,
                hostel_id,
                room_status: newStatus,
              });
            });
          });
        });
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

//  POST payment update (mark as paid)
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

//admin manage hostel and rooms
app.get("/admin/data/:admin_id", (req, res) => {
  const { admin_id } = req.params;

  const query = `
    SELECT 
      h.hostel_id, h.hostel_name,
      r.room_id, r.room_type, r.status,
      f.student_id, f.amount, f.status AS payment_status, f.payment_date
    FROM hostels h
    LEFT JOIN rooms r ON h.hostel_id = r.hostel_id
    LEFT JOIN students s ON s.hostel_id = h.hostel_id
    LEFT JOIN fee_payments f ON f.student_id = s.student_id
    WHERE h.admin_id = ?;
  `;

  connection.query(query, [admin_id], (err, results) => {
    if (err) return res.json({ success: false, message: err.message });

    const hostelsMap = {};

    results.forEach(row => {
      if (!hostelsMap[row.hostel_id]) {
        hostelsMap[row.hostel_id] = {
          hostel_id: row.hostel_id,
          hostel_name: row.hostel_name,
          rooms: new Map(),
          payments: new Map()
        };
      }

      // ✅ Deduplicate rooms using Map
      if (row.room_id && !hostelsMap[row.hostel_id].rooms.has(row.room_id)) {
        hostelsMap[row.hostel_id].rooms.set(row.room_id, {
          room_id: row.room_id,
          room_type: row.room_type,
          status: row.status
        });
      }

      // ✅ Deduplicate payments using student_id + amount combo key
      if (row.student_id && row.amount !== null) {
        const key = `${row.student_id}-${row.amount}-${row.payment_date}`;
        if (!hostelsMap[row.hostel_id].payments.has(key)) {
          hostelsMap[row.hostel_id].payments.set(key, {
            student_id: row.student_id,
            amount: row.amount,
            status: row.payment_status,
            payment_date: row.payment_date
          });
        }
      }
    });

    // Convert maps to arrays before sending
    const hostels = Object.values(hostelsMap).map(h => ({
      hostel_id: h.hostel_id,
      hostel_name: h.hostel_name,
      rooms: Array.from(h.rooms.values()),
      payments: Array.from(h.payments.values())
    }));

    res.json({ success: true, hostels });
  });
});

app.post("/admin/register-student", async (req, res) => {
  const {
    user_id, password, // user table fields
    roll_no, f_name, m_name, l_name, department, course_year,
    student_phone, student_email_Id, dob, gender, age,
    guardian_name, guardian_phone
  } = req.body;
try {
    // ✅ 1️⃣ Hash the password before inserting
    const hashedPassword = await hash(password, 10); // saltRounds = 10

    // ✅ 2️⃣ Insert into users table first
    await connection.query(
      `INSERT INTO users (user_id, password, role) VALUES (?, ?, ?)`,
      [user_id, hashedPassword, "student"]
    );


    // 2️⃣ Insert into students table (student_id = user_id)
    await connection.query(
      `INSERT INTO students (
        student_id, roll_no, f_name, m_name, l_name, department, course_year,
        student_phone, student_email_Id, dob, gender, age, guardian_name, guardian_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id, roll_no, f_name, m_name, l_name, department, course_year,
        student_phone, student_email_Id, dob, gender, age, guardian_name, guardian_phone
      ]
    );

    res.json({ message: "Student registered successfully", student_id: user_id });
  } catch (err) {
    console.error("❌ Error registering student:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all rooms (for admin)
app.get("/admin/rooms", (req, res) => {
  const admin_id = req.query.admin_id; // pass this from frontend later

  if (!admin_id) {
    return res.status(400).json({ message: "Missing admin_id in query." });
  }

  // Query: fetch rooms belonging to hostels managed by this admin
  const query = `
    SELECT 
      r.room_id, 
      r.room_type, 
      r.status, 
      r.rent, 
      h.hostel_name
    FROM rooms r
    INNER JOIN hostels h ON r.hostel_id = h.hostel_id
    WHERE h.admin_id = ?
  `;

  connection.query(query, [admin_id], (err, results) => {
    if (err) {
      console.error("Error fetching rooms:", err);
      return res.status(500).json({ message: "Server error" });
    }

    res.json(results);
  });
});

app.post('/admin/book-room', (req, res) => {
  const { room_id, student_id } = req.body;
  console.log("📩 Booking attempt received:", { room_id, student_id });

  if (!room_id || !student_id) {
    return res.status(400).json({ message: "Missing room_id or student_id" });
  }

  // 1️⃣ Check if student already has a room
  const checkStudent = 'SELECT room_id FROM students WHERE student_id = ?';
  connection.query(checkStudent, [student_id], (err, studentResult) => {
    if (err) {
      console.error("❌ Error checking student:", err);
      return res.status(500).json({ message: "Error checking student", error: err });
    }

    if (studentResult.length > 0 && studentResult[0].room_id) {
      console.log("⚠️ Student already booked:", studentResult[0].room_id);
      return res.status(400).json({ message: "You already have a booked room." });
    }

    // 2️⃣ Get room info
    const getRoom = 'SELECT hostel_id, capacity FROM rooms WHERE room_id = ?';
    connection.query(getRoom, [room_id], (err2, roomResult) => {
      if (err2) {
        console.error("❌ Error fetching room:", err2);
        return res.status(500).json({ message: "Error fetching room", error: err2 });
      }

      if (roomResult.length === 0) {
        console.log("⚠️ Room not found");
        return res.status(404).json({ message: "Room not found" });
      }

      const { hostel_id, capacity } = roomResult[0];
      console.log(`🏠 Found room ${room_id} under hostel ${hostel_id}, capacity ${capacity}`);

      // 3️⃣ Count how many students already booked this room
      const countQuery = 'SELECT COUNT(*) AS bookedCount FROM students WHERE room_id = ?';
      connection.query(countQuery, [room_id], (err3, countResult) => {
        if (err3) {
          console.error("❌ Error counting bookings:", err3);
          return res.status(500).json({ message: "Error counting bookings", error: err3 });
        }

        const bookedCount = countResult[0].bookedCount;
        console.log(`👥 Already booked: ${bookedCount}/${capacity}`);

        if (bookedCount >= capacity) {
          console.log("🚫 Room is full");
          return res.status(400).json({ message: "Room is already full." });
        }

        // 4️⃣ Update student with room_id and hostel_id
        const updateStudent = `
          UPDATE students
          SET room_id = ?, hostel_id = ?
          WHERE student_id = ?;
        `;
        connection.query(updateStudent, [room_id, hostel_id, student_id], (err4, updateResult) => {
          if (err4) {
            console.error("❌ Error updating student:", err4);
            return res.status(500).json({ message: "Error updating student", error: err4 });
          }

          console.log(`📝 Student ${student_id} updated with room ${room_id}, hostel ${hostel_id}`);

          // 5️⃣ Check total count again & update room status
          const countAgain = `
            SELECT COUNT(*) AS bookedCount, capacity
            FROM rooms
            LEFT JOIN students ON rooms.room_id = students.room_id
            WHERE rooms.room_id = ?;
          `;
          connection.query(countAgain, [room_id], (err5, result5) => {
            if (err5) {
              console.error("❌ Error counting after booking:", err5);
              return res.status(500).json({ message: "Error updating room", error: err5 });
            }

            const bookedCountAfter = result5[0].bookedCount;
            const capacityAfter = result5[0].capacity;
            const newStatus = bookedCountAfter >= capacityAfter ? 'full' : 'available';

            const updateRoomStatus = 'UPDATE rooms SET status = ? WHERE room_id = ?';
            connection.query(updateRoomStatus, [newStatus, room_id], (err6) => {
              if (err6) {
                console.error("❌ Error updating room status:", err6);
                return res.status(500).json({ message: "Error updating room", error: err6 });
              }

              console.log(`✅ Room ${room_id} now marked as '${newStatus}'`);
              res.json({
                message: "Room booked successfully!",
                student_id,
                room_id,
                hostel_id,
                room_status: newStatus,
              });
            });
          });
        });
      });
    });
  });
});

app.get("/student/:user_id/admin", (req, res) => {
  const userId = req.params.user_id;

  const query = `
    SELECT 
      a.admin_name, 
      a.admin_email, 
      a.admin_phone, 
      h.hostel_name
    FROM students s
    JOIN hostels h ON s.hostel_id = h.hostel_id
    JOIN admins a ON h.admin_id = a.admin_id
    WHERE s.student_id = ?;
  `;

  connection.query(query, [userId], (err, result) => {
    if (err) {
      console.error("Error fetching admin details:", err);
      return res.status(500).json({ message: "Error fetching admin details", error: err });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "No admin found for this student" });
    }

    res.json(result[0]);
  });
});


const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));