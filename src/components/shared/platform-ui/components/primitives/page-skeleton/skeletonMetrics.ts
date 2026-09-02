// 骨架屏通用度量助手（无随机，SSR/CSR 一致）。

/**
 * 错落的骨架条宽度（百分比字符串），避免同列每行等宽显得呆板。
 * row/col 为稳定输入。
 */
export function skeletonBarWidth(row: number, col = 0): string {
  return `${62 + ((row * 31 + col * 17) % 28)}%`;
}

/**
 * 默认骨架项数：取分页大小并夹在 [3, 6]，避免渲染过多占位节点。
 */
export function skeletonItemCount(pageSize?: number, fallback = 4): number {
  const n = typeof pageSize === 'number' && pageSize > 0 ? pageSize : fallback;
  return Math.min(Math.max(n, 3), 6);
}
