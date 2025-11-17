import Link from "next/link";
import { notFound } from "next/navigation";

import { API_BASE } from "@/lib/api-base";

type Task = {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  expected_duration: number;
  success_rate: number;
  thumbnail: string;
};

async function fetchTask(id: number): Promise<Task> {
  const params = new URLSearchParams({ id: String(id) });
  const endpoint = `${API_BASE}/taskdetail?${params.toString()}`;
  // eslint-disable-next-line no-console
  console.log("[Axis] Fetching task detail from full URL:", endpoint);
  // eslint-disable-next-line no-console
  console.log("[Axis] API_BASE value:", API_BASE);
  
  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
    });
    
    // eslint-disable-next-line no-console
    console.log("[Axis] Fetch response status:", response.status, response.statusText);
    // eslint-disable-next-line no-console
    console.log("[Axis] Fetch response URL:", response.url);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unable to read error response");
      console.error(
        "[Axis] Failed task detail fetch",
        response.status,
        response.statusText,
        "Error body:",
        errorText,
      );
      throw new Error(`无法获取任务详情: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Task;
    // eslint-disable-next-line no-console
    console.log("[Axis] Task detail fetch ok, task ID:", data.id);
    return data;
  } catch (error) {
    console.error("[Axis] Exception during task detail fetch:", error);
    if (error instanceof Error) {
      console.error("[Axis] Error message:", error.message);
      console.error("[Axis] Error stack:", error.stack);
    }
    throw error;
  }
}

function mapDifficultyToStars(label: string): number {
  const normalized = label.toLowerCase();
  if (normalized.includes("新手")) return 1;
  if (normalized.includes("入门")) return 2;
  if (normalized.includes("中等")) return 3;
  if (normalized.includes("进阶") || normalized.includes("高级")) return 4;
  if (normalized.includes("专家") || normalized.includes("挑战")) return 5;
  return 2;
}

function DifficultyStars({ value }: { value: number }) {
  const max = 5;
  const stars = "★".repeat(value) + "☆".repeat(Math.max(0, max - value));

  return (
    <span className="font-medium tracking-tight text-amber-500">{stars}</span>
  );
}

export default async function TaskDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const resolvedParams = await searchParams;
  const idParam = resolvedParams?.id;
  const taskId = Number(idParam);

  if (!idParam || Number.isNaN(taskId) || taskId <= 0) {
    notFound();
  }

  const task = await fetchTask(taskId).catch(() => null);

  if (!task) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-100 py-12 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              任务详情
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-white">
              {task.name}
            </h1>
          </div>
          <Link
            href="/tasks"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
          >
            返回任务大厅
          </Link>
        </header>

        <div className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[450px_1fr]">
          <div className="flex flex-col items-start gap-4">
            <div className="flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-gradient-to-br from-zinc-100 via-white to-zinc-50 p-4 shadow-sm dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900">
              {/* SVG placeholder with 4:3 aspect ratio */}
              <svg
                aria-hidden="true"
                className="h-[308px] w-[410px] text-zinc-400"
                viewBox="0 0 90 50"
                fill="none"
              >
                <rect
                  x="6"
                  y="6"
                  width="28"
                  height="28"
                  fill="#cfe3ff"
                  stroke="#9fb6dd"
                />
                <rect
                  x="54"
                  y="20"
                  width="20"
                  height="16"
                  fill="#ffdede"
                  stroke="#d6a3a3"
                />
                <circle
                  cx="42"
                  cy="28"
                  r="8"
                  fill="#e0f7e8"
                  stroke="#b7dec1"
                />
              </svg>
            </div>
            <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  难度
                </span>
                <DifficultyStars value={mapDifficultyToStars(task.difficulty)} />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  预计用时
                </span>
                <p className="mt-1 text-base font-medium text-zinc-900 dark:text-white">
                  {task.expected_duration} 分钟
                </p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  完成率
                </span>
                <p className="mt-1 text-base font-medium text-zinc-900 dark:text-white">
                  {Math.round(task.success_rate)}%
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 text-sm text-zinc-600 dark:text-zinc-300">
            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                任务简介
              </h2>
              <p className="mt-2 leading-relaxed">{task.description}</p>
            </section>

            <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900/40">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                下一步
              </h3>
              <p className="mt-2 leading-relaxed">
                该界面用于演示任务详情布局。可在此展示步骤说明、操作提示或嵌入实时遥操作视图。
              </p>
            </section>

            <div className="flex flex-wrap gap-3">
              <Link
                href={{ pathname: "/task-running", query: { id: task.id } }}
                className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
              >
                开始任务
              </Link>
              <button className="inline-flex items-center justify-center rounded-md border border-transparent bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">
                加入收藏
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
