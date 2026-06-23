import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api';

export default function AdminUsers() {
  const { themeColor } = useTheme();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);

  const fetchUsers = async (p, q) => {
    setLoading(true);
    try {
      const data = await api.getAdminUsers({ page: p, limit: 20, q });
      setUsers(data.users);
      setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchUsers(page, search);
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, search);
  };

  const handleBan = async (userId, isBanned) => {
    const reason = isBanned ? prompt('禁言原因（可选）：') : '';
    if (isBanned && reason === null) return;
    try {
      await api.banUser(userId, { is_banned: isBanned, reason: reason || '' });
      fetchUsers(page, search);
      alert(isBanned ? '已禁言用户' : '已解禁用户');
    } catch (e) { alert('操作失败: ' + e.message); }
  };

  const handleDelete = async (userId, username) => {
    if (!confirm(`确定要注销用户 "${username}" 吗？此操作不可撤销，将删除该用户的所有数据。`)) return;
    try {
      await api.deleteUser(userId);
      fetchUsers(page, search);
      alert('已注销用户');
    } catch (e) { alert('操作失败: ' + e.message); }
  };

  const handleViewDetail = async (userId) => {
    setSelectedUser(userId);
    try {
      const detail = await api.getAdminUserDetail(userId);
      setUserDetail(detail);
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

      {/* 搜索 */}
      <form onSubmit={handleSearch} className="glass-card p-3 mb-4 flex space-x-2">
        <input
          className="glass-input flex-1 text-sm"
          placeholder="搜索用户名/昵称/手机号..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="glass-btn-primary text-sm px-4">搜索</button>
      </form>

      {/* 用户表格 */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left p-3 font-medium text-gray-500">ID</th>
              <th className="text-left p-3 font-medium text-gray-500">用户</th>
              <th className="text-left p-3 font-medium text-gray-500">手机</th>
              <th className="text-center p-3 font-medium text-gray-500">帖子</th>
              <th className="text-center p-3 font-medium text-gray-500">粉丝</th>
              <th className="text-center p-3 font-medium text-gray-500">状态</th>
              <th className="text-center p-3 font-medium text-gray-500">最后活跃</th>
              <th className="text-right p-3 font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center p-8 text-gray-400">加载中...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center p-8 text-gray-400">暂无用户</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-white/30">
                  <td className="p-3 text-gray-500">{u.id}</td>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <img
                        src={u.avatar || `https://ui-avatars.com/api/?name=${u.nickname || u.username}&background=random&size=32`}
                        className="w-7 h-7 rounded-full"
                        alt=""
                      />
                      <div>
                        <div className="font-medium">{u.nickname || u.username}</div>
                        <div className="text-xs text-gray-400">@{u.username} {u.role === 'admin' ? '🛡️' : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-gray-500">{u.phone}</td>
                  <td className="p-3 text-center">{u.posts_count}</td>
                  <td className="p-3 text-center">{u.followers_count}</td>
                  <td className="p-3 text-center">
                    {u.is_banned ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-500">已禁言</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-500">正常</span>
                    )}
                  </td>
                  <td className="p-3 text-center text-xs text-gray-400">{u.last_active?.slice(0, 16)}</td>
                  <td className="p-3">
                    <div className="flex justify-end space-x-1">
                      <button
                        className="text-xs px-2 py-1 rounded-lg hover:bg-white/50"
                        onClick={() => handleViewDetail(u.id)}
                      >
                        📋
                      </button>
                      {u.username !== 'admin' && (
                        <>
                          <button
                            className="text-xs px-2 py-1 rounded-lg hover:bg-white/50"
                            onClick={() => handleBan(u.id, !u.is_banned)}
                          >
                            {u.is_banned ? '🔊' : '🔇'}
                          </button>
                          <button
                            className="text-xs px-2 py-1 rounded-lg hover:bg-red-50 text-red-500"
                            onClick={() => handleDelete(u.id, u.username)}
                          >
                            🗑️
                          </button>
                        </>
                      )}
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
          {Array.from({ length: Math.ceil(total / 20) }, (_, i) => (
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

      {/* 用户详情弹窗 */}
      {selectedUser && userDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => { setSelectedUser(null); setUserDetail(null); }}>
          <div className="glass-modal p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">👤 用户详情</h3>
              <button className="text-gray-400 hover:text-gray-600 text-xl" onClick={() => { setSelectedUser(null); setUserDetail(null); }}>✕</button>
            </div>

            <div className="flex items-center space-x-4 mb-4">
              <img
                src={userDetail.avatar || `https://ui-avatars.com/api/?name=${userDetail.nickname || userDetail.username}&background=random&size=60`}
                className="w-14 h-14 rounded-full"
                alt=""
              />
              <div>
                <div className="font-bold">{userDetail.nickname || userDetail.username} {userDetail.role === 'admin' ? '🛡️' : ''}</div>
                <div className="text-sm text-gray-500">@{userDetail.username}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              {[
                { label: '帖子', value: userDetail.posts_count },
                { label: '粉丝', value: userDetail.followers_count },
                { label: '关注', value: userDetail.following_count },
              ].map((s) => (
                <div key={s.label} className="bg-white/30 rounded-xl p-2">
                  <div className="font-bold">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            {userDetail.bio && <p className="text-sm text-gray-600 mb-3">📝 {userDetail.bio}</p>}
            <div className="text-xs text-gray-400 mb-4">注册时间: {userDetail.created_at}</div>

            <h4 className="font-medium text-sm text-gray-700 mb-2">最近动态</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {(userDetail.activities || []).slice(0, 20).map((a) => (
                <div key={a.id} className="text-xs text-gray-500 flex justify-between">
                  <span>{a.detail || a.action}</span>
                  <span className="text-gray-300">{a.created_at?.slice(0, 16)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
