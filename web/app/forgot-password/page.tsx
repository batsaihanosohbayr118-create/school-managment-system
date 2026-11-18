import Link from "next/link";
import { ArrowLeft, ShieldQuestion } from "lucide-react";

export const metadata = {
  title: "Нууц үг сэргээх — Nova Mind Academy"
};

/**
 * Self-service reset needs an email sender, which the app no longer has now
 * that accounts live in Neon. Passwords are reset by an administrator from
 * /admin/users instead, so this page just explains where to go.
 */
export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(120%_120%_at_0%_0%,#1e3a8a_0%,#111c44_45%,#0b1226_100%)] p-6">
      <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_80px_rgba(2,6,23,0.6)] backdrop-blur-2xl sm:p-10">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-[#7dd3fc] ring-1 ring-white/15">
          <ShieldQuestion size={26} />
        </span>

        <h1 className="mt-6 text-[1.7rem] font-black tracking-tight text-white">Нууц үгээ мартсан уу?</h1>

        <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
          Аюулгүй байдлын үүднээс нууц үгийг зөвхөн сургуулийн админ сэргээнэ. Админдаа хандаж
          шинэ нууц үг авна уу — тэрээр удирдлагын хэсгээс шууд шинэчилж өгөх боломжтой.
        </p>

        <Link
          href="/login"
          className="group mt-8 inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#2563EB] to-[#4F46E5] px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.4)] transition hover:-translate-y-0.5"
        >
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          Нэвтрэх хуудас руу буцах
        </Link>
      </div>
    </main>
  );
}
