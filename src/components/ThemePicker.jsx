import { useTheme } from '../context/ThemeContext';

export default function ThemePicker({ onClose }) {
  const { themeColor, changeColor, presetThemes } = useTheme();

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 glass-card p-4 z-50 w-72 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">🎨 选择主题颜色</h3>
        <button className="text-gray-400 hover:text-gray-600 text-lg" onClick={onClose}>✕</button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {presetThemes.map((t) => (
          <button
            key={t.color}
            className="flex flex-col items-center space-y-1 p-2 rounded-xl transition hover:bg-white/50"
            onClick={() => changeColor(t.color)}
          >
            <div
              className="w-10 h-10 rounded-full transition-transform"
              style={{
                background: t.color,
                transform: themeColor === t.color ? 'scale(1.15)' : 'scale(1)',
                boxShadow: themeColor === t.color ? `0 0 0 3px white, 0 0 0 5px ${t.color}` : 'none',
              }}
            />
            <span className="text-xs text-gray-500">{t.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-3">
        <label className="text-xs text-gray-500">自定义颜色</label>
        <input
          type="color"
          value={themeColor}
          onChange={(e) => changeColor(e.target.value)}
          className="w-full h-8 rounded-lg mt-1 cursor-pointer border-0"
        />
      </div>
    </div>
  );
}
