const API = "https://api.github.com";
const AGENT_AUTHOR = { name: "Agentic OS Agent", email: "agent@agentcos.dev" };

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function gh<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers(token), ...init?.headers } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${init?.method ?? "GET"} ${path} failed (${res.status}): ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface RepoInfo {
  fullName: string;
  defaultBranch: string;
}

export async function verifyRepoAccess(token: string, fullName: string): Promise<RepoInfo> {
  const data = await gh<{ full_name: string; default_branch: string }>(token, `/repos/${fullName}`);
  return { fullName: data.full_name, defaultBranch: data.default_branch };
}

export async function getAuthenticatedLogin(token: string): Promise<string> {
  const data = await gh<{ login: string }>(token, `/user`);
  return data.login;
}

/** Repos the authenticated user owns or collaborates on, most recently pushed first. */
export async function listUserRepos(token: string): Promise<RepoInfo[]> {
  const data = await gh<{ full_name: string; default_branch: string }[]>(
    token,
    `/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator`
  );
  return data.map((r) => ({ fullName: r.full_name, defaultBranch: r.default_branch }));
}

async function getRefSha(token: string, fullName: string, branch: string): Promise<string> {
  const data = await gh<{ object: { sha: string } }>(token, `/repos/${fullName}/git/ref/heads/${branch}`);
  return data.object.sha;
}

/** Creates `branch` from `fromBranch` if it doesn't already exist; returns its tip sha either way. */
export async function ensureBranch(
  token: string,
  fullName: string,
  fromBranch: string,
  branch: string
): Promise<string> {
  try {
    return await getRefSha(token, fullName, branch);
  } catch {
    const baseSha = await getRefSha(token, fullName, fromBranch);
    await gh(token, `/repos/${fullName}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
    });
    return baseSha;
  }
}

async function getFileSha(token: string, fullName: string, path: string, branch: string): Promise<string | null> {
  try {
    const data = await gh<{ sha: string }>(
      token,
      `/repos/${fullName}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`
    );
    return data.sha;
  } catch {
    return null;
  }
}

export interface FileChange {
  path: string;
  content: string;
}

/** Commits `changes` to `branch`, one commit per file, author/committer hard-set regardless of token identity. */
export async function commitFiles(
  token: string,
  fullName: string,
  branch: string,
  changes: FileChange[],
  message: string
): Promise<void> {
  for (const change of changes) {
    const sha = await getFileSha(token, fullName, change.path, branch);
    await gh(token, `/repos/${fullName}/contents/${encodeURIComponent(change.path)}`, {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: Buffer.from(change.content, "utf-8").toString("base64"),
        branch,
        sha: sha ?? undefined,
        author: AGENT_AUTHOR,
        committer: AGENT_AUTHOR,
      }),
    });
  }
}

export interface OpenPrInput {
  fullName: string;
  head: string;
  base: string;
  title: string;
  body: string;
}

export async function openPullRequest(token: string, input: OpenPrInput): Promise<{ number: number; url: string }> {
  const data = await gh<{ number: number; html_url: string }>(token, `/repos/${input.fullName}/pulls`, {
    method: "POST",
    body: JSON.stringify({ title: input.title, head: input.head, base: input.base, body: input.body }),
  });
  return { number: data.number, url: data.html_url };
}

export async function mergePullRequest(token: string, fullName: string, number: number): Promise<void> {
  await gh(token, `/repos/${fullName}/pulls/${number}/merge`, { method: "PUT" });
}

export type CheckConclusion = "pending" | "success" | "failure";

/** Rolls up all check-runs on a ref into one verdict: any failure fails, any pending is pending, else success. */
export async function getCheckStatus(token: string, fullName: string, ref: string): Promise<CheckConclusion> {
  const data = await gh<{ check_runs: { status: string; conclusion: string | null }[] }>(
    token,
    `/repos/${fullName}/commits/${ref}/check-runs`
  );
  if (data.check_runs.length === 0) return "success";
  if (data.check_runs.some((c) => c.status !== "completed")) return "pending";
  if (data.check_runs.some((c) => c.conclusion !== "success")) return "failure";
  return "success";
}
