import type { Palette } from './theme';
import { formatTime } from './lib/format';

/** Shared, theme-aware pieces of an ECharts option. */
export function base(p: Palette) {
  return {
    backgroundColor: 'transparent',
    animation: false,
    textStyle: { color: p.textSecondary, fontFamily: 'inherit' },
    tooltip: {
      backgroundColor: p.surface,
      borderColor: p.axis,
      textStyle: { color: p.text, fontSize: 12 },
      extraCssText: 'box-shadow: 0 4px 16px rgba(0,0,0,.18); border-radius: 8px;',
    },
    legend: {
      top: 0,
      left: 0,
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 4,
      textStyle: { color: p.textSecondary },
      inactiveColor: p.axis,
      pageIconColor: p.textSecondary,
      pageIconInactiveColor: p.axis,
      pageIconSize: 10,
      pageTextStyle: { color: p.textMuted },
    },
  };
}

export function axis(p: Palette, extra: Record<string, unknown> = {}) {
  return {
    axisLine: { lineStyle: { color: p.axis } },
    axisTick: { show: false },
    axisLabel: { color: p.textMuted },
    splitLine: { lineStyle: { color: p.grid } },
    nameTextStyle: { color: p.textMuted },
    ...extra,
  };
}

/** Axis tick label for a time in ms: "12", "12.5", "1:40". */
export function timeTick(v: number): string {
  return formatTime(v, v % 1000 === 0 ? 0 : v % 100 === 0 ? 1 : 2);
}

export function swatch(color: string) {
  return `<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${color};margin-right:6px"></span>`;
}
