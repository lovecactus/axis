import Link from "next/link";

import { API_BASE } from "@/lib/api-base";

type UserSummary = {
  id: string;
  email: string | null;
  default_wallet_address: string | null;
  created_at: string;
  updated_at: string;
};

type TaskSummary = {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  expected_duration: number;
  success_rate: number;
  thumbnail: string;
};

type AdminOverviewResponse = {
  users: UserSummary[];
  tasks: TaskSummary[];
};

async function fetchAdminOverview(): Promise<AdminOverviewResponse | null> {
  try {
    const endpoint = `${API_BASE}/admin/database-overview`;
    // eslint-disable-next-line no-console
    console.log("[Axis] Fetching admin overview from full URL:", endpoint);
    // eslint-disable-next-line no-console
    console.log("[Axis] API_BASE value:", API_BASE);
    // eslint-disable-next-line no-console
    console.log("[Axis] process.env.NEXT_PUBLIC_API_BASE:", process.env.NEXT_PUBLIC_API_BASE);
    
    const response = await fetch(endpoint, {
      cache: "no-store",
      credentials: "include",
    });
    
    // eslint-disable-next-line no-console
    console.log("[Axis] Fetch response status:", response.status, response.statusText);
    // eslint-disable-next-line no-console
    console.log("[Axis] Fetch response URL:", response.url);

    if (!response.ok) {
      console.error(
        "[Axis] Failed admin overview fetch",
        response.status,
        response.statusText,
      );
      return null;
    }

    const payload = (await response.json()) as AdminOverviewResponse;
    // eslint-disable-next-line no-console
    console.log(
      "[Axis] Admin overview fetch ok users=%d tasks=%d",
      payload.users.length,
      payload.tasks.length,
    );
    return payload;
  } catch (error) {
    console.error("[Axis] Exception during admin overview fetch", error);
    return null;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default async function AdminDatabasePage() {
  const data = await fetchAdminOverview();

  return (
    <div className="min-h-screen bg-zinc-100 pb-16 pt-10 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white/90 px-6 py-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Admin
            </span>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
              数据总览
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              查看最新的用户与任务条目（前 20 条）。
            </p>
          </div>
          <Link
            href="/tasks"
            className="inline-flex items-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
          >
            返回任务大厅
          </Link>
        </header>

        {!data ? (
          <div className="rounded-xl border border-dashed border-red-300 bg-red-50/70 px-6 py-10 text-center text-sm text-red-600 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
            无法加载数据库信息，请稍后重试或检查后端日志。
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  最新用户
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  仅展示最近创建的 20 位用户。
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] table-auto border-collapse text-sm">
                  <thead>
                    <tr className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      <th className="px-3 py-2 font-medium">用户 ID</th>
                      <th className="px-3 py-2 font-medium">邮箱</th>
                      <th className="px-3 py-2 font-medium">钱包</th>
                      <th className="px-3 py-2 font-medium">创建时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {data.users.length ? (
                      data.users.map((user) => (
                        <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                          <td className="px-3 py-2 font-mono text-xs">{user.id}</td>
                          <td className="px-3 py-2">{user.email ?? "—"}</td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {user.default_wallet_address ?? "—"}
                          </td>
                          <td className="px-3 py-2">{formatDate(user.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
                          colSpan={4}
                        >
                          暂无用户数据。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  任务列表
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  按 ID 顺序列出前 20 条任务。
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] table-auto border-collapse text-sm">
                  <thead>
                    <tr className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      <th className="px-3 py-2 font-medium">任务 ID</th>
                      <th className="px-3 py-2 font-medium">名称</th>
                      <th className="px-3 py-2 font-medium">难度</th>
                      <th className="px-3 py-2 font-medium">完成率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {data.tasks.length ? (
                      data.tasks.map((task) => (
                        <tr key={task.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                          <td className="px-3 py-2 font-mono text-xs">#{task.id}</td>
                          <td className="px-3 py-2">{task.name}</td>
                          <td className="px-3 py-2">{task.difficulty}</td>
                          <td className="px-3 py-2">{Math.round(task.success_rate)}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
                          colSpan={4}
                        >
                          暂无任务数据。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

