export const metadata = {
  title: "Нууцлалын бодлого | Nova Mind Academy",
  description: "Nova Mind Academy аппликейшний нууцлалын бодлого"
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-[#0f172a]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold">Нууцлалын бодлого</h1>
        <p className="mt-2 text-sm text-slate-500">Сүүлд шинэчилсэн: 2026 оны 8 сарын 11</p>

        <section className="mt-10 space-y-4 text-[15px] leading-7 text-slate-700">
          <p>
            Nova Mind Academy (цаашид &laquo;бид&raquo;) нь сургуулийн удирдлагын систем бөгөөд энэхүү
            вэбсайт болон гар утасны аппликейшн (цаашид &laquo;Үйлчилгээ&raquo;)-ийг ашиглаж буй
            сурагч, эцэг эх, багш, админ хэрэглэгчдийн мэдээллийг хэрхэн цуглуулж, ашиглаж,
            хамгаалж байгааг энэ баримт бичигт тайлбарлав.
          </p>

          <h2 className="pt-4 text-xl font-semibold">Бид цуглуулдаг мэдээлэл</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Бүртгэлийн мэдээлэл: нэр, и-мэйл хаяг, хэрэглэгчийн эрх (сурагч/эцэг эх/багш/админ)</li>
            <li>Профайл зураг (сонголтоор, хэрэглэгч өөрөө оруулсан тохиолдолд)</li>
            <li>
              Сургалтын мэдээлэл: дүн, ирц, хичээлийн хуваарь, гэрийн даалгавар, зарлал, төлбөрийн
              төлөв — эдгээрийг сургуулийн админ болон багш нар бүртгэдэг
            </li>
            <li>
              Мэдэгдэл илгээхэд шаардлагатай push notification token (зөвхөн шинэ зарлал зэргийг
              мэдэгдэхэд ашиглагдана)
            </li>
          </ul>
          <p>
            Бид байршил, харилцагчийн жагсаалт, зураг/бичлэгийн сан, төлбөрийн картын мэдээлэл зэрэг
            эдгээрээс өөр өгөгдөл цуглуулдаггүй.
          </p>

          <h2 className="pt-4 text-xl font-semibold">Мэдээллийг хэрхэн ашигладаг</h2>
          <p>
            Цуглуулсан мэдээллийг зөвхөн Үйлчилгээг ажиллуулах зорилгоор ашигладаг: тухайн
            хэрэглэгчид өөрт нь (эсвэл эцэг эх бол хүүхдэд нь) хамаарах дүн, ирц, хуваарь, зарлал,
            төлбөрийн мэдээллийг харуулах, мөн шинэ зарлал гарахад push notification илгээх.
            Хэрэглэгч бүр зөвхөн өөрийн эрхэд хамаарах мэдээллийг л харах боломжтой.
          </p>

          <h2 className="pt-4 text-xl font-semibold">Мэдээлэл хуваалцах</h2>
          <p>
            Бид хэрэглэгчийн мэдээллийг гуравдагч этгээдэд худалдахгүй, зар сурталчилгааны
            зорилгоор ашиглуулахгүй. Үйлчилгээг ажиллуулахад зайлшгүй шаардлагатай дараах
            дэд бүтцийн үйлчилгээ үзүүлэгчдэд л мэдээлэл дамждаг (өгөгдөл хадгалах, push
            notification илгээх): Vercel (hosting), Neon (өгөгдлийн сан), Expo (push notification).
          </p>

          <h2 className="pt-4 text-xl font-semibold">Мэдээллийн аюулгүй байдал</h2>
          <p>
            Нууц үгийг hash хэлбэрээр хадгалдаг бөгөөд бүх холболт HTTPS-ээр шифрлэгдсэн байдаг.
            Хэрэглэгч бүр зөвхөн өөрийн эрхэд (роль) хамаарах өгөгдөлд хандах боломжтой — энэ
            хязгаарлалт сервер талд хэрэгждэг.
          </p>

          <h2 className="pt-4 text-xl font-semibold">Хүүхдийн мэдээлэл</h2>
          <p>
            Энэ Үйлчилгээ нь сургуулийн дотоод удирдлагын систем тул бүртгэл зөвхөн сургуулийн
            админаар үүсгэгддэг — задгай, өөрөө бүртгүүлэх боломжгүй. Насанд хүрээгүй сурагчийн
            бүртгэлийг сургууль, эцэг эхийн зөвшөөрлөөр админ үүсгэдэг.
          </p>

          <h2 className="pt-4 text-xl font-semibold">Мэдээлэл устгах</h2>
          <p>
            Хэрэглэгч өөрийн бүртгэлийг устгуулах хүсэлтээ сургуулийн админд илгээж болно. Админ
            бүртгэлийг устгасны дараа холбогдох хувийн мэдээлэл системээс арилна.
          </p>

          <h2 className="pt-4 text-xl font-semibold">Холбоо барих</h2>
          <p>
            Нууцлалын бодлоготой холбоотой асуулт байвал бидэнтэй дараах хаягаар холбогдоно уу:{" "}
            <a href="mailto:info@aethertech.mn" className="text-blue-600 underline">
              info@aethertech.mn
            </a>
          </p>
        </section>

        <hr className="my-12 border-slate-200" />

        <section className="space-y-4 text-[15px] leading-7 text-slate-700">
          <h1 className="text-2xl font-bold text-[#0f172a]">Privacy Policy (English)</h1>
          <p>
            Nova Mind Academy (&quot;we&quot;) is a school management system. This policy explains how
            we collect, use, and protect information for students, parents, teachers, and admins who
            use our website and mobile app (the &quot;Service&quot;).
          </p>

          <h2 className="pt-4 text-xl font-semibold">Information we collect</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Account details: name, email address, role (student/parent/teacher/admin)</li>
            <li>Profile photo (optional, only if the user uploads one)</li>
            <li>Academic data: grades, attendance, timetable, assignments, announcements, payment status — entered by the school&apos;s admin and teachers</li>
            <li>A push-notification token, used only to deliver announcement notifications</li>
          </ul>
          <p>We do not collect location, contacts, media libraries, or payment card details.</p>

          <h2 className="pt-4 text-xl font-semibold">How we use it</h2>
          <p>
            Data is used solely to operate the Service: showing each signed-in user the grades,
            attendance, timetable, announcements, and payment records that belong to them (or, for a
            parent, their child), and sending push notifications for new announcements. Every user
            can only see data their role is authorized to see.
          </p>

          <h2 className="pt-4 text-xl font-semibold">Sharing</h2>
          <p>
            We do not sell personal data or use it for advertising. Data is only shared with the
            infrastructure providers required to run the Service: Vercel (hosting), Neon (database),
            and Expo (push notification delivery).
          </p>

          <h2 className="pt-4 text-xl font-semibold">Security</h2>
          <p>
            Passwords are stored hashed, and all traffic is encrypted over HTTPS. Access to data is
            restricted server-side by each account&apos;s role.
          </p>

          <h2 className="pt-4 text-xl font-semibold">Children&apos;s privacy</h2>
          <p>
            This is an internal school system — accounts are provisioned only by the school&apos;s
            admin, with no public self-registration. A minor student&apos;s account is created by the
            school with the school/parent&apos;s authorization.
          </p>

          <h2 className="pt-4 text-xl font-semibold">Data deletion</h2>
          <p>
            A user may request account deletion through the school&apos;s admin. Once an admin deletes
            an account, the associated personal data is removed from the system.
          </p>

          <h2 className="pt-4 text-xl font-semibold">Contact</h2>
          <p>
            Questions about this policy can be sent to{" "}
            <a href="mailto:info@aethertech.mn" className="text-blue-600 underline">
              info@aethertech.mn
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
