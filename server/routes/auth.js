import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { generateToken, authRequired } from '../middleware/auth.js';

const router = Router();

// 注册
router.post('/register', (req, res) => {
  const { username, password, phone, nickname } = req.body;

  if (!username || !password || !phone) {
    return res.status(400).json({ error: '用户名、密码和手机号为必填项' });
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: '手机号格式不正确' });
  }
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: '用户名长度2-20个字符' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }

  // 检查手机号是否已注册
  const existingPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (existingPhone) {
    return res.status(400).json({ error: '该手机号已被注册' });
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) {
    return res.status(400).json({ error: '用户名已存在' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, password, phone, nickname) VALUES (?, ?, ?, ?)'
  ).run(username, hashedPassword, phone, nickname || username);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user);

  // 记录活动
  db.prepare('INSERT INTO activity_log (user_id, action, detail) VALUES (?, ?, ?)').run(
    user.id, 'register', '注册了账号'
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar, role: user.role, phone: user.phone, bio: user.bio, theme_color: user.theme_color },
  });
});

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(400).json({ error: '用户名不存在' });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: '密码错误' });
  }

  if (user.is_banned) {
    return res.status(403).json({ error: '账号已被禁言: ' + user.ban_reason });
  }

  const token = generateToken(user);
  db.prepare("UPDATE users SET last_active = datetime('now','localtime') WHERE id = ?").run(user.id);
  db.prepare('INSERT INTO activity_log (user_id, action, detail) VALUES (?, ?, ?)').run(
    user.id, 'login', '登录了'
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar, role: user.role, phone: user.phone, bio: user.bio, theme_color: user.theme_color },
  });
});

// 获取当前用户信息
router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT id, username, nickname, avatar, role, phone, bio, theme_color, created_at, last_active FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

export default router;
