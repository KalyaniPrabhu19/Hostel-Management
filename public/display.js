async function fetchStudents() {
  const response = await fetch("/display");
  const students = await response.json();

  const table = document.getElementById("studentTable");
  table.innerHTML = "";

  if (students.length === 0) {
    table.innerHTML = `<tr><td colspan="2" class="py-2">No students found</td></tr>`;
    return;
  }

  students.forEach(student => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border py-2">${student.Student_id}</td>
      <td class="border py-2">${student.Student_name}</td>
    `;
    table.appendChild(row);
  });
}

window.onload = fetchStudents;
