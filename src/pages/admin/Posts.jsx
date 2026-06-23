import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api';

export default function AdminPosts() {
  const { themeColor } = useTheme();
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('全部');
  const [sort, setSort] = useState('created_at');
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postStats, setPostStats] = useState(null);

  const TOPICS = ['全部', '闲聊', '动漫', '游戏', 'Cosplay', '漫展', '手办', '轻小说', '绘画'];

  const fetchPosts = async (p, q, t, s) => {
    setLoading(true);
    try {
      const data = await api.getAdminPosts({
        page: p, limit: 20, q, topic: t === '全部' ? undefined : t, sort: s,
      });
      setPosts(data.posts);
      setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPosts(page, search, topic, sort);
  }, [page, sort]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPosts(1, search, topic, sort);
  };

  const handleDelete = async (postId, title) => {
    if (!confirm(`确定要删除帖子 "${title}" 吗？此操作不可撤销。`)) return;
    try {
      await api.deletePost(postId);
      fetchPosts(page, search, topic, sort);
    } catch (e) { alert('操作失败: ' + e.message); }
  };

  const handlePin = async (postId) => {
    try {
      await api.togglePin(postId);
      fetchPosts(page, search, topic, sort);
    } catch (e) { alert('操作失败: ' + e.message); }
  };

  const handleViewStats = async (postId) => {
    setSelectedPost(postId);
    try {
      const stats = await api.getAdminPostStats(postId);
      setPostStats(stats);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 no-underline mb-4 inline-block">
        ← 返回首页
      </Link>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">🛡️ 管理后台</h1>

      {/* 导航选项卡 */}
      <div className="flex space-x-1 mb-6 bg-white/30 rounded-xl p-1">
        {[
          { to: '/admin', label: '📊 仪表盘' },
          { to: '/admin/users', label: '👥 用户管理' },
          { to: '/admin/posts', label: '📝 帖子管理' },
        ].map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={`flex-1 py-2 rounded-lg text-sm font-medium text-center no-underline transition ${
              window.location.pathname === tab.to ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="glass-card p-3 mb-4 space-y-3">
        <form onSubmit={handleSearch} className="flex space-x-2">
          <input
            className="glass-input flex-1 text-sm"
            placeholder="搜索帖子标题/内容..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="glass-btn-primary text-sm px-4">搜索</button>
        </form>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500">话题:</span>
          {TOPICS.map((t) => (
            <button
              key={t}
              className="text-xs px-3 py-1 rounded-full transition"
              style={{
                background: topic === t ? themeColor : 'rgba(255,255,255,0.4)',
                color: topic === t ? 'white' : '#666',
              }}
              onClick={() => { setTopic(t); setPage(1); fetchPosts(1, search, t, sort); }}
            >
              {t}
            </button>
          ))}
          <span className="text-xs text-gray-500 ml-3">排序:</span>
          {[
            { key: 'created_at', label: '最新' },
            { key: 'likes_count', label: '点赞' },
            { key: 'comments_count', label: '评论' },
            { key: 'views_count', label: '浏览' },
          ].map((s) => (
            <button
              key={s.key}
              className="text-xs px-3 py-1 rounded-full transition"
              style={{
                background: sort === s.key ? themeColor : 'rgba(255,255,255,0.4)',
                color: sort === s.key ? 'white' : '#666',
              }}
              onClick={() => setSort(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 帖子表格 */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left p-3 font-medium text-gray-500">ID</th>
              <th className="text-left p-3 font-medium text-gray-500">标题</th>
              <th className="text-left p-3 font-medium text-gray-500">作者</th>
              <th className="text-center p-3 font-medium text-gray-500">话题</th>
              <th className="text-center p-3 font-medium text-gray-500">👍</th>
              <th className="text-center p-3 font-medium text-gray-500">💬</th>
              <th className="text-center p-3 font-medium text-gray-500">👁</th>
              <th className="text-center p-3 font-medium text-gray-500">⭐</th>
              <th className="text-center p-3 font-medium text-gray-500">置顶</th>
              <th className="text-right p-3 font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center p-8 text-gray-400">加载中...</td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center p-8 text-gray-400">暂无帖子</td>
              </tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-white/30">
                  <td className="p-3 text-gray-500">{p.id}</td>
                  <td className="p-3 max-w-[200px] truncate font-medium">{p.title}</td>
                  <td className="p-3 text-gray-600">{p.nickname || p.username}</td>
                  <td className="p-3 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: themeColor }}>
                      {p.topic}
                    </span>
                  </td>
                  <td className="p-3 text-center">{p.likes_count}</td>
                  <td className="p-3 text-center">{p.comments_count}</td>
                  <td className="p-3 text-center">{p.views_count}</td>
                  <td className="p-3 text-center">{p.favorites_count}</td>
                  <td className="p-3 text-center">
                    {p.is_pinned ? '📌' : '-'}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end space-x-1">
                      <button
                        className="text-xs px-2 py-1 rounded-lg hover:bg-white/50"
                        onClick={() => handleViewStats(p.id)}
                      >
                        📊
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded-lg hover:bg-white/50"
                        onClick={() => handlePin(p.id)}
                      >
                        {p.is_pinned ? '📌取消' : '📌置顶'}
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded-lg hover:bg-red-50 text-red-500"
                        onClick={() => handleDelete(p.id, p.title)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {total > 20 && (
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: Math.min(Math.ceil(total / 20), 10) }, (_, i) => (
            <button
              key={i}
              className={`w-8 h-8 rounded-lg text-sm ${page === i + 1 ? 'text-white' : 'glass-btn'}`}
              style={{ background: page === i + 1 ? themeColor : undefined }}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* 帖子统计弹窗 */}
      {selectedPost && postStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => { setSelectedPost(null); setPostStats(null); }}>
          <div className="glass-modal p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">📊 帖子数据</h3>
              <button className="text-gray-400 hover:text-gray-600 text-xl" onClick={() => { setSelectedPost(null); setPostStats(null); }}>✕</button>
            </div>

            <h4 className="font-bold text-lg mb-2">{postStats.title}</h4>
            <div className="text-sm text-gray-600 mb-4 whitespace-pre-wrap line-clamp-3">{postStats.content}</div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: '浏览', value: postStats.views_count },
                { label: '点赞', value: postStats.likes_count },
                { label: '评论', value: postStats.comments_count },
                { label: '收藏', value: postStats.favorites_count },
              ].map((s) => (
                <div key={s.label} className="bg-white/30 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-400 mb-3">
              作者: {postStats.nickname || postStats.username} | 话题: {postStats.topic} | 时间: {postStats.created_at}
            </div>

            <h4 className="font-medium text-sm text-gray-700 mb-2">点赞用户 ({postStats.likers?.length || 0})</h4>
            <div className="flex flex-wrap gap-1 mb-3">
              {(postStats.likers || []).map((l) => (
                <span key={l.id} className="text-xs bg-white/50 px-2 py-0.5 rounded-full">{l.nickname || l.username}</span>
              ))}
            </div>

            <h4 className="font-medium text-sm text-gray-700 mb-2">收藏用户 ({postStats.favoriters?.length || 0})</h4>
            <div className="flex flex-wrap gap-1">
              {(postStats.favoriters || []).map((f) => (
                <span key={f.id} className="text-xs bg-white/50 px-2 py-0.5 rounded-full">{f.nickname || f.username}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
