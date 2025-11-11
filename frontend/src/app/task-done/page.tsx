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

  return (
    <div className="min-h-screen bg-zinc-100 pb-16 pt-8 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white/90 px-6 py-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="text-zinc-900 dark:text-white">Axis Tasks</span>
            <span className="text-xs font-normal uppercase tracking-wide text-emerald-500">
              任务完成
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/tasks"
              className="inline-flex items-center rounded-md border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
            >
              返回任务大厅
            </Link>
            <Link
              href={{ pathname: "/task-running", query: { id: task.id } }}
              className="inline-flex items-center rounded-md border border-transparent bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              再次挑战
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-700/40 dark:bg-zinc-900">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              已完成
            </span>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
              {task.name}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              恭喜完成任务！以下是本次执行的关键数据和建议下一步。
            </p>
          </div>
        </section>

        <div className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-2">
          <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-300">
            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                任务总结
              </h2>
              <p className="mt-2 leading-relaxed">
                {task.description}
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                本次表现
              </h2>
              <div className="mt-2 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
                <p>用时：约 {task.expected_duration} 分钟</p>
                <p>难度：{task.difficulty}</p>
                <p>平均完成率：{Math.round(task.success_rate)}%</p>
                <p>状态：已完成</p>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-6 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
            <h2 className="text-base font-semibold text-emerald-700 dark:text-emerald-200">
              下一步建议
            </h2>
            <ul className="space-y-2">
              <li>· 查看数据回放，分析关键动作。</li>
              <li>· 前往“再次挑战”优化策略。</li>
              <li>· 尝试更高难度的任务，提升成功率。</li>
            </ul>
            <Link
              href="/tasks"
              className="inline-flex w-fit items-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              浏览更多任务
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
