import { Suspense } from "react";
import { AuthCard } from "@/components/educore/auth-card";

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <AuthCard mode="forgot" />
    </Suspense>
  );
}
