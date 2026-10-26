import { Suspense } from "react";
import { RegisterView } from "@/components/auth/RegisterView";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterView />
    </Suspense>
  );
}
