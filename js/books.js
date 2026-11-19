/* ==========================================================================
   books.js — Library data + localStorage helper
   --------------------------------------------------------------------------
   EDIT THIS FILE to change the default catalogue.
   Add a book by adding one line to DEFAULT_BOOKS using the helper  b(...):
   b(id, title, author, isbn, category, rack, shelf, status, popularity)
   - section and floor are filled in automatically from the rack letter.
   - status is "Available" or "Issued".
   - popularity is any number; higher shows first in "Popular books".
   ========================================================================== */

const CATEGORIES = ["Computer Science", "Mathematics", "Physics", "Chemistry", "English", "History", "General Knowledge"];
const FLOORS = ["Ground Floor", "First Floor", "Second Floor"];
const RACKS_PER_SECTION = 8;
const SHELVES_PER_RACK = 5;

/* Which section holds which subject, and on which floor. */
const SECTIONS = {
  A: { category: "Computer Science",  floor: "Ground Floor" },
  B: { category: "Mathematics",       floor: "Ground Floor" },
  C: { category: "Physics",           floor: "Ground Floor" },
  D: { category: "Chemistry",         floor: "First Floor" },
  E: { category: "English",           floor: "First Floor" },
  F: { category: "History",           floor: "First Floor" },
  G: { category: "General Knowledge", floor: "Second Floor" }
};

/* Build one book record. Section/floor come from the rack letter (e.g. "A-05"). */
function b(id, title, author, isbn, category, rack, shelf, status, popularity) {
  const section = rack.charAt(0);
  return { id, title, author, isbn, category, section, floor: SECTIONS[section].floor, rack, shelf, status, popularity };
}

/* Sample data. ISBNs are illustrative; replace them with your catalogue. */
const DEFAULT_BOOKS = [
  b("B001", "Introduction to Computer Science", "John Smith", "978-0-13-468599-1", "Computer Science", "A-05", "03", "Available", 95),
  b("B002", "Introduction to Algorithms", "Thomas H. Cormen", "978-0-262-03384-8", "Computer Science", "A-02", "01", "Issued", 90),
  b("B003", "Operating System Concepts", "Abraham Silberschatz", "978-1-119-80036-3", "Computer Science", "A-03", "02", "Available", 70),
  b("B004", "Computer Networks", "Andrew S. Tanenbaum", "978-0-13-212695-3", "Computer Science", "A-04", "04", "Available", 66),
  b("B005", "Database System Concepts", "Abraham Silberschatz", "978-0-07-802215-9", "Computer Science", "A-06", "02", "Issued", 58),
  b("B006", "Clean Code", "Robert C. Martin", "978-0-13-235088-4", "Computer Science", "A-07", "05", "Available", 80),
  b("B007", "Calculus: Early Transcendentals", "James Stewart", "978-1-285-74155-0", "Mathematics", "B-01", "02", "Available", 72),
  b("B008", "Linear Algebra and Its Applications", "Gilbert Strang", "978-0-03-010567-8", "Mathematics", "B-03", "03", "Available", 60),
  b("B009", "Discrete Mathematics and Its Applications", "Kenneth H. Rosen", "978-0-07-338309-5", "Mathematics", "B-04", "01", "Issued", 64),
  b("B010", "Higher Engineering Mathematics", "B. S. Grewal", "978-8-17-409195-5", "Mathematics", "B-06", "04", "Available", 55),
  b("B011", "Concepts of Physics, Vol. 1", "H. C. Verma", "978-8-17-709187-8", "Physics", "C-02", "02", "Available", 85),
  b("B012", "The Feynman Lectures on Physics", "Richard P. Feynman", "978-0-465-02382-4", "Physics", "C-05", "01", "Available", 68),
  b("B013", "Fundamentals of Physics", "David Halliday", "978-1-118-23072-5", "Physics", "C-03", "05", "Issued", 62),
  b("B014", "A Brief History of Time", "Stephen Hawking", "978-0-553-38016-3", "Physics", "C-07", "03", "Available", 74),
  b("B015", "Organic Chemistry", "Paula Y. Bruice", "978-0-13-404228-2", "Chemistry", "D-02", "03", "Available", 57),
  b("B016", "Physical Chemistry", "Peter Atkins", "978-0-19-856786-0", "Chemistry", "D-04", "02", "Issued", 52),
  b("B017", "Concise Inorganic Chemistry", "J. D. Lee", "978-0-632-05293-6", "Chemistry", "D-05", "04", "Available", 48),
  b("B018", "Pride and Prejudice", "Jane Austen", "978-0-14-143951-8", "English", "E-01", "01", "Available", 77),
  b("B019", "Wren & Martin High School English Grammar", "P. C. Wren", "978-8-12-190018-6", "English", "E-03", "02", "Available", 61),
  b("B020", "1984", "George Orwell", "978-0-452-28423-4", "English", "E-06", "05", "Issued", 83),
  b("B021", "India After Gandhi", "Ramachandra Guha", "978-0-06-095858-9", "History", "F-02", "02", "Available", 59),
  b("B022", "Sapiens: A Brief History of Humankind", "Yuval Noah Harari", "978-0-06-231609-7", "History", "F-04", "03", "Available", 88),
  b("B023", "The Discovery of India", "Jawaharlal Nehru", "978-0-19-562359-8", "History", "F-05", "01", "Available", 50),
  b("B024", "Manorama Yearbook", "Mammen Mathew", "978-8-18-958951-0", "General Knowledge", "G-01", "02", "Available", 54),
  b("B025", "Lucent's General Knowledge", "Dr. Binay Karna", "978-9-38-541726-5", "General Knowledge", "G-03", "04", "Issued", 65),
  b("B026", "Wings of Fire", "A. P. J. Abdul Kalam", "978-8-17-371146-6", "General Knowledge", "G-05", "01", "Available", 79)
];

/* localStorage helper. Every call is wrapped in try/catch because storage can
   be blocked (private mode, strict browser settings). */
const Store = {
  KEYS: { books: "lbf_books_v1", recent: "lbf_recent", history: "lbf_history", views: "lbf_views" },

  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  },

  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  },

  /* Returns saved books, or a fresh copy of the defaults. */
  loadBooks() {
    const saved = this.read(this.KEYS.books, null);
    if (Array.isArray(saved) && saved.every(Store.isValid)) return saved;
    return JSON.parse(JSON.stringify(DEFAULT_BOOKS));
  },

  saveBooks(list) { return this.write(this.KEYS.books, list); },

  resetBooks() {
    try { localStorage.removeItem(this.KEYS.books); } catch (e) { /* ignore */ }
    return JSON.parse(JSON.stringify(DEFAULT_BOOKS));
  },

  /* A record is valid when every field we display exists. */
  isValid(x) {
    return x && ["id", "title", "author", "isbn", "category", "section", "floor", "rack", "shelf", "status"]
      .every(k => typeof x[k] === "string" && x[k].length) && (x.status === "Available" || x.status === "Issued");
  }
};
