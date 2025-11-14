"use client";

import dynamic from "next/dynamic";

// Lazy load MuJoCo viewer with SSR disabled to avoid WASM loading issues
const MuJoCoViewer = dynamic(
  () => import("@/components/mujoco-viewer").then((mod) => mod.MuJoCoViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[260px] w-[260px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          加载模拟中...
        </p>
      </div>
    ),
  },
);

interface MuJoCoViewerWrapperProps {
  modelUrl?: string;
  modelXml?: string;
  width?: number;
  height?: number;
  paused?: boolean;
  className?: string;
}

export function MuJoCoViewerWrapper(props: MuJoCoViewerWrapperProps) {
  return <MuJoCoViewer {...props} />;
}

