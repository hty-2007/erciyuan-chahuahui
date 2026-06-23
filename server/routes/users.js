import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'public', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uuidv4() + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

// 获取用户主页
router.get('/:id', authRequired, (req, res) => {
  const user = db.prepare(`
    SELECT id, username, nickname, avatar, bio, role, theme_color, created_at, last_active
    FROM users WHERE id = ?
  `).get(req.params.id);

  if (!user) return res.status(404).json({ error: '用户不存在' });

  // 粉丝数
  const followers = db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(user.id);
  // 关注数
  const following = db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(user.id);
  // 帖子数
  const postsCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(user.id);
  // 帖子列表
  const posts = db.prepare(`
    SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(user.id);

  // 是否已关注
  const isFollowing = db.prepare(
    'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?'
  ).get(req.user.id, user.id);

  // 活动记录
  const activities = db.prepare(
    'SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(user.id);

  res.json({
    ...user,
    followers_count: followers.count,
    following_count: following.count,
    posts_count: postsCount.count,
    posts,
    is_following: !!isFollowing,
    activities,
  });
});

// 关注/取消关注
router.post('/:id/follow', authRequired, (req, res) => {
  if (req.user.id === Number(req.params.id)) {
    return res.status(400).json({ error: '不能关注自己' });
  }

  const existing = db.prepare(
    'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?'
  ).get(req.user.id, req.params.id);

  if (existing) {
    db.prepare('DELETE FROM follows WHERE id = ?').run(existing.id);
    res.json({ following: false });
  } else {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    db.prepare('INSERT INTO activity_log (user_id, action, detail) VALUES (?, ?, ?)').run(
      req.user.id, 'follow', '关注了用户ID: ' + req.params.id
    );
    res.json({ following: true });
  }
});

// 更新个人资料
router.put('/profile', authRequired, upload.single('avatar'), (req, res) => {
  const { nickname, bio, theme_color } = req.body;
  const updates = [];
  const params = [];

  if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname); }
  if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
  if (theme_color !== undefined) { updates.push('theme_color = ?'); params.push(theme_color); }
  if (req.file) { updates.push('avatar = ?'); params.push('/uploads/' + req.file.filename); }

  if (updates.length === 0) {
    return res.status(400).json({ error: '没有要更新的字段' });
  }

  params.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const user = db.prepare('SELECT id, username, nickname, avatar, bio, role, theme_color, phone FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// 修改密码
router.put('/password', authRequired, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请填写旧密码和新密码' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少6位' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(400).json({ error: '旧密码错误' });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
  res.json({ message: '密码修改成功' });
});

// 获取收藏列表
router.get('/:id/favorites', authRequired, (req, res) => {
  const posts = db.prepare(`
    SELECT p.*, u.username, u.nickname, u.avatar
    FROM favorites f
    JOIN posts p ON f.post_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(req.params.id);
  res.json(posts);
});

// 搜索用户
router.get('/search/users', authRequired, (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const users = db.prepare(
    'SELECT id, username, nickname, avatar FROM users WHERE username LIKE ? OR nickname LIKE ? LIMIT 20'
  ).all(`%${q}%`, `%${q}%`);
  res.json(users);
});

export default router;
