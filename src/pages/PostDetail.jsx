import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import PostCard from '../components/PostCard';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getPost(id)
      .then(setPost)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const newComment = await api.addComment(id, comment);
      setPost((prev) => ({
        ...prev,
        comments: [...(prev.comments || []), newComment],
        comments_count: (prev.comments_count || 0) + 1,
      }));
      setComment('');
    } catch (e) {
      alert('评论失败: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-3xl animate-pulse-slow">🍵</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">
        帖子不存在或被删除
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* 返回按钮 */}
      <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 no-underline mb-4 inline-block">
        ← 返回首页
      </Link>

      {/* 帖子详情 */}
      <PostCard post={post} />

      {/* 评论输入 */}
      <div className="glass-card p-5 mt-4">
        <h3 className="font-semibold text-gray-700 mb-3">
          💬 评论 ({post.comments_count || post.comments?.length || 0})
        </h3>
        <form onSubmit={handleComment} className="flex space-x-3">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.nickname || user?.username || 'U'}&background=random&size=36`}
            className="w-9 h-9 rounded-full flex-shrink-0"
            alt=""
          />
          <div className="flex-1 flex space-x-2">
            <input
              className="glass-input flex-1 text-sm"
              placeholder="写下你的评论..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              type="submit"
              disabled={submitting || !comment.trim()}
              className="glass-btn-primary text-sm px-4"
              style={{ opacity: submitting || !comment.trim() ? 0.5 : 1 }}
            >
              发送
            </button>
          </div>
        </form>
      </div>

      {/* 评论列表 */}
      <div className="mt-4 space-y-3">
        {(post.comments || []).map((c) => (
          <div key={c.id} className="glass-card p-4 animate-fade-in">
            <div className="flex items-start space-x-3">
              <Link to={`/user/${c.user_id}`}>
                <img
                  src={c.avatar || `https://ui-avatars.com/api/?name=${c.nickname || c.username}&background=random&size=36`}
                  className="w-8 h-8 rounded-full"
                  alt=""
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Link to={`/user/${c.user_id}`} className="font-medium text-sm no-underline text-gray-800 hover:underline">
                    {c.nickname || c.username}
                  </Link>
                  <span className="text-xs text-gray-400">{c.created_at}</span>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
