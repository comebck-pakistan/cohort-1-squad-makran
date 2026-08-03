import type { IntegrationRow, RepoRow } from "@/types/db";

export const mockIntegrations: IntegrationRow[] = [
  { id: "int_gh", owner_id: "owner_1", category: "repo", provider: "github", status: "connected", connected_at: "2025-11-02T09:00:00Z", account_label: "muhammad-ibrahim", access_token: null },
  { id: "int_cal", owner_id: "owner_1", category: "calendar", provider: "google_calendar", status: "connected", connected_at: "2025-11-02T09:05:00Z", account_label: "ibrahim@jfreaks.com", access_token: null },
];

export const mockRepos: RepoRow[] = [
  { id: "repo_storefront", owner_id: "owner_1", integration_id: "int_gh", provider: "github", full_name: "acme-corp/storefront", is_default: true },
  { id: "repo_dash", owner_id: "owner_1", integration_id: "int_gh", provider: "github", full_name: "bramblewood/dash", is_default: false },
];
