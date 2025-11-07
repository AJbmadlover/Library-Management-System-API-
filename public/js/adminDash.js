document.addEventListener("DOMContentLoaded", async () => {
  // --- 🔐 Retrieve JWT token from localStorage or sessionStorage
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  if (!token) {
    window.location.href = "/api/users/login";
    return;
  }
  //includes token in header for authorization
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

// ===== Sidebar toggle (mobile)
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

// ===== Dark mode toggle
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Load saved theme
if (localStorage.getItem('theme') === 'dark') {
  body.classList.add('dark');
  themeToggle.textContent = '☀️';
}

// Toggle theme
themeToggle.addEventListener('click', () => {
  body.classList.toggle('dark');
  const isDark = body.classList.contains('dark');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// DOM elements
const welcomeText = document.getElementById("admin-name");
const cards = document.querySelectorAll(".card p");
const borrowRecordsTable = document.querySelector(".borrowed tbody");
// --- ✨ Show temporary loading states
  welcomeText.textContent = "Loading...";
  cards[0].textContent = "Loading...";
  cards[1].textContent = "Loading...";
  cards[2].textContent = "Loading...";
  cards[3].textContent = "Loading...";

  borrowRecordsTable.innerHTML =
    '<tr><td colspan="4">Loading records...</td></tr>';

try {
    // --- 1️⃣ Fetch user profile
    const profileRes = await fetch("/api/users/myprofile", { headers });
    if (!profileRes.ok) throw new Error("Failed to fetch profile");
    const profile = await profileRes.json();

    welcomeText.textContent = `Welcome, ${profile.user.name}`;

   // --- 2️⃣ Fetch summary
    const summaryRes = await fetch("/api/summary", { headers });
    if (!summaryRes.ok) throw new Error("Failed to fetch summary");
    const summary = await summaryRes.json();

    cards[0].textContent = `${summary.stats.totalUsers.toLocaleString()}`;
    cards[1].textContent = `${summary.stats.totalBooks.toLocaleString()}`;
    cards[2].textContent = `${summary.stats.borrowedBooks.toLocaleString()}`;
    cards[3].textContent = `${summary.stats.overdueBooks.toLocaleString()}`;



    //CHARTS 
    // 🎨 Render Bar Chart (monthly trends)
    const ctxBar = document.getElementById("activityChart");
    new Chart(ctxBar, {
      type: "bar",
      data: {
        labels: summary.charts.monthlyChart.map(d => d.month),
        datasets: [{
          label: "Books Borrowed",
          data: summary.charts.monthlyChart.map(d => d.count),
          backgroundColor: "#4f46e5"
        }]
      }
    });
    // 🎨 Render Pie Chart 
    const ctxPie = document.getElementById("categoryChart");
    new Chart(ctxPie, {
      type: "doughnut",
      data: {
        labels: summary.charts.categoryChart.map(d => d.label),
        datasets: [{
          data: summary.charts.categoryChart.map(d => d.value),
          backgroundColor: ["#6366f1", "#22d3ee", "#f59e0b", "#ef4444"]
        }]
      }
    });

  // --- 3️⃣ Fetch Borrow Records
    const borrowedRes = await fetch("/api/borrowed", { headers });
    if (!borrowedRes.ok) throw new Error("Failed to fetch borrow records");
    const borrowRecords = await borrowedRes.json();

    // --- 🧾 Clear placeholder rows
    borrowRecordsTable.innerHTML = "";

    if (borrowRecords.length === 0) {
      borrowRecordsTable.innerHTML =
        '<tr><td colspan="4">No records found</td></tr>';
    } else {
      borrowRecords.forEach((record) => {
        const tr = document.createElement("tr");

        let bDate =new Date(record.borrowDate);
        let rDate = new Date(record.dueDate);
        tr.innerHTML = `
          <td>${record.user.name}</td>
          <td>${record.book.title}</td>
          <td>${bDate.toLocaleDateString()}</td>
          <td>${rDate.toLocaleDateString()}</td>
          <td>${record.status}</td>
        `;
        borrowRecordsTable.appendChild(tr);
      });
    }


}
catch(error){
  console.error(error);
  borrowRecordsTable.innerHTML = 
      '<tr><td colspan="4">Error loading records.</td></tr>';
}



  // --- 🚪 Logout functionality
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    window.location.href = "/api/users/login";
  });

});