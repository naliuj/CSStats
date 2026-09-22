import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, HeatmapChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  CalendarComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  HeatmapChart,
  LineChart,
  ScatterChart,
  CalendarComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export type ChartOption = echarts.EChartsCoreOption;

interface Props {
  option: ChartOption;
  height: number;
  label: string;
}

export function Chart({ option, height, label }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const latest = useRef(option);

  // Charts inside a hidden view have no size; create them once they're first shown.
  useEffect(() => {
    const node = el.current!;
    const sync = () => {
      if (!node.clientWidth) return;
      if (chart.current) return chart.current.resize();
      chart.current = echarts.init(node);
      chart.current.setOption(latest.current, { notMerge: true });
    };
    const ro = new ResizeObserver(sync);
    ro.observe(node);
    sync();
    return () => {
      ro.disconnect();
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    latest.current = option;
    chart.current?.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={el} className="chart" style={{ height }} role="img" aria-label={label} />;
}
