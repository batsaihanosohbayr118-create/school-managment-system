"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  FileUp,
  ListPlus,
  BookPlus,
  Video,
  ChevronDown,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { SubjectContent, SubjectLesson, SubjectTopic } from "@/lib/types";

type SectionId = "file" | "topic" | "lesson" | "video";

type Props = {
  subjectId: string;
};

function emptyContent(subjectId: string): SubjectContent {
  return { subjectId, topics: [], lessons: [], assignments: [] };
}

async function fetchContent(subjectId: string): Promise<SubjectContent> {
  const res = await fetch(`/api/subjects/${subjectId}/content`);
  const data = await res.json().catch(() => null);
  return (data as SubjectContent | null) ?? emptyContent(subjectId);
}

async function saveContent(subjectId: string, content: SubjectContent) {
  const res = await fetch(`/api/subjects/${subjectId}/content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Хадгалахад алдаа гарлаа");
  return content;
}

async function uploadFiles(subjectId: string, formData: FormData): Promise<SubjectContent> {
  const res = await fetch(`/api/subjects/${subjectId}/content`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Файл оруулахад алдаа гарлаа");
  return data as SubjectContent;
}

const SECTIONS: { id: SectionId; title: string; subtitle: string; icon: typeof FileUp }[] = [
  { id: "file", title: "Add from file", subtitle: "Upload prepared lesson files or videos", icon: FileUp },
  { id: "topic", title: "Add topic", subtitle: "Create a new topic with a title and description", icon: ListPlus },
  { id: "lesson", title: "Add lesson", subtitle: "Create a text-based lesson inside a topic", icon: BookPlus },
  { id: "video", title: "Add video lesson", subtitle: "Attach a video link to a topic", icon: Video },
];

function StatusLine({ status }: { status: { type: "idle" | "success" | "error"; message?: string } }) {
  if (status.type === "idle") return null;
  const isError = status.type === "error";
  return (
    <div
      className={`mt-2 flex items-center gap-1.5 text-[13px] ${
        isError ? "text-red-500" : "text-emerald-600"
      }`}
    >
      {isError ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
      <span>{status.message}</span>
    </div>
  );
}

function SubmitButton({ children, loading }: { children: ReactNode; loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-[15px] font-semibold text-white shadow-md shadow-indigo-200 active:scale-[0.99] transition-transform disabled:opacity-60 disabled:active:scale-100"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={2.5} />}
      {children}
    </button>
  );
}

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:bg-white transition-colors";

function TopicSelect({
  topics,
  value,
  onChange,
}: {
  topics: SubjectTopic[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldClass} appearance-none`}
    >
      <option value="" disabled>
        Select a topic
      </option>
      {topics.map((t) => (
        <option key={t.id} value={t.id}>
          {t.title}
        </option>
      ))}
    </select>
  );
}

function SectionHeader({
  section,
  isOpen,
  onToggle,
}: {
  section: (typeof SECTIONS)[number];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = section.icon;
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-slate-50 transition-colors"
      aria-expanded={isOpen}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
          isOpen ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white" : "bg-indigo-50 text-indigo-600"
        }`}
      >
        <Icon size={18} strokeWidth={2.25} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold text-slate-900">{section.title}</span>
        <span className="block text-[13px] text-slate-400 truncate">{section.subtitle}</span>
      </span>
      <ChevronDown
        size={18}
        className={`shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-indigo-600" : ""}`}
      />
    </button>
  );
}

export default function AddContentAccordion({ subjectId }: Props) {
  const [content, setContent] = useState<SubjectContent>(emptyContent(subjectId));
  const [loadingContent, setLoadingContent] = useState(true);
  const [openId, setOpenId] = useState<SectionId | null>("file");

  useEffect(() => {
    let active = true;
    setLoadingContent(true);
    fetchContent(subjectId).then((data) => {
      if (active) setContent(data);
      setLoadingContent(false);
    });
    return () => {
      active = false;
    };
  }, [subjectId]);

  const toggle = (id: SectionId) => setOpenId((current) => (current === id ? null : id));
  const hasTopics = content.topics.length > 0;

  // ---- Add from file ----
  const [fileTitle, setFileTitle] = useState("");
  const [fileTopicId, setFileTopicId] = useState("");
  const [fileDuration, setFileDuration] = useState("");
  const [fileList, setFileList] = useState<File[]>([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileStatus, setFileStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({ type: "idle" });

  async function handleFileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fileList.length === 0) {
      setFileStatus({ type: "error", message: "Файл сонгоно уу" });
      return;
    }
    setFileLoading(true);
    setFileStatus({ type: "idle" });
    try {
      const formData = new FormData();
      fileList.forEach((file) => formData.append("files", file));
      if (fileTitle) formData.append("title", fileTitle);
      if (fileTopicId) formData.append("topicId", fileTopicId);
      if (fileDuration) formData.append("duration", fileDuration);

      const updated = await uploadFiles(subjectId, formData);
      setContent(updated);
      setFileStatus({ type: "success", message: `${fileList.length} файл нэмэгдлээ` });
      setFileTitle("");
      setFileTopicId("");
      setFileDuration("");
      setFileList([]);
    } catch (err) {
      setFileStatus({ type: "error", message: err instanceof Error ? err.message : "Алдаа гарлаа" });
    } finally {
      setFileLoading(false);
    }
  }

  function FileDropPanel() {
    return (
      <form onSubmit={handleFileSubmit} className="px-4 pb-5 pt-1 space-y-3">
        <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 py-8 cursor-pointer hover:bg-indigo-50 transition-colors">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">
            <FileUp size={20} />
          </span>
          <span className="text-[15px] font-semibold text-indigo-600">
            {fileList.length > 0 ? `${fileList.length} файл сонгогдсон` : "Choose files"}
          </span>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => setFileList(Array.from(e.target.files ?? []))}
          />
        </label>
        <p className="text-[13px] leading-snug text-slate-400">
          Upload prepared lesson files or videos from your computer.
        </p>

        {hasTopics && (
          <TopicSelect topics={content.topics} value={fileTopicId} onChange={setFileTopicId} />
        )}
        <input
          value={fileTitle}
          onChange={(e) => setFileTitle(e.target.value)}
          placeholder="Lesson title (optional, single file only)"
          className={fieldClass}
        />
        <input
          value={fileDuration}
          onChange={(e) => setFileDuration(e.target.value)}
          placeholder="Duration (e.g. 45 min)"
          className={fieldClass}
        />

        <SubmitButton loading={fileLoading}>Upload</SubmitButton>
        <StatusLine status={fileStatus} />
      </form>
    );
  }

  // ---- Add topic ----
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [topicLoading, setTopicLoading] = useState(false);
  const [topicStatus, setTopicStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({ type: "idle" });

  async function handleTopicSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topicTitle.trim()) {
      setTopicStatus({ type: "error", message: "Сэдвийн нэрээ оруулна уу" });
      return;
    }
    setTopicLoading(true);
    setTopicStatus({ type: "idle" });
    try {
      const newTopic: SubjectTopic = {
        id: `T-${Date.now()}`,
        title: topicTitle.trim(),
        description: topicDescription.trim() || undefined,
      };
      const nextContent: SubjectContent = { ...content, topics: [...content.topics, newTopic] };
      await saveContent(subjectId, nextContent);
      setContent(nextContent);
      setTopicStatus({ type: "success", message: "Сэдэв нэмэгдлээ" });
      setTopicTitle("");
      setTopicDescription("");
    } catch (err) {
      setTopicStatus({ type: "error", message: err instanceof Error ? err.message : "Алдаа гарлаа" });
    } finally {
      setTopicLoading(false);
    }
  }

  function TopicPanel() {
    return (
      <form onSubmit={handleTopicSubmit} className="px-4 pb-5 pt-1 space-y-3">
        <input
          value={topicTitle}
          onChange={(e) => setTopicTitle(e.target.value)}
          placeholder="Topic title"
          className={fieldClass}
        />
        <textarea
          value={topicDescription}
          onChange={(e) => setTopicDescription(e.target.value)}
          placeholder="Description"
          rows={3}
          className={`${fieldClass} resize-none`}
        />
        <SubmitButton loading={topicLoading}>Add topic</SubmitButton>
        <StatusLine status={topicStatus} />
      </form>
    );
  }

  // ---- Add lesson (text-based) ----
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonTopicId, setLessonTopicId] = useState("");
  const [lessonDuration, setLessonDuration] = useState("");
  const [lessonObjectives, setLessonObjectives] = useState("");
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonStatus, setLessonStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({ type: "idle" });

  async function handleLessonSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lessonTitle.trim() || !lessonTopicId) {
      setLessonStatus({ type: "error", message: "Нэр болон сэдвээ сонгоно уу" });
      return;
    }
    setLessonLoading(true);
    setLessonStatus({ type: "idle" });
    try {
      const newLesson: SubjectLesson = {
        id: `L-${Date.now()}`,
        title: lessonTitle.trim(),
        topicId: lessonTopicId,
        duration: lessonDuration.trim() || undefined,
        objectives: lessonObjectives
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean),
      };
      const nextContent: SubjectContent = { ...content, lessons: [...content.lessons, newLesson] };
      await saveContent(subjectId, nextContent);
      setContent(nextContent);
      setLessonStatus({ type: "success", message: "Хичээл нэмэгдлээ" });
      setLessonTitle("");
      setLessonTopicId("");
      setLessonDuration("");
      setLessonObjectives("");
    } catch (err) {
      setLessonStatus({ type: "error", message: err instanceof Error ? err.message : "Алдаа гарлаа" });
    } finally {
      setLessonLoading(false);
    }
  }

  function LessonPanel() {
    if (!hasTopics) {
      return (
        <div className="px-4 pb-5 pt-1 text-[13px] text-slate-400">
          Эхлээд "Add topic" хэсгээс нэг сэдэв үүсгэнэ үү.
        </div>
      );
    }
    return (
      <form onSubmit={handleLessonSubmit} className="px-4 pb-5 pt-1 space-y-3">
        <TopicSelect topics={content.topics} value={lessonTopicId} onChange={setLessonTopicId} />
        <input
          value={lessonTitle}
          onChange={(e) => setLessonTitle(e.target.value)}
          placeholder="Lesson title"
          className={fieldClass}
        />
        <input
          value={lessonDuration}
          onChange={(e) => setLessonDuration(e.target.value)}
          placeholder="Duration (e.g. 45 min)"
          className={fieldClass}
        />
        <textarea
          value={lessonObjectives}
          onChange={(e) => setLessonObjectives(e.target.value)}
          placeholder={"Objectives (one per line)"}
          rows={3}
          className={`${fieldClass} resize-none`}
        />
        <SubmitButton loading={lessonLoading}>Add lesson</SubmitButton>
        <StatusLine status={lessonStatus} />
      </form>
    );
  }

  // ---- Add video lesson ----
  const [videoTitle, setVideoTitle] = useState("");
  const [videoTopicId, setVideoTopicId] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoStatus, setVideoStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({ type: "idle" });

  async function handleVideoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!videoTitle.trim() || !videoTopicId || !videoUrl.trim()) {
      setVideoStatus({ type: "error", message: "Бүх талбарыг бөглөнө үү" });
      return;
    }
    setVideoLoading(true);
    setVideoStatus({ type: "idle" });
    try {
      const newLesson: SubjectLesson = {
        id: `L-${Date.now()}`,
        title: videoTitle.trim(),
        topicId: videoTopicId,
        duration: videoDuration.trim() || undefined,
        videoUrl: videoUrl.trim(),
      };
      const nextContent: SubjectContent = { ...content, lessons: [...content.lessons, newLesson] };
      await saveContent(subjectId, nextContent);
      setContent(nextContent);
      setVideoStatus({ type: "success", message: "Видео хичээл нэмэгдлээ" });
      setVideoTitle("");
      setVideoTopicId("");
      setVideoDuration("");
      setVideoUrl("");
    } catch (err) {
      setVideoStatus({ type: "error", message: err instanceof Error ? err.message : "Алдаа гарлаа" });
    } finally {
      setVideoLoading(false);
    }
  }

  function VideoLessonPanel() {
    if (!hasTopics) {
      return (
        <div className="px-4 pb-5 pt-1 text-[13px] text-slate-400">
          Эхлээд "Add topic" хэсгээс нэг сэдэв үүсгэнэ үү.
        </div>
      );
    }
    return (
      <form onSubmit={handleVideoSubmit} className="px-4 pb-5 pt-1 space-y-3">
        <TopicSelect topics={content.topics} value={videoTopicId} onChange={setVideoTopicId} />
        <input
          value={videoTitle}
          onChange={(e) => setVideoTitle(e.target.value)}
          placeholder="Lesson title"
          className={fieldClass}
        />
        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Video URL (YouTube, Vimeo, or direct link)"
          className={fieldClass}
        />
        <input
          value={videoDuration}
          onChange={(e) => setVideoDuration(e.target.value)}
          placeholder="Duration (e.g. 12 min)"
          className={fieldClass}
        />
        <SubmitButton loading={videoLoading}>Add video lesson</SubmitButton>
        <StatusLine status={videoStatus} />
        <p className="text-[12px] text-slate-400">
          Видео файлыг шууд оруулах бол "Add from file" хэсгийг ашиглана уу.
        </p>
      </form>
    );
  }

  const PANELS: Record<SectionId, () => ReactNode> = {
    file: FileDropPanel,
    topic: TopicPanel,
    lesson: LessonPanel,
    video: VideoLessonPanel,
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex justify-center">
      <div className="w-full max-w-sm px-3 pt-6 pb-24">
        <h1 className="px-1 pb-4 text-[15px] font-semibold tracking-wide text-slate-500 uppercase">
          Add content
        </h1>

        {loadingContent ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-white py-10 text-slate-400 text-[14px] shadow-sm">
            <Loader2 size={16} className="animate-spin" />
            Loading...
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-sm shadow-slate-200/60 divide-y divide-slate-100 overflow-hidden">
            {SECTIONS.map((section) => {
              const isOpen = openId === section.id;
              const Panel = PANELS[section.id];
              return (
                <div key={section.id}>
                  <SectionHeader section={section} isOpen={isOpen} onToggle={() => toggle(section.id)} />
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <Panel />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}