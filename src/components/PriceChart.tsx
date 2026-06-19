"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { PricePoint } from "@/lib/types";
import { formatRupiah, formatDateShort } from "@/lib/format";

type Series = { slug: string; name: string; color: string };

export default function PriceChart({
  history,
  series,
}: {
  history: PricePoint[];
  series: Series[];
}) {
  if (history.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        Riwayat harga belum cukup untuk grafik.
      </p>
    );
  }

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => formatDateShort(d)}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v) => `${Math.round(v / 1000)}rb`}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatRupiah(value), name]}
            labelFormatter={(d) => formatDateShort(d as string)}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          {series.map((s) => (
            <Line
              key={s.slug}
              type="monotone"
              dataKey={s.slug}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
