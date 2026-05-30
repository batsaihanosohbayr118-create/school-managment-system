import { Suspense } from "react";
import { AuthCard } from "@/components/educore/auth-card";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthCard mode="login" />
    </Suspense>
  );
}
