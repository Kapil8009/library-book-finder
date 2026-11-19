# Library Book Finder (QR Code)

A static website that helps students find a library book: scan the library QR code, search by title, author, subject or ISBN, and get the exact floor, section, rack and shelf. Built with HTML5, CSS3 and vanilla JavaScript only. No backend, no build step.

> **Frontend-only demo.** The admin panel has no secure login, and its changes are saved in each browser's localStorage. They are not shared between devices.

## Features
- Live search with suggestions, category and availability filters, search history, recently viewed and popular books
- Book details with a Library → Section → Rack → Shelf path, print view and shareable link
- CSS floor map with highlighted section and rack; tap a rack to list its books
- Camera QR scanner (with image-upload and manual fallbacks)
- Admin: add, edit, delete, availability toggle, search, JSON import/export, reset
- QR generator with PNG download and print

## Project structure
```
library-book-finder/
├── index.html
├── css/style.css
├── js/
│   ├── app.js        navigation, search, details, layout map
│   ├── books.js      sample data + localStorage helper
│   ├── scanner.js    camera QR scanning
│   └── admin.js      admin panel + QR generator
├── assets/images/favicon.svg
└── README.md
```

## External libraries (CDN)
| Library | Use | URL |
|---|---|---|
| jsQR 1.4.0 | Read QR codes | `https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js` |
| qrcodejs 1.0.0 | Generate QR codes | `https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js` |
| Google Fonts | Fraunces and Inter (falls back to system fonts) | `fonts.googleapis.com` |

## Edit the book list
Open `js/books.js` and add a line to `DEFAULT_BOOKS`:
```js
b("B027", "Title", "Author", "978-0-00-000000-0", "Computer Science", "A-05", "03", "Available", 50),
```
Section and floor are filled in from the rack letter. Section-to-subject mapping is in `SECTIONS`.
Note: if a browser already has saved admin changes, it shows those instead of the file. Use **Admin → Reset to sample data** to reload the file.

To publish admin changes to everyone: Admin → **Export JSON**, copy the records into `DEFAULT_BOOKS`, and push to GitHub.

## Upload to GitHub
1. Create a free account at github.com and click **New repository**.
2. Name it `library-book-finder`, set it to **Public**, and click **Create repository**.
3. Click **uploading an existing file**, drag in the *contents* of the project folder (`index.html`, `css`, `js`, `assets`, `README.md`), and click **Commit changes**.
   Or from a terminal inside the project folder:
   ```bash
   git init
   git add .
   git commit -m "Library Book Finder"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/library-book-finder.git
   git push -u origin main
   ```

## Deploy on GitHub Pages
1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch **main**, folder **/ (root)**, and click **Save**.
4. After about a minute your site is live at `https://YOUR-USERNAME.github.io/library-book-finder/`.

## Create the library QR code
1. Open your live site and go to **Admin**.
2. In **QR code generator**, paste your GitHub Pages URL.
3. Click **Generate QR code**, then **Download PNG** or **Print QR code**.
4. Print it and display it at the library entrance and on shelf ends. You can also generate a code that opens one specific book.

## Camera scanning notes
- The in-site scanner needs **https** (GitHub Pages provides it) and camera permission.
- If permission was blocked, tap the lock icon in the address bar, allow Camera, and reload.
- Students can also scan with their phone's normal camera app, which opens the site directly.

## Troubleshooting
- **QR scanner or generator does nothing:** the CDN scripts did not load. Check your internet connection.
- **Edits to `books.js` don't appear:** the browser is showing saved admin data. Use Reset to sample data.
- **QR code opens a "localhost" address:** generate it again with your real GitHub Pages URL.
