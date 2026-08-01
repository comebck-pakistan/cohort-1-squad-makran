import { ReactNode } from "react";
import { AuthShell } from "@/components/layout/AuthShell";

export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
