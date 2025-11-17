import Link from "next/link";
import { notFound } from "next/navigation";

import { API_BASE } from "@/lib/api-base";
import { MuJoCoViewer } from "@/components/mujoco-viewer";
import { HUMAN_MODEL_XML } from "@/lib/mujoco-utils";

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

export default async function TaskRunningPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const resolved = await searchParams;
  const idParam = resolved?.id;
  const taskId = Number(idParam);

  if (!idParam || Number.isNaN(taskId) || taskId <= 0) {
    notFound();
  }

  const task = await fetchTask(taskId).catch(() => null);

  if (!task) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-100 pb-16 pt-8 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white/90 px-6 py-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="text-zinc-900 dark:text-white">Axis Tasks</span>
            <span className="text-xs font-normal uppercase tracking-wide text-zinc-400">
              任务运行
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/tasks"
              className="inline-flex items-center rounded-md border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
            >
              退出
            </Link>
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-transparent bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              重置任务
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white px-6 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            当前任务
          </p>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-white">
            {task.name}
          </h1>
        </section>

        <div className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[minmax(0,2.25fr)_minmax(0,1fr)]">
          <div className="flex min-h-[600px] flex-col items-center justify-center gap-4 rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-100 via-white to-zinc-50 p-4 shadow-sm dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900">
            <MuJoCoViewer
              width={700}
              height={620}
              modelXml={HUMAN_MODEL_XML}
            />
          </div>

          <aside className="flex flex-col gap-6 text-sm text-zinc-600 dark:text-zinc-300">
            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                任务目标
              </h2>
              <p className="mt-2 leading-relaxed">
                {task.description ?? "使用机械臂将蓝色方块推入绿色高亮区域，保持至少 2 秒。"}
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                任务状态
              </h2>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
                <p>剩余时间：01:23</p>
                <p>当前步数：56</p>
                <p>当前状态：操作中</p>
                <p>本局结果：未完成</p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                操作说明
              </h2>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 leading-relaxed dark:border-zinc-700 dark:bg-zinc-900/60">
                <p>W/A/S/D：移动基座</p>
                <p>鼠标移动：旋转视角</p>
                <p>鼠标右键拖拽：平移视角</p>
                <p>空格键：执行推运动 / 抓取</p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                提示
              </h2>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 leading-relaxed dark:border-zinc-700 dark:bg-zinc-900/60">
                <p>当方块接近目标时，注意控制力度。</p>
                <p>剩余时间低于 10 秒时将触发提醒。</p>
              </div>
            </section>

            <section className="space-y-2">
              <Link
                href={{ pathname: "/task-done", query: { id: task.id } }}
                className="inline-flex items-center rounded-md border border-transparent bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                完成
              </Link>
            </section>

          </aside>
        </div>
      </div>
    </div>
  );
}

