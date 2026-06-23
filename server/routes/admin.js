import { Router } from 'express';
import db from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = Router();

// 所有管理后台路由都需要登录+管理员权限
router.use(authRequired, adminRequired);

// ===== 仪表盘统计 =====
router.get('/dashboard', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get();
  const totalComments = db.prepare('SELECT COUNT(*) as count FROM comments').get();
  const totalLikes = db.prepare('SELECT COUNT(*) as count FROM likes').get();
  const todayUsers = db.prepare(
    "SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now','localtime')"
  ).get();
  const todayPosts = db.prepare(
    "SELECT COUNT(*) as count FROM posts WHERE date(created_at) = date('now','localtime')"
  ).get();
  const bannedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_banned = 1').get();
  const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get();
  const totalGroupMessages = db.prepare('SELECT COUNT(*) as count FROM group_messages').get();

  // 最近7天每天注册数
  const dailyRegistrations = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM users
    WHERE created_at >= date('now','localtime', '-6 days')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all();

  // 最近7天每天发帖数
  const dailyPosts = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM posts
    WHERE created_at >= date('now','localtime', '-6 days')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all();

  res.json({
    totalUsers: totalUsers.count,
    totalPosts: totalPosts.count,
    totalComments: totalComments.count,
    totalLikes: totalLikes.count,
    todayUsers: todayUsers.count,
    todayPosts: todayPosts.count,
    bannedUsers: bannedUsers.count,
    totalMessages: totalMessages.count,
    totalGroupMessages: totalGroupMessages.count,
    dailyRegistrations,
    dailyPosts,
  });
});

// ===== 用户管理 =====

// 获取用户列表（支持搜索、排序）
router.get('/users', (req, res) => {
  const { q, sort = 'created_at', order = 'desc', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = '';
  const params = [];
  if (q) {
    where = 'WHERE u.username LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const allowedSorts = ['created_at', 'last_active', 'username', 'id'];
  const sortBy = allowedSorts.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const total = db.prepare(`SELECT COUNT(*) as count FROM users u ${where}`).get(...params);
  const users = db.prepare(`
    SELECT u.*,
      (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count,
      (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comments_count,
      (SELECT COUNT(*) FROM likes WHERE user_id = u.id) as likes_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count
    FROM users u
    ${where}
    ORDER BY u.${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  res.json({ users, total: total.count, page: Number(page), limit: Number(limit) });
});

// 获取用户详细信息（包含活动历史）
router.get('/users/:id', (req, res) => {
  const user = db.prepare(`
    SELECT u.*,
      (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count,
      (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comments_count,
      (SELECT COUNT(*) FROM likes WHERE user_id = u.id) as likes_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count
    FROM users u WHERE u.id = ?
  `).get(req.params.id);

  if (!user) return res.status(404).json({ error: '用户不存在' });

  const activities = db.prepare(
    'SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(user.id);

  const posts = db.prepare(
    'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'
  ).all(user.id);

  res.json({ ...user, activities, posts });
});

// 禁言/解禁用户
router.put('/users/:id/ban', (req, res) => {
  const { is_banned, reason } = req.body;
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.username === 'admin') return res.status(400).json({ error: '不能禁言管理员' });

  db.prepare('UPDATE users SET is_banned = ?, ban_reason = ? WHERE id = ?').run(
    is_banned ? 1 : 0, reason || '', req.params.id
  );

  db.prepare('INSERT INTO activity_log (user_id, action, detail) VALUES (?, ?, ?)').run(
    req.user.id, is_banned ? 'ban_user' : 'unban_user',
    `${is_banned ? '禁言' : '解禁'}用户: ${user.username}, 原因: ${reason || '无'}`
  );

  res.json({ message: is_banned ? '已禁言用户' : '已解禁用户' });
});

// 注销用户
router.delete('/users/:id', (req, res) => {
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.username === 'admin') return res.status(400).json({ error: '不能注销管理员' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

  db.prepare('INSERT INTO activity_log (user_id, action, detail) VALUES (?, ?, ?)').run(
    req.user.id, 'delete_user', '注销用户: ' + user.username
  );

  res.json({ message: '已注销用户' });
});

// ===== 帖子管理 =====

// 获取所有帖子（管理员视图）
router.get('/posts', (req, res) => {
  const { q, topic, sort = 'created_at', order = 'desc', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = [];
  const params = [];
  if (q) { where.push('(p.title LIKE ? OR p.content LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (topic && topic !== '全部') { where.push('p.topic = ?'); params.push(topic); }

  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const allowedSorts = ['created_at', 'likes_count', 'comments_count', 'views_count', 'favorites_count'];
  const sortBy = allowedSorts.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const total = db.prepare(`SELECT COUNT(*) as count FROM posts p ${whereStr}`).get(...params);
  const posts = db.prepare(`
    SELECT p.*, u.username, u.nickname
    FROM posts p JOIN users u ON p.user_id = u.id
    ${whereStr}
    ORDER BY p.is_pinned DESC, p.${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  res.json({ posts, total: total.count, page: Number(page), limit: Number(limit) });
});

// 查看帖子详细数据
router.get('/posts/:id/stats', (req, res) => {
  const post = db.prepare(`
    SELECT p.*, u.username, u.nickname, u.avatar
    FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?
  `).get(req.params.id);

  if (!post) return res.status(404).json({ error: '帖子不存在' });

  const likers = db.prepare(`
    SELECT u.id, u.username, u.nickname, u.avatar
    FROM likes l JOIN users u ON l.user_id = u.id WHERE l.post_id = ?
  `).all(post.id);

  const favoriters = db.prepare(`
    SELECT u.id, u.username, u.nickname, u.avatar
    FROM favorites f JOIN users u ON f.user_id = u.id WHERE f.post_id = ?
  `).all(post.id);

  res.json({ ...post, likers, favoriters });
});

// 删除帖子
router.delete('/posts/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);

  db.prepare('INSERT INTO activity_log (user_id, action, detail) VALUES (?, ?, ?)').run(
    req.user.id, 'delete_post', '删除帖子: ' + post.title
  );

  res.json({ message: '已删除帖子' });
});

// 置顶/取消置顶
router.put('/posts/:id/pin', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  const newPinned = post.is_pinned ? 0 : 1;
  db.prepare('UPDATE posts SET is_pinned = ? WHERE id = ?').run(newPinned, req.params.id);

  db.prepare('INSERT INTO activity_log (user_id, action, detail) VALUES (?, ?, ?)').run(
    req.user.id, newPinned ? 'pin_post' : 'unpin_post',
    `${newPinned ? '置顶' : '取消置顶'}帖子: ${post.title}`
  );

  res.json({ message: newPinned ? '已置顶' : '已取消置顶', is_pinned: newPinned });
});

// ===== 群聊管理 =====
router.get('/group-messages', (req, res) => {
  const { page = 1, limit = 100 } = req.query;
  const offset = (page - 1) * limit;
  const messages = db.prepare(`
    SELECT gm.*, u.username, u.nickname
    FROM group_messages gm JOIN users u ON gm.user_id = u.id
    ORDER BY gm.created_at DESC LIMIT ? OFFSET ?
  `).all(Number(limit), offset);
  const total = db.prepare('SELECT COUNT(*) as count FROM group_messages').get();
  res.json({ messages, total: total.count });
});

router.delete('/group-messages/:id', (req, res) => {
  db.prepare('DELETE FROM group_messages WHERE id = ?').run(req.params.id);
  res.json({ message: '已删除消息' });
});

// ===== 活动日志 =====
router.get('/activity-log', (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  const logs = db.prepare(`
    SELECT a.*, u.username, u.nickname
    FROM activity_log a JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC LIMIT ? OFFSET ?
  `).all(Number(limit), offset);
  const total = db.prepare('SELECT COUNT(*) as count FROM activity_log').get();
  res.json({ logs, total: total.count });
});

export default router;
