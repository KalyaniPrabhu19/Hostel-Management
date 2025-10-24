document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const user_id = document.getElementById("user_id").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, password }),
    });

    const data = await response.json();
    console.log("Response:", data);

    if (response.ok) {
      alert(`✅ Login successful! Role: ${data.role}`);
      // Example redirect
      if (data.role === "admin") {
        window.location.href = "/admin.html";
      } else {
        window.location.href = "/student.html";
      }
    } else {
      alert(`❌ ${data.message}`);
    }
  } catch (err) {
    console.error("Fetch error:", err);
    alert("Server not responding");
  }
});
