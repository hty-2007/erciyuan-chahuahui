import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function UserCard({ user, showFollow = false, isFollowing, onToggleFollow }) {
  const { themeColor } = useTheme();

  return (
    <div className="glass-card p-4 flex items-center justify-between">
      <Link to={`/user/${user.id}`} className="flex items-center space-x-3 no-underline text-inherit flex-1 min-w-0">
        <img
          src={user.avatar || `https://ui-avatars.com/api/?name=${user.nickname || user.username}&background=random&size=44`}
          className="w-11 h-11 rounded-full flex-shrink-0"
          alt=""
        />
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{user.nickname || user.username}</div>
          <div className="text-xs text-gray-400 truncate">@{user.username}</div>
          {user.bio && <div className="text-xs text-gray-500 truncate mt-0.5">{user.bio}</div>}
        </div>
      </Link>
      {showFollow && onToggleFollow && (
        <button
          className="flex-shrink-0 ml-3 px-4 py-1.5 rounded-full text-xs font-medium transition"
          style={{
            background: isFollowing ? 'rgba(255,255,255,0.5)' : themeColor,
            color: isFollowing ? '#666' : 'white',
            border: isFollowing ? '1px solid rgba(0,0,0,0.1)' : 'none',
          }}
          onClick={onToggleFollow}
        >
          {isFollowing ? '已关注' : '+ 关注'}
        </button>
      )}
    </div>
  );
}
