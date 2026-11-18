import Image from "next/image";

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
