import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const { themeColor, changeColor } = useTheme();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [color, setColor] = useState(user?.theme_color || themeColor);
  const [saving, setSaving] = useState(false);

  // 修改密码
  const [showPassword, setShowPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('nickname', nickname);
      formData.append('bio', bio);
      formData.append('theme_color', color);
      if (avatar) formData.append('avatar', avatar);

      const updated = await api.updateProfile(formData);
      updateUser(updated);
      changeColor(color);
      alert('资料更新成功！');
      navigate(`/user/${user.id}`);
    } catch (err) {
      alert('更新失败: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) {
      setPasswordMsg('请填写旧密码和新密码');
      return;
    }
    try {
      await api.changePassword({ oldPassword, newPassword });
      setPasswordMsg('✅ 密码修改成功');
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordMsg('❌ ' + err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link to={`/user/${user?.id}`} className="text-sm text-gray-500 hover:text-gray-700 no-underline mb-4 inline-block">
        ← 返回主页
      </Link>

      <div className="glass-card p-6 animate-fade-in">
        <h1 className="text-xl font-bold text-gray-800 mb-6">⚙️ 编辑个人资料</h1>

        {/* 头像 */}
        <div className="flex items-center space-x-4 mb-6">
          <img
            src={avatarPreview || `https://ui-avatars.com/api/?name=${nickname || user?.username}&background=${color.replace('#', '')}&color=fff&size=80&bold=true`}
            className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
            alt=""
          />
          <label className="glass-btn text-sm cursor-pointer">
            📷 更换头像
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-500 block mb-1">昵称</label>
            <input className="glass-input w-full" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">个人简介</label>
            <textarea
              className="glass-input w-full min-h-[80px] resize-y"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="介绍一下自己吧..."
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">主题颜色</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-16 h-10 rounded-lg cursor-pointer border-0"
            />
          </div>

          <button type="submit" disabled={saving} className="glass-btn-primary w-full py-3" style={{ opacity: saving ? 0.6 : 1 }}>
            {saving ? '保存中...' : '💾 保存资料'}
          </button>
        </form>

        {/* 修改密码 */}
        <hr className="my-6 border-gray-200" />
        <div>
          <button
            className="text-sm font-medium text-gray-600 hover:text-gray-800"
            onClick={() => setShowPassword(!showPassword)}
          >
            🔒 {showPassword ? '收起' : '修改密码'}
          </button>
          {showPassword && (
            <div className="mt-3 space-y-3">
              <input
                className="glass-input w-full"
                type="password"
                placeholder="旧密码"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <input
                className="glass-input w-full"
                type="password"
                placeholder="新密码（至少6位）"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button className="glass-btn text-sm" onClick={handlePasswordChange}>
                确认修改
              </button>
              {passwordMsg && (
                <div className={`text-sm ${passwordMsg.startsWith('✅') ? 'text-green-500' : 'text-red-500'}`}>
                  {passwordMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
