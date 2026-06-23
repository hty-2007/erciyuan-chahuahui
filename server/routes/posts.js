import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'public', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

// 获取帖子列表（按置顶优先 + 时间降序）
router.get('/', authRequired, (req, res) => {
  const { topic, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = '';
  const params = [];
  if (topic && topic !== '全部') {
    where = 'WHERE p.topic = ?';
    params.push(topic);
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM posts p ${where}`).get(...params);
  const posts = db.prepare(`
    SELECT p.*, u.username, u.nickname, u.avatar
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ${where}
    ORDER BY p.is_pinned DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  res.json({ posts, total: countRow.total, page: Number(page), limit: Number(limit) });
});

// 获取单个帖子
router.get('/:id', authRequired, (req, res) => {
  const post = db.prepare(`
    SELECT p.*, u.username, u.nickname, u.avatar
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!post) return res.status(404).json({ error: '帖子不存在' });

  // 更新浏览量
  db.prepare('UPDATE posts SET views_count = views_count + 1 WHERE id = ?').run(post.id);

  // 获取评论
  const comments = db.prepare(`
    SELECT c.*, u.username, u.nickname, u.avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(post.id);

  // 当前用户是否点赞/收藏
  const liked = db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(req.user.id, post.id);
  const favorited = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND post_id = ?').get(req.user.id, post.id);

  res.json({ ...post, comments, is_liked: !!liked, is_favorited: !!favorited });
});

// 创建帖子
router.post('/', authRequired, upload.single('image'), (req, res) => {
  const { title, content, topic } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }

  const image = req.file ? '/uploads/' + req.file.filename : '';
  const result = db.prepare(
    'INSERT INTO posts (user_id, title, content, topic, image) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, title, content, topic || '闲聊', image);

  db.prepare('INSERT INTO activity_log (user_id, action, detail) VALUES (?, ?, ?)').run(
    req.user.id, 'create_post', '发布了帖子: ' + title
  );

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
  res.json({ ...post, username: req.user.username, nickname: req.user.nickname, avatar: req.user.avatar });
});

// 评论帖子
router.post('/:id/comment', authRequired, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '评论内容不能为空' });

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  const result = db.prepare(
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)'
  ).run(req.params.id, req.user.id, content);

  db.prepare('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?').run(req.params.id);

  const comment = db.prepare(`
    SELECT c.*, u.username, u.nickname, u.avatar
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.json(comment);
});

// 点赞/取消点赞
router.post('/:id/like', authRequired, (req, res) => {
  const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
    db.prepare('UPDATE posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(req.params.id);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    db.prepare('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?').run(req.params.id);
    res.json({ liked: true });
  }
});

// 收藏/取消收藏
router.post('/:id/favorite', authRequired, (req, res) => {
  const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND post_id = ?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
    db.prepare('UPDATE posts SET favorites_count = MAX(0, favorites_count - 1) WHERE id = ?').run(req.params.id);
    res.json({ favorited: false });
  } else {
    db.prepare('INSERT INTO favorites (user_id, post_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    db.prepare('UPDATE posts SET favorites_count = favorites_count + 1 WHERE id = ?').run(req.params.id);
    res.json({ favorited: true });
  }
});

export default router;
