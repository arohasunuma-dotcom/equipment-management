import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ルーターキャッシュを無効化（動的ページは常に最新データを取得）
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 300,
    },
  },
};

export default nextConfig;
