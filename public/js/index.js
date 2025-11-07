const bookGrid = document.getElementById("booksContainer");
const searchInput = document.getElementById("searchInput");

async function fetchBooks(query = "") {
  try {
    let url = "/api/books";
    if (query) {
      url += `?search=${encodeURIComponent(query)}`;
    }

    const res = await fetch(url);
    const books = await res.json();
    displayBooks(books);
  } catch (err) {
    console.error(err);
    bookGrid.innerHTML = `<p style="text-align:center;color:#bfc9d6;">Error fetching books</p>`;
  }
}
function displayBooks(books) {
  bookGrid.innerHTML = "";

  if (!books.length) {
    bookGrid.innerHTML = `<p style="text-align:center;color:#bfc9d6;">No books found</p>`;
    return;
  }

  books.forEach((book) => {
    const card = document.createElement("div");
    card.classList.add("book-card");

    card.innerHTML = `
      <div class="book-title">${book.title}</div>
      <div class="book-author">By: ${book.author}</div>
      <div class="book-category">Category: ${book.category}</div>
    `;

    bookGrid.appendChild(card);
  });
}

// live search
searchInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  if (query === "") {
    // Clear the grid if input is empty
    bookGrid.innerHTML = "";
    return;
  }
  fetchBooks(query);
});

