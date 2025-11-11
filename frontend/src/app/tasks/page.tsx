import Link from "next/link";
import { AuthControls } from "@/components/auth/auth-controls";

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

async function fetchTasks(): Promise<Task[]> {
  const response = await fetch(`${API_BASE}/tasks`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("无法获取任务列表");
  }

  const data = (await response.json()) as { tasks: Task[] };
  return data.tasks;
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

export default async function TasksPage() {
  const tasks = await fetchTasks().catch(() => []);
  const highlightedTasks = tasks.slice(0, 3);
  const primaryTaskId = highlightedTasks[0]?.id ?? tasks[0]?.id;

  return (
    <div className="min-h-screen bg-zinc-100 pb-20 pt-10 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white/90 px-6 py-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-zinc-400">任务大厅</span>
            <span className="text-lg font-semibold text-zinc-900 dark:text-white">
              Axis Tasks
            </span>
          </div>
          <AuthControls />
        </header>

        <section className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white px-8 py-10 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white">
            像打游戏一样帮机器人学习
          </h1>
          <p className="mt-3 max-w-3xl text-base text-zinc-600 dark:text-zinc-400">
            任何人只要有浏览器，就可以遥操作机器人，完成任务，贡献数据。
          </p>
          {primaryTaskId ? (
            <Link
              href={{ pathname: "/task-detail", query: { id: primaryTaskId } }}
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50 px-5 py-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500"
            >
              <span>开始第一个任务</span>
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </Link>
          ) : (
            <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
              暂无可用任务，请稍后再试。
            </p>
          )}
        </section>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full max-w-xs rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="space-y-5 text-sm text-zinc-600 dark:text-zinc-300">
              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  任务类型
                </label>
                <select className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-700/40">
                  <option>全部</option>
                  <option>推/拉</option>
                  <option>抓取</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  难度
                </label>
                <select className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-700/40">
                  <option>全部</option>
                  <option>★☆☆☆☆</option>
                  <option>★★☆☆☆</option>
                  <option>★★★☆☆</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  预计用时
                </label>
                <select className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-700/40">
                  <option>不限</option>
                  <option>0-2 分钟</option>
                  <option>3-5 分钟</option>
                </select>
              </div>
            </div>
          </aside>

          <section className="flex-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {highlightedTasks.length ? (
              <div className="divide-y divide-dashed divide-zinc-200 dark:divide-zinc-800">
                {highlightedTasks.map((task) => (
                  <article
                    key={task.id}
                    className="flex flex-col gap-4 py-5 first:pt-0 last:border-none last:pb-0 md:flex-row md:items-center md:gap-6"
                  >
                    <div className="flex shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-gradient-to-br from-zinc-100 via-white to-zinc-50 p-3 shadow-sm dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900">
                      <svg
                        aria-hidden="true"
                        className="h-16 w-28 text-zinc-400"
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

                    <div className="flex flex-1 flex-col gap-3 text-sm">
                      <div>
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                          {task.name}
                        </h3>
                        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                          {task.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-600 dark:text-zinc-300">
                            难度
                          </span>
                          <DifficultyStars
                            value={mapDifficultyToStars(task.difficulty)}
                          />
                        </div>
                        <div>完成率: {Math.round(task.success_rate)}%</div>
                        <div>预计: {task.expected_duration} 分钟</div>
                      </div>
                    </div>

                    <div className="md:text-right">
                      <Link
                        href={{ pathname: "/task-detail", query: { id: task.id } }}
                        className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                      >
                        查看详情
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
                <p>暂无任务数据。</p>
                <p className="mt-2 text-xs">
                  请检查后端任务接口或稍后刷新页面再试。
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

