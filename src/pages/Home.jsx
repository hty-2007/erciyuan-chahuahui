import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';

const TOPICS = ['全部', '闲聊', '动漫', '游戏', 'Cosplay', '漫展', '手办', '轻小说', '绘画'];

export default function Home() {
  const { themeColor } = useTheme();
  const [posts, setPosts] = useState([]);
  const [activeTopic, setActiveTopic] = useState('全部');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async (topic, p) => {
    setLoading(true);
    try {
      const data = await api.getPosts({
        topic: topic === '全部' ? undefined : topic,
        page: p,
        limit: 20,
      });
      if (p === 1) {
        setPosts(data.posts);
      } else {
        setPosts((prev) => [...prev, ...data.posts]);
      }
      setTotal(data.total);
    } catch (e) {
      console.error('加载帖子失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchPosts(activeTopic, 1);
  }, [activeTopic, fetchPosts]);

  const handleTopicChange = (topic) => {
    setActiveTopic(topic);
  };

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(activeTopic, nextPage);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* 创建帖子 */}
      <CreatePost onCreated={handlePostCreated} />

      {/* 话题筛选 */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2">
        {TOPICS.map((t) => (
          <button
            key={t}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap"
            style={{
              background: activeTopic === t ? themeColor : 'rgba(255,255,255,0.5)',
              color: activeTopic === t ? 'white' : '#666',
              border: `1px solid ${activeTopic === t ? themeColor : 'rgba(0,0,0,0.08)'}`,
              backdropFilter: 'blur(10px)',
            }}
            onClick={() => handleTopicChange(t)}
          >
            {t === '全部' ? '🔥 全部' : `#${t}`}
          </button>
        ))}
      </div>

      {/* 帖子列表 */}
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-pulse-slow text-2xl">🍵</div>
          <div className="text-gray-400 text-sm mt-2">加载中...</div>
        </div>
      )}

      {/* 加载更多 */}
      {!loading && posts.length < total && (
        <div className="text-center mt-6">
          <button className="glass-btn text-sm px-6 py-2" onClick={loadMore}>
            加载更多 ( {posts.length} / {total} )
          </button>
        </div>
      )}

      {/* 空状态 */}
      {!loading && posts.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🏷️</div>
          <div className="text-gray-500">还没有帖子，快来发布第一个吧！</div>
        </div>
      )}
    </div>
  );
}
