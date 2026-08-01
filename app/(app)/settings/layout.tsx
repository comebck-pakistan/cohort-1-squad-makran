import { ReactNode } from "react";
import { SettingsTabs } from "@/features/settings/SettingsTabs";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <SettingsTabs />
      {children}
    </div>
  );
}
