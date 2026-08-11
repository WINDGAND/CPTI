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
        display: ['"Bricolage Grotesque"', '"Noto Sans SC"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // 顶栏高度与 Logo 尺寸补充（Tailwind 默认无 h-13 / h-18）
      spacing: {
        13: '3.25rem',   // 52px — 桌面端 Logo 大小
        18: '4.5rem',    // 72px — 平板顶栏高度
      },
    },
  },
  plugins: [
    // 低高度桌面视口（如 1366×768 笔记本、浏览器多栏书签栏）：
    // 在保持桌面布局的前提下压缩纵向间距，让首页首屏一屏完整放下。
    // 注意：必须包一层 html 选择器提升优先级（0-1-1），
    // 否则自定义变体生成在 md: 之前，同优先级下会被 md: 覆盖。
    function ({ addVariant }) {
      addVariant('hshort', '@media (min-width: 768px) and (max-height: 840px) { html & }')
      addVariant('hxshort', '@media (min-width: 768px) and (max-height: 620px) { html & }')
    },
  ],
}
