import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemePicker from './ThemePicker';
import api from '../api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { themeColor } = useTheme();
  const navigate = useNavigate();
  const [showTheme, setShowTheme] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  // 获取未读消息数
  useState(() => {
    if (user) {
      api.getUnreadCount().then((d) => setUnreadCount(d.count)).catch(() => {});
      const timer = setInterval(() => {
        api.getUnreadCount().then((d) => setUnreadCount(d.count)).catch(() => {});
      }, 10000);
      return () => clearInterval(timer);
    }
  }, [user]);

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length >= 1) {
      const users = await api.searchUsers(q);
      setSearchResults(users);
      setShowSearch(true);
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  return (
    <nav className="glass sticky top-0 z-50 px-4 py-3" style={{ borderBottom: `2px solid ${themeColor}20` }}>
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 no-underline">
          <span className="text-2xl">🍵</span>
          <span className="text-xl font-bold" style={{ color: themeColor }}>
            二次元茶话会
          </span>
        </Link>

        {/* 搜索 */}
        <div className="hidden md:block relative flex-1 max-w-md mx-4">
          <input
            className="glass-input w-full pl-10 pr-4 py-2 text-sm"
            placeholder="搜索用户..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full glass-card p-2 z-50 max-h-64 overflow-y-auto">
              {searchResults.map((u) => (
                <Link
                  key={u.id}
                  to={`/user/${u.id}`}
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/50 transition no-underline text-inherit"
                  onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                >
                  <img
                    src={u.avatar || `https://ui-avatars.com/api/?name=${u.nickname || u.username}&background=random&size=40`}
                    className="w-8 h-8 rounded-full"
                    alt=""
                  />
                  <div>
                    <div className="font-medium text-sm">{u.nickname || u.username}</div>
                    <div className="text-xs text-gray-500">@{u.username}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 导航 */}
        <div className="flex items-center space-x-1">
          <Link to="/" className="glass-btn text-sm px-3 py-2 no-underline text-gray-700 hover:text-gray-900">
            🏠 首页
          </Link>
          <Link to="/group-chat" className="glass-btn text-sm px-3 py-2 no-underline text-gray-700 hover:text-gray-900">
            💬 群聊
          </Link>
          <Link to="/messages" className="glass-btn text-sm px-3 py-2 no-underline text-gray-700 hover:text-gray-900 relative">
            ✉️ 私信
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{ background: themeColor }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* 主题切换 */}
          <button className="glass-btn text-sm px-3 py-2" onClick={() => setShowTheme(!showTheme)}>
            🎨
          </button>

          {/* 用户菜单 */}
          {user && (
            <div className="relative">
              <button className="flex items-center space-x-2 glass-btn px-3 py-2" onClick={() => setShowMenu(!showMenu)}>
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${user.nickname || user.username}&background=random&size=30`}
                  className="w-7 h-7 rounded-full"
                  alt=""
                />
                <span className="text-sm hidden sm:inline">{user.nickname || user.username}</span>
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-2 glass-card p-2 w-48 z-50" onMouseLeave={() => setShowMenu(false)}>
                  <Link
                    to={`/user/${user.id}`}
                    className="block px-4 py-2 rounded-xl hover:bg-white/50 text-sm no-underline text-gray-700"
                    onClick={() => setShowMenu(false)}
                  >
                    👤 我的主页
                  </Link>
                  <Link
                    to="/edit-profile"
                    className="block px-4 py-2 rounded-xl hover:bg-white/50 text-sm no-underline text-gray-700"
                    onClick={() => setShowMenu(false)}
                  >
                    ⚙️ 编辑资料
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 rounded-xl hover:bg-white/50 text-sm no-underline text-gray-700"
                      onClick={() => setShowMenu(false)}
                    >
                      🛡️ 管理后台
                    </Link>
                  )}
                  <hr className="my-1 border-gray-200" />
                  <button
                    className="w-full text-left px-4 py-2 rounded-xl hover:bg-red-50 text-sm text-red-500"
                    onClick={() => { logout(); navigate('/login'); setShowMenu(false); }}
                  >
                    🚪 退出登录
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 主题选择器 */}
      {showTheme && <ThemePicker onClose={() => setShowTheme(false)} />}
    </nav>
  );
}
