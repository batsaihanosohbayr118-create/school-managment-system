import { Suspense } from "react";
import { LoginView } from "@/components/auth/LoginView";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
