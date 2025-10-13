document.getElementById("studentForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const student_id = document.getElementById("student_id").value;
  const student_name = document.getElementById("student_name").value;

  const response = await fetch("/entry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id, student_name }),
  });

  const result = await response.text();
  alert(result);
  document.getElementById("studentForm").reset();
});
