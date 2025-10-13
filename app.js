const express= require("express");
const app= express();
const path=require("path");
const bodyparser=require("body-parser")
const connection= require('./models/db')

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "start.html"));
});

app.post("/entry", (req, res) => {
  const { student_id, student_name } = req.body;
  const sql = "INSERT INTO student (student_id, student_name) VALUES (?, ?)";
  connection.query(sql, [student_id, student_name], (err) => {
    if (err) res.send("Error inserting data");
    else res.send("Student added successfully!");
  });
});

app.get("/display", (req, res) => {
  const sql = "SELECT * FROM student";
  connection.query(sql, (err, results) => {
    if (err) res.json([]);
    else res.json(results);
  });
});

const PORT=3000
app.listen(PORT,()=>{
    console.log(`server running on port ${PORT}`);
});

