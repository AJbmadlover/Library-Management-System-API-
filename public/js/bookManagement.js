import {start}  from './universalFunctions.js'
start();

import {returnHeader}  from './universalFunctions.js'

const headers = returnHeader();

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
      alert(message);
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

  //  // === ➕ DOM ELEMENT SELECTORS ========================
  const form = document.querySelector("form");
  const titleInput = form.querySelector('input[name="title"]');
  const authorInput = form.querySelector('input[name="author"]');
  const categoryInput = form.querySelector('select[name="category"]');
  const pubYear = form.querySelector('input[name="publishedYear"]');
  const isbnInput = form.querySelector('input[name="isbn"]');  
  const totalCopy = form.querySelector('input[name="totalCopies"]');
  const availableCopy = form.querySelector('input[name="availableCopies"]');
  const submitBtn = form.querySelector('button[type="submit"]');
  const errorBox = document.querySelector(".error-message");
  const successBox = document.querySelector(".success-message");
  const booksTable = document.querySelector(".added tbody");
  
// ================Load books (for table)==============================

let allBooks = []; // empty array to keep books for later 
let showingAll = false; // toggle state
const toggleBtn = document.getElementById("toggleBooks");

  try{
      const booksRes = await fetch("/api/books", { headers });
      if (!booksRes.ok) throw new Error("Failed to fetch books");
      const books = await booksRes.json();
      allBooks = books; //stores all books
      renderBooks(books);  
  }catch(error){
    console.error(error);
  }


  // === 🧾 RENDER TRANSACTIONS TABLE ==============================
function renderBooks(books) {
  booksTable.innerHTML = "";

  if (!books.length) {
    booksTable.innerHTML =
      '<tr><td colspan="6">No books found</td></tr>';
    return;
  }

  // ✅ Sort by createdAt (newest first)
  const sortedBooks = books.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // ✅ Show either 5 or all based on toggle state
    const visibleBooks = sortedBooks.filter(book => !book.isDeleted);
    const displayBooks = showingAll ? visibleBooks : visibleBooks.slice(0, 5);
// Create a fragment to minimize DOM updates...  instead of the DOM being refreshed every time the a new row is rendered the fragment will be updated instead 
    const fragment = document.createDocumentFragment();

  
  displayBooks.forEach((book) => {


    const tr = document.createElement("tr");
    const date = new Date(book.createdAt).toLocaleDateString();
    const appendCategory =
    book.category.charAt(0).toUpperCase() +
    book.category.slice(1).toLowerCase();
    
    tr.innerHTML = `
      <td>${book.title}</td>
      <td>${book.author}</td>
      <td>${appendCategory}</td>
      <td>${book.availableCopies}</td>
      <td>${date}</td>
      <td>
        <button class="edit" data-id="${book._id}">✏️</button>
        <button class="delete" data-id="${book._id}">🗑</button>
      </td>
    `;
    fragment.appendChild(tr); //so we append the table row in the fragment then... we append the table with the fragment.

  });

  booksTable.appendChild(fragment);

  // Update button text based on state
  toggleBtn.textContent = showingAll ? "Show Less" : "Show More"; 
}

toggleBtn.addEventListener("click", () => {
  showingAll = !showingAll;
  renderBooks(allBooks);
});


form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const author = authorInput.value.trim();
  const category = categoryInput.value.trim();
  const publishedYear = Number(pubYear.value);
  const isbn = isbnInput.value.trim();
  const totalCopies = Number(totalCopy.value);
  const availableCopies = Number(availableCopy.value);

  submitBtn.disabled = true;
  showError("");

  try {
    // Send new book to the backend
    const res = await fetch("/api/books/add", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title,
        author,
        category,
        publishedYear,
        isbn,
        totalCopies,
        availableCopies
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error("Error adding book.");
    }
    showSuccess("Book added successfully!");

    const newBook = data.newBook;
    const bookId = newBook._id;

    // ✅ Create the row manually and prepend
    const newRow = document.createElement("tr");
    const date = new Date(newBook.createdAt).toLocaleDateString();


    newRow.innerHTML = `
      <td>${title}</td>
      <td>${author}</td>
      <td>${category}</td>
      <td>${availableCopies}</td>
      <td>${date}</td>
      <td>
        <button class="edit" data-id="${bookId}">✏️</button>
        <button class="delete" data-id="${bookId}">🗑</button>
      </td>
    `;


    booksTable.prepend(newRow);

    // Reset form fields
    form.reset();

    // ✅ Add to allBooks array
    allBooks.unshift(newBook);
  } catch (error) {
    console.error(error);
    showError(error.message || "Error adding book.");
  } finally {
    submitBtn.disabled = false;
  }
});



  // === ❌ DELETE BOOK =====================================
  booksTable.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("delete")) return;

    const id = e.target.dataset.id;
    if (!id) return showError("No ID found for this transaction");

    const confirmDelete = confirm(
      "Are you sure you want to delete this book?"
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/books/${id}`, {
        method: "DELETE",
        headers,
      });

      if (res.ok) {
        // ✅ Update allBooks
        const bookIndex = allBooks.findIndex(b => b._id === id);
        if (bookIndex > -1) {
          allBooks[bookIndex].isDeleted = true;
      }

      // ✅ Re-render table to show top 5
      renderBooks(allBooks);
      showSuccess("Book deleted successfully!");
      } else {
        showError("Failed to delete book.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      showError("Error deleting book.");
    }
  });


  // === ✏️ UPDATE TRANSACTION (MODAL) =============================
  const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const closeBtn = editModal.querySelector(".close");

// === OPEN MODAL ===
booksTable.addEventListener("click", async (e) => {
  if (e.target.classList.contains("edit")) {
    const id = e.target.dataset.id;
    const row = e.target.closest("tr");
    const cells = row.querySelectorAll("td");

    // Fill modal inputs with current data
    try{
     const res = await fetch(`/api/books/${id}`,{headers})
     if(!res.ok){
      showError("Unable to fetch book data.")
     }
     const bookRes = await res.json();

    editForm.id.value = bookRes._id;
    editForm.title.value =bookRes.title
    editForm.author.value = bookRes.author
    editForm.category.value = bookRes.category
    editForm.availableCopies.value = bookRes.availableCopies
    editForm.publishedYear.value = bookRes.publishedYear
    editForm.isbn.value = bookRes.isbn
    editForm.totalCopies.value = bookRes.totalCopies
    }
    catch(error){
      console.error(error);
    }


    editModal.style.display = "block";
  }
});

// === CLOSE MODAL ===
closeBtn.onclick = () => (editModal.style.display = "none");
window.onclick = (e) => {
  if (e.target == editModal) editModal.style.display = "none";
};

// === SUBMIT EDITS ===
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = editForm.id.value;
  const updatedBook = {
    title: editForm.title.value.trim(),
    author: editForm.author.value.trim(),
    category: editForm.category.value,
    publishedYear: Number(editForm.publishedYear.value),
    isbn: editForm.isbn.value.trim(),
    totalCopies: Number(editForm.totalCopies.value),
    availableCopies: Number(editForm.availableCopies.value),
  };

  try {
    const res = await fetch(`/api/books/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(updatedBook),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Update failed.");

    const returnedData = data.updatedBook;

    // ✅ Update the table row instantly
    const editedRow = booksTable.querySelector(`button[data-id="${id}"]`).closest("tr");
    editedRow.innerHTML = `
      <td>${returnedData.title}</td>
      <td>${returnedData.author}</td>
      <td>${returnedData.category}</td>
      <td>${returnedData.availableCopies}</td>
      <td>${new Date(returnedData.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="edit" data-id="${returnedData._id}">✏️</button>
        <button class="delete" data-id="${returnedData._id}">🗑</button>
      </td>
    `;

    editModal.style.display = "none";
    showSuccess("Book updated successfully! It will return upon refresh");
    booksTable.prepend(editedRow);
  } catch (err) {
    console.error(err);
    showError(err.message);
  }
});
