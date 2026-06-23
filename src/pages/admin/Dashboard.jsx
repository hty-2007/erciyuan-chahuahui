import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api';

export default function AdminDashboard() {
  const { themeColor } = useTheme();
  const [data, setData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboard(),
      api.getActivityLog({ limit: 20 }),
    ]).then(([dash, act]) => {
      setData(dash);
      setActivities(act.logs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-3xl animate-pulse-slow">🍵</div>
        <div className="text-gray-400 mt-2">加载管理后台...</div>
      </div>
    );
  }

  const cards = [
    { label: '总用户数', value: data?.totalUsers || 0, icon: '👥', color: '#6366f1' },
    { label: '总帖子数', value: data?.totalPosts || 0, icon: '📝', color: '#ec4899' },
    { label: '总评论数', value: data?.totalComments || 0, icon: '💬', color: '#10b981' },
    { label: '总点赞数', value: data?.totalLikes || 0, icon: '❤️', color: '#f97316' },
    { label: '今日新用户', value: data?.todayUsers || 0, icon: '🆕', color: '#06b6d4' },
    { label: '今日新帖子', value: data?.todayPosts || 0, icon: '🔥', color: '#e11d48' },
    { label: '私信总数', value: data?.totalMessages || 0, icon: '✉️', color: '#8b5cf6' },
    { label: '群聊消息', value: data?.totalGroupMessages || 0, icon: '💭', color: '#f59e0b' },
    { label: '被禁言用户', value: data?.bannedUsers || 0, icon: '🔇', color: '#ef4444' },
  ];

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
              window.location.pathname === tab.to ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="glass-card p-4 text-center animate-fade-in">
            <div className="text-2xl mb-1">{c.icon}</div>
            <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* 最近活动 */}
      <div className="glass-card p-5">
        <h2 className="font-semibold text-gray-700 mb-4">📋 最近活动记录</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-400">暂无活动记录</div>
          ) : (
            activities.map((a) => (
              <div key={a.id} className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/30 text-sm">
                <span className="font-medium text-gray-700 min-w-[80px]">{a.nickname || a.username}</span>
                <span className="text-gray-500 flex-1">{a.detail || a.action}</span>
                <span className="text-xs text-gray-400">{a.created_at}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
