import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import PostCard from '../components/PostCard';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { themeColor } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posts');
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    api
      .getUser(id)
      .then((data) => {
        setProfile(data);
        setIsFollowing(data.is_following);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleFollow = async () => {
    try {
      const res = await api.toggleFollow(id);
      setIsFollowing(res.following);
      setProfile((prev) => ({
        ...prev,
        followers_count: res.following ? prev.followers_count + 1 : Math.max(0, prev.followers_count - 1),
      }));
    } catch (e) {
      alert(e.message);
    }
  };

  const handleMessage = () => {
    navigate(`/messages?with=${id}`);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-3xl animate-pulse-slow">🍵</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">
        用户不存在
      </div>
    );
  }

  const isSelf = currentUser?.id === profile.id;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 no-underline mb-4 inline-block">
        ← 返回首页
      </Link>

      {/* 用户信息卡片 */}
      <div className="glass-card p-6 mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
          {/* 头像 */}
          <img
            src={profile.avatar || `https://ui-avatars.com/api/?name=${profile.nickname || profile.username}&background=${themeColor.replace('#', '')}&color=fff&size=100&bold=true`}
            className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
            alt=""
          />

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-3 mb-2">
              <h1 className="text-xl font-bold text-gray-800">{profile.nickname || profile.username}</h1>
              {profile.role === 'admin' && (
                <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: themeColor }}>
                  🛡️ 管理员
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 mb-2">@{profile.username}</div>
            {profile.bio && <p className="text-sm text-gray-600 mb-3">{profile.bio}</p>}

            {/* 数据统计 */}
            <div className="flex justify-center sm:justify-start space-x-6 mb-4">
              <div className="text-center">
                <div className="font-bold text-gray-800">{profile.posts_count}</div>
                <div className="text-xs text-gray-500">帖子</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-800">{profile.followers_count}</div>
                <div className="text-xs text-gray-500">粉丝</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-800">{profile.following_count}</div>
                <div className="text-xs text-gray-500">关注</div>
              </div>
            </div>

            {/* 操作按钮 */}
            {!isSelf && (
              <div className="flex justify-center sm:justify-start space-x-3">
                <button
                  className="glass-btn text-sm px-5 py-2"
                  style={{
                    background: isFollowing ? 'rgba(255,255,255,0.5)' : themeColor,
                    color: isFollowing ? '#666' : 'white',
                    border: isFollowing ? '1px solid rgba(0,0,0,0.1)' : 'none',
                  }}
                  onClick={handleFollow}
                >
                  {isFollowing ? '✓ 已关注' : '+ 关注'}
                </button>
                <button className="glass-btn text-sm px-5 py-2" onClick={handleMessage}>
                  ✉️ 私聊
                </button>
              </div>
            )}

            {isSelf && (
              <Link to="/edit-profile" className="glass-btn text-sm px-5 py-2 inline-block no-underline text-gray-700">
                ⚙️ 编辑资料
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 内容选项卡 */}
      <div className="flex space-x-1 mb-4 bg-white/30 rounded-xl p-1">
        {[
          { key: 'posts', label: '📝 帖子' },
          { key: 'activities', label: '📊 动态' },
        ].map((t) => (
          <button
            key={t.key}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 帖子列表 */}
      {tab === 'posts' && (
        <div className="space-y-4">
          {profile.posts?.length > 0 ? (
            profile.posts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="text-center py-16 text-gray-400">还没有发布过帖子</div>
          )}
        </div>
      )}

      {/* 动态 */}
      {tab === 'activities' && (
        <div className="space-y-2">
          {profile.activities?.length > 0 ? (
            profile.activities.map((a) => (
              <div key={a.id} className="glass-card p-3 text-sm">
                <span className="text-gray-400 text-xs">{a.created_at}</span>
                <span className="ml-3 text-gray-600">{a.action === 'login' ? '🔑 登录了' : a.action === 'register' ? '🎉 注册了账号' : a.action === 'create_post' ? '📝 ' + a.detail : a.action === 'follow' ? '👥 ' + a.detail : a.detail || a.action}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-gray-400">暂无动态</div>
          )}
        </div>
      )}
    </div>
  );
}
