import { Router } from 'express';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// 获取私聊会话列表（最近联系的人）
router.get('/conversations', authRequired, (req, res) => {
  const conversations = db.prepare(`
    SELECT
      CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as user_id,
      u.username, u.nickname, u.avatar,
      MAX(m.created_at) as last_message_time,
      (
        SELECT content FROM messages
        WHERE (sender_id = ? AND receiver_id = user_id) OR (sender_id = user_id AND receiver_id = ?)
        ORDER BY created_at DESC LIMIT 1
      ) as last_message,
      (
        SELECT COUNT(*) FROM messages
        WHERE sender_id = user_id AND receiver_id = ? AND is_read = 0
      ) as unread_count
    FROM messages m
    JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
    WHERE m.sender_id = ? OR m.receiver_id = ?
    GROUP BY user_id
    ORDER BY last_message_time DESC
  `).all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id);

  res.json(conversations);
});

// 获取与某用户的私聊记录
router.get('/with/:userId', authRequired, (req, res) => {
  const messages = db.prepare(`
    SELECT m.*, u.username as sender_username, u.nickname as sender_nickname, u.avatar as sender_avatar
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC
    LIMIT 100
  `).all(req.user.id, req.params.userId, req.params.userId, req.user.id);

  // 标记为已读
  db.prepare(
    'UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0'
  ).run(req.user.id, req.params.userId);

  res.json(messages);
});

// 发送私聊消息
router.post('/send', authRequired, (req, res) => {
  const { receiver_id, content } = req.body;
  if (!receiver_id || !content) {
    return res.status(400).json({ error: '接收者和内容不能为空' });
  }

  const receiver = db.prepare('SELECT id FROM users WHERE id = ?').get(receiver_id);
  if (!receiver) return res.status(404).json({ error: '用户不存在' });

  const result = db.prepare(
    'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)'
  ).run(req.user.id, receiver_id, content);

  const message = db.prepare(`
    SELECT m.*, u.username as sender_username, u.nickname as sender_nickname, u.avatar as sender_avatar
    FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?
  `).get(result.lastInsertRowid);

  res.json(message);
});

// 获取未读消息数
router.get('/unread/count', authRequired, (req, res) => {
  const count = db.prepare(
    'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0'
  ).get(req.user.id);
  res.json({ count: count.count });
});

export default router;
