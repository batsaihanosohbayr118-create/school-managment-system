import Image from "next/image";

/**
 * Shown by the App Router while a route segment loads. Kept free of client
 * state so it can render instantly — it follows the OS colour scheme instead
 * of the in-app dark mode toggle.
 */
export default function Loading() {
  return (
    <main className="route-loading">
      <div className="route-loading-mark">
        <Image
          className="ec-loading-logo"
          src="/logo-mark.png"
          alt=""
          width={544}
          height={420}
          priority
        />
        <span className="route-loading-ring" />
      </div>
      <strong>Nova Mind Academy</strong>
      <span className="route-loading-bar" />
    </main>
  );
}
