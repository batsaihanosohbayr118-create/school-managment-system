import { Suspense } from "react";
import { LoginView } from "@/components/auth/LoginView";

export default function RegisterPage() {
  return (
    <Suspense>
      <LoginView mode="register" />
    </Suspense>
  );
}
