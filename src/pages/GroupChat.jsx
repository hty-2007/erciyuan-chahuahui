import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { io } from 'socket.io-client';
import api from '../api';

let socket;

export default function GroupChat() {
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // 加载历史消息
  useEffect(() => {
    api.getAdminGroupMessages({ limit: 100 }).then((data) => {
      setMessages((data.messages || []).reverse());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Socket 连接
  useEffect(() => {
    if (!user) return;
    socket = io();
    socket.emit('user_online', user.id);

    socket.on('group_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    socket.emit('group_message', {
      userId: user.id,
      content: input.trim(),
    });
    setInput('');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 no-underline mb-4 inline-block">
        ← 返回首页
      </Link>

      <div className="glass-card flex h-[75vh] overflow-hidden">
        {/* 主聊天区 */}
        <div className="flex-1 flex flex-col">
          {/* 头部 */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-700">💬 茶话会大厅</h2>
              <div className="text-xs text-gray-400 mt-0.5">
                欢迎来到二次元茶话会群聊，畅所欲言吧！
              </div>
            </div>
            <div className="text-xs text-gray-400">
              🟢 {onlineUsers.length} 人在线
            </div>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-3xl animate-pulse-slow">🍵</div>
                <div className="text-sm mt-2">加载群聊记录...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">💬</div>
                <div>还没有消息，来发送第一条吧！</div>
              </div>
            ) : (
              messages.map((m, i) => {
                const isMine = String(m.user_id) === String(user?.id);
                const showAvatar = i === 0 || messages[i - 1]?.user_id !== m.user_id;

                return (
                  <div key={m.id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[75%] space-x-2`}>
                      {!isMine && showAvatar && (
                        <Link to={`/user/${m.user_id}`}>
                          <img
                            src={m.avatar || `https://ui-avatars.com/api/?name=${m.nickname || m.username}&background=random&size=32`}
                            className="w-8 h-8 rounded-full"
                            alt=""
                          />
                        </Link>
                      )}
                      {!isMine && !showAvatar && <div className="w-8 flex-shrink-0" />}
                      <div>
                        {showAvatar && !isMine && (
                          <Link to={`/user/${m.user_id}`} className="text-xs text-gray-400 ml-1 mb-0.5 block no-underline hover:underline">
                            {m.nickname || m.username}
                          </Link>
                        )}
                        <div
                          className="px-4 py-2 rounded-2xl text-sm"
                          style={{
                            background: isMine ? themeColor : 'rgba(255,255,255,0.7)',
                            color: isMine ? 'white' : '#333',
                            borderRadius: isMine
                              ? '16px 16px 4px 16px'
                              : '16px 16px 16px 4px',
                          }}
                        >
                          {m.content}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex space-x-2">
            <input
              className="glass-input flex-1 text-sm"
              placeholder="在这里输入，和大家聊天..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
            />
            <button
              type="submit"
              className="glass-btn-primary text-sm px-5"
              disabled={!input.trim()}
            >
              📮 发送
            </button>
          </form>
        </div>

        {/* 在线用户列表 */}
        <div className="w-56 border-l border-gray-100 p-4 hidden lg:block overflow-y-auto">
          <h3 className="font-medium text-sm text-gray-500 mb-3">在线用户</h3>
          {onlineUsers.length === 0 ? (
            <div className="text-xs text-gray-400">暂无在线用户</div>
          ) : (
            <div className="space-y-2">
              {onlineUsers.map((uid) => (
                <div key={uid} className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="text-gray-600 truncate text-xs">用户 {uid}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
