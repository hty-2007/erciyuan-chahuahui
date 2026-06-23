import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

export default function PostCard({ post, onUpdate, showActions = true }) {
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const [liked, setLiked] = useState(post.is_liked || false);
  const [favorited, setFavorited] = useState(post.is_favorited || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [favoritesCount, setFavoritesCount] = useState(post.favorites_count || 0);
  const [animating, setAnimating] = useState('');

  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await api.toggleLike(post.id);
      setLiked(res.liked);
      setLikesCount((c) => (res.liked ? c + 1 : Math.max(0, c - 1)));
      if (res.liked) setAnimating('like');
      setTimeout(() => setAnimating(''), 500);
    } catch (e) { console.error(e); }
  };

  const handleFavorite = async () => {
    if (!user) return;
    try {
      const res = await api.toggleFavorite(post.id);
      setFavorited(res.favorited);
      setFavoritesCount((c) => (res.favorited ? c + 1 : Math.max(0, c - 1)));
      if (res.favorited) setAnimating('fav');
      setTimeout(() => setAnimating(''), 500);
    } catch (e) { console.error(e); }
  };

  const topicColors = {
    '闲聊': '#6366f1',
    '动漫': '#ec4899',
    '游戏': '#10b981',
    'Cosplay': '#f97316',
    '漫展': '#8b5cf6',
    '手办': '#06b6d4',
    '轻小说': '#e11d48',
    '绘画': '#f59e0b',
  };

  return (
    <div className="glass-card p-5 animate-fade-in relative">
      {/* 置顶标记 */}
      {post.is_pinned === 1 && (
        <div className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full text-white" style={{ background: themeColor }}>
          📌 置顶
        </div>
      )}

      {/* 用户信息 */}
      <div className="flex items-center space-x-3 mb-3">
        <Link to={`/user/${post.user_id}`}>
          <img
            src={post.avatar || `https://ui-avatars.com/api/?name=${post.nickname || post.username}&background=random&size=40`}
            className="w-10 h-10 rounded-full cursor-pointer hover:opacity-80 transition"
            alt=""
          />
        </Link>
        <div>
          <Link to={`/user/${post.user_id}`} className="font-medium text-sm hover:underline no-underline text-gray-800">
            {post.nickname || post.username}
          </Link>
          <div className="text-xs text-gray-400">{post.created_at}</div>
        </div>
      </div>

      {/* 话题标签 */}
      {post.topic && (
        <span
          className="inline-block text-xs px-2 py-0.5 rounded-full text-white mb-2"
          style={{ background: topicColors[post.topic] || themeColor }}
        >
          #{post.topic}
        </span>
      )}

      {/* 标题 */}
      <Link to={`/post/${post.id}`} className="no-underline">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 hover:underline">{post.title}</h3>
      </Link>

      {/* 内容预览 */}
      <p className="text-gray-600 text-sm mb-3 line-clamp-3 whitespace-pre-wrap">{post.content}</p>

      {/* 图片 */}
      {post.image && (
        <img src={post.image} className="w-full max-h-64 object-cover rounded-xl mb-3" alt="" loading="lazy" />
      )}

      {/* 互动栏 */}
      {showActions && (
        <div className="flex items-center space-x-5 text-gray-400 text-sm pt-2 border-t border-gray-100">
          <button
            className={`flex items-center space-x-1 transition ${liked ? 'font-bold' : ''}`}
            style={{ color: liked ? '#ef4444' : undefined }}
            onClick={handleLike}
          >
            <span className={animating === 'like' ? 'animate-bounce' : ''}>{liked ? '❤️' : '🤍'}</span>
            <span>{likesCount}</span>
          </button>

          <button
            className={`flex items-center space-x-1 transition ${favorited ? 'font-bold' : ''}`}
            style={{ color: favorited ? '#f59e0b' : undefined }}
            onClick={handleFavorite}
          >
            <span className={animating === 'fav' ? 'animate-bounce' : ''}>{favorited ? '⭐' : '☆'}</span>
            <span>{favoritesCount}</span>
          </button>

          <Link to={`/post/${post.id}`} className="flex items-center space-x-1 no-underline text-gray-400 hover:text-gray-600">
            <span>💬</span>
            <span>{post.comments_count || 0}</span>
          </Link>

          <span className="flex items-center space-x-1">
            <span>👁️</span>
            <span>{post.views_count || 0}</span>
          </span>
        </div>
      )}
    </div>
  );
}
