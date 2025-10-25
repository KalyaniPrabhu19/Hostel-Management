const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user_id = document.getElementById("user_id").value;
  const password = document.getElementById("password").value;

  const response = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, password }),
  });

  const data = await response.json();
  localStorage.setItem("user_id", user_id);

  console.log("✅ Logged in:", data);

  // Save the entire user object
localStorage.setItem("user", JSON.stringify({
  user_id: data.user_id,
  role: data.role
}));

// Redirect based on role
if (data.role === "admin") {
  window.location.href = "/admin.html";
} else {
  window.location.href = "/student.html";
}

});
