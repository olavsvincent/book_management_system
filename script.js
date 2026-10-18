
const STORAGE_KEY = "bookvault_books_v1";

const form = document.getElementById("bookForm");
const formPanel = document.getElementById("formPanel");
const bookTable = document.getElementById("bookTable");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const filterCategory = document.getElementById("filterCategory");
const filterStatus = document.getElementById("filterStatus");
const toast = document.getElementById("toast");

let books = loadBooks();
let toastTimer;

function loadBooks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    if (!Array.isArray(stored)) return [];

    return stored.filter(book =>
      book &&
      typeof book.id === "string" &&
      typeof book.title === "string" &&
      typeof book.author === "string" &&
      typeof book.category === "string" &&
      typeof book.status === "string"
    );
  } catch {
    return [];
  }
}

function saveBooks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    return true;
  } catch {
    showToast("Unable to save. Check your browser storage.");
    return false;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function openForm(book = null) {
  form.reset();

  document.getElementById("editId").value = book?.id || "";
  document.getElementById("formTitle").textContent =
    book ? "Edit Book" : "Add New Book";

  document.getElementById("saveBtn").textContent =
    book ? "Update Book" : "Save Book";

  if (book) {
    document.getElementById("title").value = book.title;
    document.getElementById("author").value = book.author;
    document.getElementById("category").value = book.category;
    document.getElementById("year").value = book.year;
    document.getElementById("isbn").value = book.isbn || "";
    document.getElementById("status").value = book.status;
  } else {
    document.getElementById("year").value = new Date().getFullYear();
    document.getElementById("status").value = "Available";
  }

  formPanel.hidden = false;
  formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("title").focus();
}

function closeForm() {
  formPanel.hidden = true;
  form.reset();
}

document.getElementById("addBookBtn").addEventListener("click", () => {
  openForm();
});

document.getElementById("closeForm").addEventListener("click", closeForm);
document.getElementById("cancelForm").addEventListener("click", closeForm);

form.addEventListener("submit", event => {
  event.preventDefault();

  const id = document.getElementById("editId").value;
  const title = document.getElementById("title").value.trim();
  const author = document.getElementById("author").value.trim();
  const category = document.getElementById("category").value;
  const year = Number(document.getElementById("year").value);
  const isbn = document.getElementById("isbn").value.trim();
  const status = document.getElementById("status").value;

  if (!title || !author || !category) {
    showToast("Please complete all required fields.");
    return;
  }

  if (!Number.isInteger(year) || year < 1 ||
      year > new Date().getFullYear() + 5) {
    showToast("Please enter a valid publication year.");
    return;
  }

  const duplicateISBN = isbn && books.some(book =>
    book.isbn &&
    book.isbn.toLowerCase() === isbn.toLowerCase() &&
    book.id !== id
  );

  if (duplicateISBN) {
    showToast("A book with this ISBN already exists.");
    return;
  }

  const existing = books.find(book => book.id === id);

  const book = {
    id: id || (
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2)
    ),
    title,
    author,
    category,
    year,
    isbn,
    status
  };

  if (existing) {
    books = books.map(item => item.id === id ? book : item);
  } else {
    books.unshift(book);
  }

  if (!saveBooks()) {
    books = loadBooks();
    renderBooks();
    return;
  }

  closeForm();
  renderBooks();
  showToast(existing ? "Book updated successfully." : "Book added successfully.");
});

function deleteBook(id) {
  const book = books.find(item => item.id === id);
  if (!book) return;

  if (!confirm(`Delete "${book.title}" from your collection?`)) return;

  const previousBooks = books;
  books = books.filter(item => item.id !== id);

  if (!saveBooks()) {
    books = previousBooks;
    return;
  }

  renderBooks();
  showToast("Book deleted successfully.");
}

function toggleStatus(id) {
  const previousBooks = books;

  books = books.map(book => {
    if (book.id !== id) return book;

    return {
      ...book,
      status: book.status === "Available" ? "Borrowed" : "Available"
    };
  });

  if (!saveBooks()) {
    books = previousBooks;
    return;
  }

  renderBooks();
  showToast("Book status updated.");
}

function createCell(content) {
  const cell = document.createElement("td");
  cell.textContent = content;
  return cell;
}

function createBookCell(book) {
  const cell = document.createElement("td");

  const title = document.createElement("span");
  title.className = "book-title";
  title.textContent = book.title;

  const author = document.createElement("span");
  author.className = "book-author";
  author.textContent = "by " + book.author;

  cell.append(title, author);
  return cell;
}

function createStatusCell(book) {
  const cell = document.createElement("td");
  const badge = document.createElement("span");

  badge.className = "badge " +
    (book.status === "Available" ? "available" : "borrowed");

  badge.textContent = book.status;
  cell.appendChild(badge);

  return cell;
}

function createActionsCell(book) {
  const cell = document.createElement("td");
  const actions = document.createElement("div");
  actions.className = "actions";

  const edit = document.createElement("button");
  edit.className = "action-btn";
  edit.textContent = "Edit";
  edit.addEventListener("click", () => openForm(book));

  const status = document.createElement("button");
  status.className = "action-btn";
  status.textContent = book.status === "Available" ? "Borrow" : "Return";
  status.addEventListener("click", () => toggleStatus(book.id));

  const remove = document.createElement("button");
  remove.className = "action-btn delete";
  remove.textContent = "Delete";
  remove.addEventListener("click", () => deleteBook(book.id));

  actions.append(edit, status, remove);
  cell.appendChild(actions);

  return cell;
}

function renderBooks() {
  const search = searchInput.value.trim().toLowerCase();
  const category = filterCategory.value;
  const status = filterStatus.value;

  const filtered = books.filter(book => {
    const matchesSearch = [
      book.title,
      book.author,
      book.isbn || ""
    ].some(value => value.toLowerCase().includes(search));

    const matchesCategory = !category || book.category === category;
    const matchesStatus = !status || book.status === status;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  bookTable.replaceChildren();

  filtered.forEach(book => {
    const row = document.createElement("tr");

    row.append(
      createBookCell(book),
      createCell(book.isbn || "—"),
      createCell(book.category),
      createCell(String(book.year)),
      createStatusCell(book),
      createActionsCell(book)
    );

    bookTable.appendChild(row);
  });

  emptyState.hidden = filtered.length !== 0;

  document.getElementById("bookCount").textContent =
    `Showing ${filtered.length} of ${books.length} books`;

  document.getElementById("totalBooks").textContent = books.length;

  document.getElementById("availableBooks").textContent =
    books.filter(book => book.status === "Available").length;

  document.getElementById("borrowedBooks").textContent =
    books.filter(book => book.status === "Borrowed").length;

  document.getElementById("totalCategories").textContent =
    new Set(books.map(book => book.category)).size;
}

searchInput.addEventListener("input", renderBooks);
filterCategory.addEventListener("change", renderBooks);
filterStatus.addEventListener("change", renderBooks);

document.getElementById("clearAllBtn").addEventListener("click", () => {
  if (books.length === 0) {
    showToast("Your collection is already empty.");
    return;
  }

  if (!confirm("Delete ALL books from your collection? This cannot be undone.")) {
    return;
  }

  const previousBooks = books;
  books = [];

  if (!saveBooks()) {
    books = previousBooks;
    renderBooks();
    return;
  }

  renderBooks();
  showToast("Collection cleared.");
});

renderBooks();
