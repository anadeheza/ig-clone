import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001';

// ─── Auth Screen ───────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    try {
      const url = isRegister ? `${API}/register` : `${API}/login`;
      const res = await axios.post(url, { username, password });
      onLogin(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong');
    }
  };

  return (
    <div style={styles.authWrap}>
      <div style={styles.authBox}>
        <h1 style={styles.logo}>📸 Picsgram</h1>
        <input style={styles.input} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input style={styles.input} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.btn} onClick={submit}>{isRegister ? 'Sign Up' : 'Log In'}</button>
        <p style={styles.switchText}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <span style={styles.link} onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? ' Log in' : ' Sign up'}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── Upload Form ────────────────────────────────────────────────
function UploadForm({ user, onUploaded }) {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files[0];
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append('image', file);
    form.append('caption', caption);
    form.append('user_id', user.id);
    await axios.post(`${API}/posts`, form);
    setFile(null); setCaption(''); setPreview(null);
    setLoading(false);
    onUploaded();
  };

  return (
    <div style={styles.uploadBox}>
      <label style={styles.fileLabel}>
        {preview ? <img src={preview} alt="preview" style={styles.preview} /> : <span>+ Choose photo</span>}
        <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </label>
      <input style={styles.input} placeholder="Write a caption…" value={caption} onChange={e => setCaption(e.target.value)} />
      <button style={styles.btn} onClick={submit} disabled={!file || loading}>
        {loading ? 'Uploading…' : 'Share'}
      </button>
    </div>
  );
}

function Comments({ post, user }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);

  const fetchComments = async () => {
    const res = await axios.get(`${API}/posts/${post.id}/comments`);
    setComments(res.data);
  };

  const toggleOpen = () => {
    if(!open) fetchComments();
    setOpen(!open);
  };

  const submit = async () => {
    if (!text.trim()) return;
    await axios.post(`${API}/posts/${post.id}/comments`, { user_id: user.id, text });
    setText('');
    fetchComments();
  };

  return (
    <div>
      <button style={styles.commentToggle} onClick={toggleOpen}>
        💬 {open ? 'Hide' : 'View'} comments
      </button>
      {open && (
        <div style={styles.commentsBox}>
          {comments.length === 0
            ? <p style={styles.noComments}>No comments yet.</p>
            : comments.map(c => (
                <div key={c.id} style={styles.comment}>
                  <strong>{c.username}</strong> {c.text}
                </div>
              ))
          }
          <div style={styles.commentInput}>
            <input
              style={{ ...styles.input, flex: 1 }}
              placeholder="Add a comment…"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
            <button style={styles.postBtn} onClick={submit}>Post</button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Post Card
function PostCard({ post, user, onLike }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.avatar}>{post.username[0].toUpperCase()}</div>
        <strong>{post.username}</strong>
      </div>
      <img src={`${API}/uploads/${post.image_path}`} alt={post.caption} style={styles.cardImg} />
      <div style={styles.cardBody}>
        <button style={styles.likeBtn} onClick={() => onLike(post.id)}>♥</button>
        <span style={styles.likeCount}>{post.likes} {post.likes === 1 ? 'like' : 'likes'}</span>
        {post.caption && (
          <p style={styles.caption}><strong>{post.username}</strong> {post.caption}</p>
        )}
        <Comments post={post} user={user} />
      </div>
    </div>
  );
}


// ─── Feed
function Feed({ user }) {
  const [posts, setPosts] = useState([]);
  const [showUpload, setShowUpload] = useState(false);

  const fetchPosts = async () => {
    const res = await axios.get(`${API}/posts`);
    setPosts(res.data);
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleLike = async (post_id) => {
    await axios.post(`${API}/posts/${post_id}/like`, { user_id: user.id });
    fetchPosts();
  };

  return (
    <div style={styles.page}>
      <div style={styles.navbar}>
        <span style={styles.logo}>📸 Picsgram</span>
        <button style={styles.iconBtn} onClick={() => setShowUpload(!showUpload)}>＋</button>
      </div>
      {showUpload && <UploadForm user={user} onUploaded={() => { fetchPosts(); setShowUpload(false); }} />}
      <div style={styles.feed}>
        {posts.length === 0
          ? <p style={{ textAlign: 'center', color: '#aaa', marginTop: 60 }}>No posts yet. Be the first!</p>
          : posts.map(p => <PostCard key={p.id} post={p} user={user} onLike={handleLike} />)
        }
      </div>
    </div>
  );
}

// ─── App Root
export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (u) => {
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;
  return (
    <>
      <Feed user={user} />
      <div style={styles.logoutBar}>
        Logged in as <strong>{user.username}</strong>
        <button style={styles.logoutBtn} onClick={handleLogout}>Log out</button>
      </div>
    </>
  );
}

// ─── Styles 
const styles = {
  commentToggle: { background: 'none', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer', padding: '4px 0', marginTop: 6 },
  commentsBox: { marginTop: 8, borderTop: '1px solid #efefef', paddingTop: 8 },
  noComments: { fontSize: 13, color: '#aaa', margin: '4px 0 8px' },
  comment: { fontSize: 14, marginBottom: 6, lineHeight: 1.5 },
  commentInput: { display: 'flex', gap: 8, marginTop: 8 },
  postBtn: { background: 'none', border: 'none', color: '#0095f6', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  page: { background: '#fafafa', minHeight: '100vh', fontFamily: 'sans-serif' },
  navbar: { background: '#fff', borderBottom: '1px solid #eee', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 },
  logo: { fontSize: 22, fontWeight: 700, color: '#262626', textDecoration: 'none' },
  iconBtn: { fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', color: '#262626' },
  feed: { maxWidth: 470, margin: '0 auto', padding: '20px 0' },
  card: { background: '#fff', border: '1px solid #efefef', borderRadius: 8, marginBottom: 24 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 },
  cardImg: { width: '100%', display: 'block' },
  cardBody: { padding: '12px 16px' },
  likeBtn: { background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#e0245e', padding: '0 0 4px 0' },
  likeCount: { display: 'block', fontWeight: 700, fontSize: 14, marginBottom: 6 },
  caption: { fontSize: 14, margin: 0, lineHeight: 1.5 },
  uploadBox: { maxWidth: 470, margin: '16px auto', background: '#fff', border: '1px solid #efefef', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 },
  fileLabel: { border: '2px dashed #dbdbdb', borderRadius: 6, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', color: '#aaa', fontSize: 18 },
  preview: { width: '100%', height: '100%', objectFit: 'cover' },
  input: { border: '1px solid #dbdbdb', borderRadius: 6, padding: '10px 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  btn: { background: '#0095f6', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 700, fontSize: 15, cursor: 'pointer', width: '100%' },
  authWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', fontFamily: 'sans-serif' },
  authBox: { background: '#fff', border: '1px solid #efefef', borderRadius: 8, padding: 40, width: 350, display: 'flex', flexDirection: 'column', gap: 12 },
  error: { color: '#e0245e', fontSize: 13, margin: 0, textAlign: 'center' },
  switchText: { fontSize: 13, textAlign: 'center', color: '#555' },
  link: { color: '#0095f6', cursor: 'pointer', fontWeight: 600 },
  logoutBar: { position: 'fixed', bottom: 0, width: '100%', background: '#fff', borderTop: '1px solid #eee', padding: '10px 20px', fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 12 },
  logoutBtn: { background: 'none', border: '1px solid #dbdbdb', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13 },
};