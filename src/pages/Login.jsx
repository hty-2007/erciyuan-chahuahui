import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { login, register } = useAuth();
  const { themeColor } = useTheme();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(username, password, phone, nickname || username);
      } else {
        await login(username, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: `linear-gradient(135deg, ${themeColor}15 0%, ${themeColor}30 100%)`,
    }}>
      <div className="glass-modal p-8 w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍵</div>
          <h1 className="text-2xl font-bold" style={{ color: themeColor }}>二次元茶话会</h1>
          <p className="text-sm text-gray-500 mt-1">动漫爱好者的温馨社区</p>
        </div>

        {/* 切换选项卡 */}
        <div className="flex mb-6 bg-gray-100/50 rounded-xl p-1">
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              !isRegister ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
            }`}
            onClick={() => { setIsRegister(false); setError(''); }}
          >
            登录
          </button>
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              isRegister ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
            }`}
            onClick={() => { setIsRegister(true); setError(''); }}
          >
            注册
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="glass-input w-full"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            className="glass-input w-full"
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {isRegister && (
            <>
              <input
                className="glass-input w-full"
                placeholder="手机号（一个号码只能注册一次）"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={11}
              />
              <input
                className="glass-input w-full"
                placeholder="昵称（选填）"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="glass-btn-primary w-full py-3 font-medium"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '处理中...' : isRegister ? '🍵 加入茶话会' : '🍵 进入茶话会'}
          </button>
        </form>

        {!isRegister && (
          <div className="mt-4 p-3 bg-gray-50/50 rounded-xl text-xs text-gray-500">
            <div className="font-medium mb-1">🔑 测试账号</div>
            <div>管理员: admin / admin123</div>
            <div>注册任意账号即可体验所有功能</div>
          </div>
        )}
      </div>
    </div>
  );
}
