import Link from "next/link";
import { notFound } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type Task = {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  expected_duration: number;
  success_rate: number;
  thumbnail: string;
};

function formatDuration(minutes: number | null | undefined) {
  if (!Number.isFinite(minutes ?? NaN)) {
    return "未知";
  }

  const totalSeconds = Math.max(0, Math.round((minutes as number) * 60));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");

  return `${mm}:${ss}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function fetchTask(id: number): Promise<Task> {
  const params = new URLSearchParams({ id: String(id) });
  const response = await fetch(`${API_BASE}/taskdetail?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("无法获取任务详情");
  }

  return (await response.json()) as Task;
}

export default async function TaskDonePage({
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

  const formattedDuration = formatDuration(task.expected_duration);
  const successRate = Math.round(task.success_rate ?? 0);
  const contributionStars = clamp(Math.round(successRate / 20), 1, 5);
  const currentContribution = clamp(100 + successRate, 0, 9999);
  const level = Math.max(1, Math.ceil(currentContribution / 100));
  const progressInLevel = currentContribution % 100;
  const progressPercent = clamp(progressInLevel, 0, 100);
  const remainingToNext =
    level * 100 - currentContribution <= 0
      ? 100 - progressInLevel
      : level * 100 - currentContribution;

  return (
    <div className="min-h-screen bg-zinc-100 py-12 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto w-full max-w-[1150px] rounded-2xl border border-zinc-200 bg-white px-6 py-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          可运行的页面
        </div>
        <header className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-4 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
          <span className="text-base font-semibold text-zinc-900 dark:text-white">
            Axis Tasks
          </span>
          <Link
            href="/tasks"
            className="text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            任务大厅
          </Link>
        </header>

        <section className="hero mt-5 flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white px-10 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-[26px] font-semibold leading-none text-zinc-900 dark:text-white">
            任务完成！
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            {task.description || "你成功完成了此次任务，请查看详细数据与下一步建议。"}
          </p>
        </section>

        <section className="summary mt-6 flex flex-col gap-6 md:flex-row">
          <div className="left flex-1 rounded-xl border border-zinc-200 bg-white px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-base font-semibold text-zinc-900 dark:text-white">
              本局结果
            </div>
            <div className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              <div>
                任务：
                <span className="ml-1 font-semibold text-zinc-900 dark:text-white">
                  {task.name}
                </span>
              </div>
              <div>
                用时：
                <span className="ml-1 font-semibold text-zinc-900 dark:text-white">
                  {formattedDuration}
                </span>
              </div>
              <div>
                难度：
                <span className="ml-1 font-semibold text-zinc-900 dark:text-white">
                  {task.difficulty}
                </span>
              </div>
              <div>
                平均成功率：
                <span className="ml-1 font-semibold text-zinc-900 dark:text-white">
                  {successRate}%
                </span>
              </div>
            </div>

            <div className="stats mt-6 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="stat min-w-[140px] rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/70">
                <div className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  任务 ID
                </div>
                <div className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  #{task.id}
                </div>
              </div>
              <div className="stat min-w-[140px] rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/70">
                <div className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  建议时长
                </div>
                <div className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {Math.round(task.expected_duration)} 分钟
                </div>
              </div>
              <div className="stat min-w-[140px] rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/70">
                <div className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  状态
                </div>
                <div className="mt-1 text-base font-semibold text-emerald-600 dark:text-emerald-400">
                  已完成
                </div>
              </div>
            </div>

            <div className="charts mt-6 flex h-[320px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-gradient-to-b from-zinc-50 to-white text-xs text-zinc-500 dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950 dark:text-zinc-400">
              折线图 / 柱状图（占位）
            </div>
          </div>

          <aside className="right w-full rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900/60 md:w-[320px]">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              你的贡献
            </h3>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
              本次行为为机器人学习带来了：贡献度{" "}
              <span className="font-semibold text-amber-500">
                {"★".repeat(contributionStars)}
                {"☆".repeat(5 - contributionStars)}
              </span>
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              本次获得贡献值：
              <span className="ml-1 font-semibold text-zinc-900 dark:text-white">
                +{successRate}
              </span>
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              当前总贡献值：
              <span className="ml-1 font-semibold text-zinc-900 dark:text-white">
                {currentContribution}
              </span>{" "}
              · 等级：Lv{level}
            </p>

            <div className="mt-5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                距离 Lv{level + 1} 还差 {Math.max(0, remainingToNext)} 贡献值。
              </div>
            </div>

            <div className="legend mt-6 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-2">
                <i className="dot time inline-block h-2 w-3 rounded-sm bg-indigo-500" />
                时间
              </span>
              <span className="flex items-center gap-2">
                <i className="dot success inline-block h-2 w-3 rounded-sm bg-zinc-400 dark:bg-zinc-600" />
                成功率
              </span>
            </div>
          </aside>
        </section>

        <div className="footer-actions mt-8 flex flex-col items-center gap-4 text-sm md:flex-row md:justify-center">
          <Link
            href={{ pathname: "/task-running", query: { id: task.id } }}
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-5 py-3 font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
          >
            再玩一次本任务
          </Link>
          <Link
            href="/tasks"
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-5 py-3 font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
          >
            去看看其他任务
          </Link>
        </div>
      </div>
    </div>
  );
}
