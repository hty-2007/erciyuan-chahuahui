import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { io } from 'socket.io-client';
import api from '../api';

let socket;

export default function Messages() {
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const preselectedUserId = searchParams.get('with');

  // 连接 Socket
  useEffect(() => {
    if (!user) return;
    socket = io();
    socket.emit('user_online', user.id);

    socket.on('private_message', (msg) => {
      if (
        activeChat &&
        ((msg.sender_id === activeChat.id && msg.receiver_id === user.id) ||
          (msg.sender_id === user.id && msg.receiver_id === activeChat.id))
      ) {
        setMessages((prev) => [...prev, msg]);
      }
      // 刷新会话列表
      loadConversations();
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [user, activeChat?.id]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const timer = setInterval(loadConversations, 5000);
    return () => clearInterval(timer);
  }, [loadConversations]);

  // 预选聊天对象
  useEffect(() => {
    if (preselectedUserId && conversations.length > 0) {
      const found = conversations.find((c) => String(c.user_id) === preselectedUserId);
      if (found) {
        selectChat({ id: found.user_id, username: found.username, nickname: found.nickname, avatar: found.avatar });
      }
    }
  }, [preselectedUserId, conversations]);

  const selectChat = async (chatUser) => {
    setActiveChat(chatUser);
    try {
      const msgs = await api.getMessagesWith(chatUser.id);
      setMessages(msgs);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !activeChat || !user) return;

    socket.emit('private_message', {
      senderId: user.id,
      receiverId: activeChat.id,
      content: input.trim(),
    });

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender_id: user.id,
        receiver_id: activeChat.id,
        sender_username: user.username,
        sender_nickname: user.nickname,
        sender_avatar: user.avatar,
        content: input.trim(),
        created_at: new Date().toISOString(),
      },
    ]);
    setInput('');
  };

  // 如果没有选中的聊天，直接请求与目标用户的聊天
  useEffect(() => {
    if (preselectedUserId && !activeChat && !loading) {
      api.getMessagesWith(preselectedUserId).then((msgs) => {
        if (msgs.length > 0) {
          const other = msgs.find((m) => m.sender_id !== user.id) || msgs[0];
          setActiveChat({
            id: Number(preselectedUserId),
            username: other.sender_username,
            nickname: other.sender_nickname,
            avatar: other.sender_avatar,
          });
          setMessages(msgs);
        }
      }).catch(() => {});
    }
  }, [preselectedUserId, loading, activeChat, user]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 no-underline mb-4 inline-block">
        ← 返回首页
      </Link>

      <div className="glass-card flex h-[70vh] overflow-hidden">
        {/* 会话列表 */}
        <div className="w-80 border-r border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">✉️ 私信</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-400">加载中...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">暂无会话</div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.user_id}
                  className={`w-full text-left p-4 hover:bg-white/30 transition flex items-center space-x-3 border-b border-gray-50 ${
                    activeChat?.id === c.user_id ? 'bg-white/40' : ''
                  }`}
                  onClick={() => selectChat(c)}
                >
                  <div className="relative">
                    <img
                      src={c.avatar || `https://ui-avatars.com/api/?name=${c.nickname || c.username}&background=random&size=40`}
                      className="w-10 h-10 rounded-full"
                      alt=""
                    />
                    {c.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{ background: themeColor }}>
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{c.nickname || c.username}</div>
                    <div className="text-xs text-gray-400 truncate">{c.last_message || '开始聊天吧'}</div>
                  </div>
                  {c.last_message_time && (
                    <div className="text-xs text-gray-300">{c.last_message_time.slice(5, 16)}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* 聊天区域 */}
        <div className="flex-1 flex flex-col">
          {activeChat ? (
            <>
              {/* 聊天头部 */}
              <div className="p-4 border-b border-gray-100 flex items-center space-x-3">
                <Link to={`/user/${activeChat.id}`} className="no-underline">
                  <img
                    src={activeChat.avatar || `https://ui-avatars.com/api/?name=${activeChat.nickname || activeChat.username}&background=random&size=36`}
                    className="w-9 h-9 rounded-full"
                    alt=""
                  />
                </Link>
                <Link to={`/user/${activeChat.id}`} className="font-medium text-sm no-underline text-gray-800 hover:underline">
                  {activeChat.nickname || activeChat.username}
                </Link>
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => {
                  const isMine = m.sender_id === user.id;
                  return (
                    <div key={m.id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {!isMine && (
                        <Link to={`/user/${m.sender_id}`}>
                          <img
                            src={m.sender_avatar || `https://ui-avatars.com/api/?name=${m.sender_nickname || m.sender_username}&background=random&size=28`}
                            className="w-7 h-7 rounded-full mr-2 mt-1"
                            alt=""
                          />
                        </Link>
                      )}
                      <div
                        className="max-w-[70%] px-4 py-2 rounded-2xl text-sm"
                        style={{
                          background: isMine ? themeColor : 'rgba(255,255,255,0.7)',
                          color: isMine ? 'white' : '#333',
                          borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        }}
                      >
                        {m.content}
                      </div>
                      {isMine && (
                        <img
                          src={user.avatar || `https://ui-avatars.com/api/?name=${user.nickname || user.username}&background=random&size=28`}
                          className="w-7 h-7 rounded-full ml-2 mt-1"
                          alt=""
                        />
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* 输入框 */}
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex space-x-2">
                <input
                  className="glass-input flex-1 text-sm"
                  placeholder="输入消息..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit" className="glass-btn-primary text-sm px-4" disabled={!input.trim()}>
                  发送
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-3">💬</div>
                <div>选择一个会话开始聊天</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
