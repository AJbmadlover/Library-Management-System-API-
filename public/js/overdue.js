import {start}  from './universalFunctions.js'
start();

import {returnHeader}  from './universalFunctions.js'

const headers = returnHeader();
const errorBox = document.querySelector(".error-message");
const successBox = document.querySelector(".success-message");

  // === 🌍 UNIVERSAL FUNCTIONS =====================================
function showError(message) {
    if (errorBox) {
      errorBox.textContent = message;
      errorBox.style.display = message ? "block" : "none";

      if (message) {
      setTimeout(() => {
        errorBox.style.display = "none";
      }, 3000);
    }
    } else if (message) {
      console.error(message);
    }
}

function showSuccess(message) {
    if (successBox) {
      successBox.textContent = message;
      successBox.style.display = message ? "block" : "none";

      if (message) {
      setTimeout(() => {
        successBox.style.display = "none";
      }, 3000);
    }
    } else if (message) {
      alert(message);
    }       
}

const cards = document.querySelectorAll(".card p");

cards[0].textContent = "Loading...";

async function getOverDueCount() {
    try{
        const res = await fetch ("/api/summary", {headers});

        if(!res.ok)return 

        const result = await res.json();

        cards[0].textContent = `${result.stats.overdueBooks.toLocaleString()}`;
}
catch(error){
    console.error(error.message)
    showError(error.message);
}
}
setInterval(getOverDueCount, 2000);


//TABLE DATA 
// TABLE DATA
const tableBody = document.querySelector(".overdue tbody");

async function renderTable() {
    if (!tableBody) return;

try {
  const res = await fetch("/api/overdue", { headers });
  if (!res.ok) {
    showError(`Failed to load overdue list (${res.status})`);
    return;
  }

  const result = await res.json();
  const records = result.records;

  if (records.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6">No Activity</td></tr>';
  } else {
    tableBody.innerHTML = ""; // clear old rows

    records.forEach((record, i) => {
      const subject = "Overdue Book Notice";
      const body = encodeURIComponent(
        `Dear Sir/Ma,

You currently have a book '${record.book.title}' that is due for return and has accumulated a fine of ₦${record.fine}.
Please come to the library for an extension or return.

Thank you.`
      );

      const mailLink = `mailto:${record.user.email}?subject=${subject}&body=${body}`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${record.user.name}</td>
        <td>${record.book.title}</td>
        <td>₦${record.fine}</td>
        <td>${record.user.email}</td>
        <td class="mail" data-mail="${mailLink}">📧</td>
      `;
      tableBody.appendChild(tr);
    });

    // Attach click handlers to all mail icons
    const mailIcons = document.querySelectorAll(".mail");
    mailIcons.forEach((icon) => {
      icon.addEventListener("click", (e) => {
        const mailLink = e.target.dataset.mail;
        if (!mailLink) return showError("No mail link found for this record");

        console.log("Opening email client...");
        window.location.href = mailLink; // ✅ Opens user’s mail app with prefilled content
      });
    });
  }
} catch (err) {
  console.error(err);
  showError("Something went wrong while loading overdue records.");
}

}

renderTable();
setInterval(renderTable, 5000);
// === Show More / Show Less Toggle ===
const toggleBtn = document.getElementById("toggleRecords");
let showingAll = false;
const rowsToShow = 5;

function updateTableDisplay() {
  const rows = tableBody.querySelectorAll("tr");
  if (rows.length <= rowsToShow) {
    toggleBtn.style.display = "none"; // hide toggle if not enough rows
    return;
  }

  toggleBtn.style.display = "block";
  rows.forEach((row, i) => {
    row.style.display = showingAll || i < rowsToShow ? "" : "none";
  });

  toggleBtn.textContent = showingAll ? "Show Less" : "Show More";
}

toggleBtn.addEventListener("click", () => {
  showingAll = !showingAll;
  updateTableDisplay();
});

// Call this after table is populated
updateTableDisplay();
