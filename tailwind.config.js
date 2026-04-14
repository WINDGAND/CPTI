/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 品牌主色（PRD 3.2.0 + Logo 色板）
        brand: {
          cyan:   '#4298b4',  // 主强调青 / 顶栏高亮
          green:  '#33a474',  // 正向 / 同意侧
          purple: '#88619a',  // 负向 / 不认同侧
        },
        // 四大色系 —— 对应 16 型海报 theme-* class（PRD 2.3）
        peach:  '#F4A7B0',  // 蜜桃粉 SRxx
        sky:    '#76B8E0',  // 湖水蓝 SPxx
        violet: '#B8A0D0',  // 罗兰紫 IRxx
        mint:   '#8ED6B4',  // 薄荷绿 IPxx
        // 页面基底
        base: {
          bg:   '#F6F6F6',  // 全站浅灰底
          card: '#FFFFFF',  // 卡片白底
          text: '#3D3D3D',  // 主文案深灰
          mute: '#9CA3AF',  // 次级 / 中灰文案
        },
      },
      borderRadius: {
        card: '12px',
        btn:  '8px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.07)',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // 顶栏高度与 Logo 尺寸补充（Tailwind 默认无 h-13 / h-18）
      spacing: {
        13: '3.25rem',   // 52px — 桌面端 Logo 大小
        18: '4.5rem',    // 72px — 平板顶栏高度
      },
    },
  },
  plugins: [],
}
