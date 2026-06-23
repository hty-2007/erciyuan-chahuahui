import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

const TOPICS = ['闲聊', '动漫', '游戏', 'Cosplay', '漫展', '手办', '轻小说', '绘画'];

export default function CreatePost({ onCreated }) {
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('闲聊');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('topic', topic);
      if (image) formData.append('image', image);

      const newPost = await api.createPost(formData);
      setTitle('');
      setContent('');
      setTopic('闲聊');
      setImage(null);
      setImagePreview('');
      setShowForm(false);
      if (onCreated) onCreated(newPost);
    } catch (e) {
      alert('发布失败: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  if (!showForm) {
    return (
      <div className="glass-card p-4 mb-6 animate-fade-in">
        <div className="flex items-center space-x-3">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.nickname || user?.username || 'U'}&background=random&size=40`}
            className="w-10 h-10 rounded-full"
            alt=""
          />
          <button
            className="glass-input flex-1 text-left text-gray-400 cursor-pointer"
            onClick={() => setShowForm(true)}
          >
            分享你的二次元新鲜事...
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 mb-6 animate-slide-up">
      <h3 className="font-semibold text-gray-700 mb-4">✏️ 发布新帖子</h3>
      <form onSubmit={handleSubmit}>
        <input
          className="glass-input w-full mb-3"
          placeholder="标题（必填）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="glass-input w-full mb-3 min-h-[120px] resize-y"
          placeholder="写下你想分享的内容..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />

        {/* 话题选择 */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">选择话题</label>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                className="px-3 py-1 rounded-full text-xs font-medium transition"
                style={{
                  background: topic === t ? themeColor : 'rgba(255,255,255,0.5)',
                  color: topic === t ? 'white' : '#666',
                  border: `1px solid ${topic === t ? themeColor : 'rgba(0,0,0,0.1)'}`,
                }}
                onClick={() => setTopic(t)}
              >
                #{t}
              </button>
            ))}
          </div>
        </div>

        {/* 图片上传 */}
        <div className="mb-3">
          <label className="glass-btn text-sm cursor-pointer inline-block">
            📷 添加图片
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </label>
          {imagePreview && (
            <div className="mt-2 relative inline-block">
              <img src={imagePreview} className="max-h-32 rounded-xl" alt="" />
              <button
                type="button"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                onClick={() => { setImage(null); setImagePreview(''); }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* 按钮 */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="glass-btn text-sm"
            onClick={() => setShowForm(false)}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="glass-btn-primary text-sm"
            style={{ opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? '发布中...' : '📮 发布'}
          </button>
        </div>
      </form>
    </div>
  );
}
