"""
将 public/logo.png 的白色背景替换为透明。

算法（关键：保留 Logo 边缘抗锯齿）：
  - 对每个像素，计算"白度" = min(R, G, B)
  - white >= HIGH:        完全透明（纯白背景）
  - LOW < white < HIGH:   线性衰减 alpha（抗锯齿过渡区）
  - white <= LOW:         alpha 保持原值（Logo 主体）

并对边缘做去白边处理：在过渡区把像素 RGB 推向其饱和颜色（去掉混入的白色），
避免在彩色背景下出现"白色光晕"。
"""
from pathlib import Path
import numpy as np
from PIL import Image

SRC = Path("public/logo.png")
DST = SRC  # 直接覆盖
LOW = 200   # 像素 min(RGB) <= 200 视为 Logo 主体，保留
HIGH = 245  # 像素 min(RGB) >= 245 视为纯白背景，去除

def main():
    img = Image.open(SRC).convert("RGBA")
    data = np.array(img).astype(np.int32)
    r, g, b, a = data[..., 0], data[..., 1], data[..., 2], data[..., 3]

    white = np.minimum(np.minimum(r, g), b)

    # 计算每个像素的 alpha 比例（0.0 = 完全透明，1.0 = 完全不透明）
    # 在 [LOW, HIGH] 之间线性插值
    ratio = np.clip((HIGH - white) / (HIGH - LOW), 0.0, 1.0)
    new_a = (a * ratio).astype(np.uint8)

    # 去白边：在过渡区（半透明像素），把 RGB 反推回"未与白色混合的纯色"
    #   设原色为 C，白色为 W=255，前景 alpha 为 ratio
    #   显示色 = C * ratio + W * (1 - ratio)  ← 这就是观察到的 r/g/b
    #   解出 C = (显示色 - W * (1 - ratio)) / ratio
    # 这样彩色背景下不会看到边缘灰白光晕
    safe_ratio = np.where(ratio > 0.01, ratio, 1.0)  # 防止除零
    pure_r = np.clip((r - 255 * (1 - safe_ratio)) / safe_ratio, 0, 255)
    pure_g = np.clip((g - 255 * (1 - safe_ratio)) / safe_ratio, 0, 255)
    pure_b = np.clip((b - 255 * (1 - safe_ratio)) / safe_ratio, 0, 255)

    # 仅对过渡区做反推（ratio < 1），主体区保持原 RGB
    transition = (ratio < 0.999) & (ratio > 0.0)
    r_out = np.where(transition, pure_r, r).astype(np.uint8)
    g_out = np.where(transition, pure_g, g).astype(np.uint8)
    b_out = np.where(transition, pure_b, b).astype(np.uint8)

    out = np.stack([r_out, g_out, b_out, new_a], axis=-1)
    Image.fromarray(out, mode="RGBA").save(DST, optimize=True)

    total = data.shape[0] * data.shape[1]
    fully_transparent = int(np.sum(new_a == 0))
    semi = int(np.sum((new_a > 0) & (new_a < 255)))
    opaque = int(np.sum(new_a == 255))
    print(f"[logo-transparent] 处理完成: {DST}")
    print(f"  总像素 {total:,} | 全透明 {fully_transparent:,} | 半透明 {semi:,} | 不透明 {opaque:,}")

if __name__ == "__main__":
    main()
