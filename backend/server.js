const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer config — saves photos to /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// POST /posts — upload a photo
app.post('/posts', upload.single('image'), (req, res) => {
  const { caption, user_id } = req.body;
  const image_path = req.file.filename;
  db.run(
    `INSERT INTO posts (user_id, image_path, caption) VALUES (?, ?, ?)`,
    [user_id, image_path, caption],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// GET /posts — get all posts (newest first)
app.get('/posts', (req, res) => {
  db.all(
    `SELECT posts.*, users.username FROM posts
     JOIN users ON posts.user_id = users.id
     ORDER BY posts.created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// POST /posts/:id/like — toggle like
app.post('/posts/:id/like', (req, res) => {
  const { user_id } = req.body;
  const post_id = req.params.id;
  db.get(`SELECT id FROM likes WHERE user_id=? AND post_id=?`, [user_id, post_id], (err, row) => {
    if (row) {
      db.run(`DELETE FROM likes WHERE user_id=? AND post_id=?`, [user_id, post_id], () => {
        db.run(`UPDATE posts SET likes = likes - 1 WHERE id=?`, [post_id]);
        res.json({ liked: false });
      });
    } else {
      db.run(`INSERT INTO likes (user_id, post_id) VALUES (?,?)`, [user_id, post_id], () => {
        db.run(`UPDATE posts SET likes = likes + 1 WHERE id=?`, [post_id]);
        res.json({ liked: true });
      });
    }
  });
});

// POST /register
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function (err) {
    if (err) return res.status(400).json({ error: 'Username already taken' });
    res.json({ id: this.lastID, username });
  });
});

// POST /login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username=? AND password=?`, [username, password], (err, row) => {
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ id: row.id, username: row.username });
  });
});

app.listen(3001, () => console.log('Server running on http://localhost:3001'));