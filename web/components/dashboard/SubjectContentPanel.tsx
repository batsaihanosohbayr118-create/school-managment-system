"use client";

import { type CSSProperties, type FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Check, ChevronDown, Download, FileUp, Pencil, Plus, Printer, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type Language, translateValue } from "@/lib/i18n";
import { loadSubjectContent, openStoredFile, resolveStoredFileUrl, saveSubjectContent, uploadSubjectFiles } from "@/lib/subjectContent";
import type { SubjectContent, SubjectLesson } from "@/lib/types";
import { type SubjectContentTarget, emptySubjectContent, escapeHtml, formatFileSize, isDirectVideoUrl, isVideoFile, uploadErrorMessage, videoEmbedUrl } from "./dashboard-shared";
import { LessonVideo, TopicDropdown } from "./DashboardControls";

export function SubjectContentPanel({
  canManage,
  language,
  subject,
  onBack,
  onSaved
}: {
  canManage: boolean;
  language: Language;
  subject: Exclude<SubjectContentTarget, null>;
  onBack: () => void;
  onSaved: (label: string) => void;
}) {
  const [content, setContent] = useState<SubjectContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<"overview" | "topics" | "lessons" | "videos">("overview");
  const [topicForm, setTopicForm] = useState({ title: "", description: "" });
  const [lessonForm, setLessonForm] = useState({ title: "", topicId: "", duration: "", objectives: "" });
  const [videoForm, setVideoForm] = useState({ title: "", topicId: "", duration: "", videoUrl: "" });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [activeEditorTab, setActiveEditorTab] = useState<"file" | "topic" | "lesson" | "video" | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [deleteLessonTarget, setDeleteLessonTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteTopicTarget, setDeleteTopicTarget] = useState<{ id: string; label: string } | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  const currentContent = content ?? emptySubjectContent(subject.id);
  const selectedTopicId = lessonForm.topicId || currentContent.topics[0]?.id || "";
  const selectedVideoTopicId = videoForm.topicId || currentContent.topics[0]?.id || "";
  const videoLessonCount = currentContent.lessons.filter((lesson) => lesson.videoUrl || isVideoFile(lesson)).length;

  useEffect(() => {
    let ignore = false;

    async function loadContent() {
      setLoading(true);
      setMessage("");

      const loadedContent = await loadSubjectContent(subject.id);

      if (!ignore) {
        const nextContent = loadedContent ?? emptySubjectContent(subject.id);
        setContent(nextContent);
        setLessonForm((current) => ({ ...current, topicId: nextContent.topics[0]?.id ?? "" }));
        setVideoForm((current) => ({ ...current, topicId: nextContent.topics[0]?.id ?? "" }));
        setLoading(false);
      }
    }

    loadContent();

    return () => {
      ignore = true;
    };
  }, [subject.id]);

  async function persistContent(nextContent: SubjectContent, label: string) {
    setSaving(true);
    setMessage("");

    try {
      await saveSubjectContent(subject.id, nextContent);
      setContent(nextContent);
      onSaved(label);
      setMessage(language === "mn" ? "Амжилттай хадгаллаа." : "Saved successfully.");
    } catch {
      setMessage(language === "mn" ? "Файл хадгалж чадсангүй." : "Could not save the content file.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLessonFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    try {
      setSaving(true);
      setMessage("");
      const nextContent = await uploadSubjectFiles(subject.id, files);
      setContent(nextContent);
      onSaved(files.map((file) => file.name).join(", "));
      setMessage(language === "mn" ? "Файл/видео амжилттай нэмэгдлээ." : "Files and videos uploaded successfully.");
    } catch (error) {
      setMessage(uploadErrorMessage(error, language, language === "mn" ? "Файл/видео upload хийж чадсангүй." : "The files or videos could not be uploaded."));
    } finally {
      setSaving(false);
    }
  }

  async function printLessonFile(lesson: SubjectLesson, topicTitle: string) {
    if (!lesson.fileUrl) return;

    // Opened before the await, so the popup blocker counts it as part of the click.
    const printWindow = window.open("", "_blank", "width=1080,height=760");

    if (!printWindow) {
      setMessage(language === "mn" ? "Хэвлэх цонх нээгдсэнгүй." : "The print window could not be opened.");
      return;
    }

    let fileUrl: string;
    try {
      fileUrl = new URL(await resolveStoredFileUrl(lesson.fileUrl), window.location.origin).href;
    } catch {
      printWindow.close();
      setMessage(language === "mn" ? "Файлыг нээж чадсангүй." : "Could not open the file.");
      return;
    }
    const fileName = lesson.fileName ?? lesson.title;
    const lowerFileName = fileName.toLowerCase();
    const fileType = (lesson.fileType ?? "").toLowerCase();
    const isPdf = fileType.includes("pdf") || lowerFileName.endsWith(".pdf");
    const isImage = /\.(png|jpe?g|webp|gif|bmp)$/i.test(lowerFileName) || fileType.startsWith("image/");
    const isText = lowerFileName.endsWith(".txt") || fileType.startsWith("text/");
    const safeTitle = escapeHtml(lesson.title);
    const safeTopic = escapeHtml(topicTitle);
    const safeFileName = escapeHtml(fileName);
    const safeFileUrl = escapeHtml(fileUrl);
    const safeSize = escapeHtml(formatFileSize(lesson.fileSize));
    const previewMarkup = isPdf || isText
      ? `<iframe class="print-preview" src="${safeFileUrl}"></iframe>`
      : isImage
        ? `<img class="print-image" src="${safeFileUrl}" alt="${safeFileName}" />`
        : `<div class="print-fallback">
            <p>${language === "mn" ? "Энэ файлыг браузер шууд preview хийх боломжгүй байж магадгүй." : "This file may not be directly previewable in the browser."}</p>
            <a href="${safeFileUrl}" target="_blank" rel="noreferrer">${language === "mn" ? "Файл нээх" : "Open file"}</a>
          </div>`;

    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${safeTitle} - PDF</title>
          <style>
            @page { margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #0f172a;
              background: #fff;
              font-family: Arial, Helvetica, sans-serif;
            }
            .print-header {
              display: grid;
              gap: 6px;
              padding: 20px 0 14px;
              border-bottom: 1px solid #e2e8f0;
            }
            .print-header p,
            .print-header h1 {
              margin: 0;
            }
            .print-header p {
              color: #64748b;
              font-size: 13px;
              font-weight: 700;
            }
            .print-header h1 {
              font-size: 28px;
              line-height: 1.15;
            }
            .print-meta {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              margin-top: 4px;
              color: #475569;
              font-size: 13px;
            }
            .print-body {
              padding-top: 18px;
            }
            .print-preview {
              width: 100%;
              height: 78vh;
              border: 0;
            }
            .print-image {
              display: block;
              max-width: 100%;
              max-height: 80vh;
              margin: 0 auto;
              object-fit: contain;
            }
            .print-fallback {
              display: grid;
              gap: 12px;
              padding: 22px;
              background: #f8fafc;
              border-radius: 14px;
              color: #475569;
            }
            .print-fallback p {
              margin: 0;
            }
            .print-fallback a {
              color: #2563eb;
              font-weight: 700;
            }
            @media print {
              .print-header {
                break-after: avoid;
              }
              .print-preview {
                height: 82vh;
              }
            }
          </style>
        </head>
        <body>
          <main>
            <header class="print-header">
              <p>${language === "mn" ? "Хичээлийн файл" : "Lesson file"}</p>
              <h1>${safeTitle}</h1>
              <div class="print-meta">
                <span>${safeTopic}</span>
                <span>${safeFileName}</span>
                ${safeSize ? `<span>${safeSize}</span>` : ""}
              </div>
            </header>
            <section class="print-body">
              ${previewMarkup}
            </section>
          </main>
          <script>
            const runPrint = () => setTimeout(() => {
              window.focus();
              window.print();
            }, 500);
            const preview = document.querySelector(".print-preview, .print-image");
            if (preview) {
              preview.addEventListener("load", runPrint, { once: true });
              setTimeout(runPrint, 1800);
            } else {
              runPrint();
            }
          </script>
        </body>
      </html>`);
    printWindow.document.close();
  }

  async function addTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = topicForm.title.trim();
    if (!title) return;

    const description = topicForm.description.trim() || undefined;

    if (editingTopicId) {
      const nextContent = {
        ...currentContent,
        topics: currentContent.topics.map((topic) =>
          topic.id === editingTopicId ? { ...topic, title, description } : topic
        )
      };

      await persistContent(nextContent, title);
      setTopicForm({ title: "", description: "" });
      setEditingTopicId(null);
      return;
    }

    const topic = {
      id: `T-${Date.now()}`,
      title,
      description
    };
    const nextContent = {
      ...currentContent,
      topics: [...currentContent.topics, topic]
    };

    await persistContent(nextContent, title);
    setTopicForm({ title: "", description: "" });
    setLessonForm((current) => ({ ...current, topicId: current.topicId || topic.id }));
    setVideoForm((current) => ({ ...current, topicId: current.topicId || topic.id }));
  }

  function startEditTopic(topic: { id: string; title: string; description?: string }) {
    setEditingTopicId(topic.id);
    setTopicForm({
      title: topic.title,
      description: topic.description ?? ""
    });
    setActiveView("overview");
    setActiveEditorTab("topic");
    requestAnimationFrame(() => {
      document.getElementById("subject-editor-accordion")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function requestDeleteTopic(topic: { id: string; title: string }) {
    setDeleteTopicTarget({ id: topic.id, label: topic.title });
  }

  async function deleteTopic() {
    if (!deleteTopicTarget) return;

    const topicId = deleteTopicTarget.id;
    const label = deleteTopicTarget.label;
    const nextContent = {
      ...currentContent,
      topics: currentContent.topics.filter((topic) => topic.id !== topicId),
      lessons: currentContent.lessons.filter((lesson) => lesson.topicId !== topicId)
    };

    setDeleteTopicTarget(null);
    if (editingTopicId === topicId) {
      setEditingTopicId(null);
      setTopicForm({ title: "", description: "" });
    }

    await persistContent(nextContent, label);
    setMessage(language === "mn" ? "Сэдэв болон холбогдох хичээлүүд устгагдлаа." : "Topic and its lessons were deleted.");
  }

  async function addLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = lessonForm.title.trim();
    if (!title) return;

    const topicId = selectedTopicId || `T-${Date.now()}`;
    const topics = currentContent.topics.length > 0
      ? currentContent.topics
      : [{ id: topicId, title: language === "mn" ? "Ерөнхий сэдэв" : "General topic" }];
    const objectives = lessonForm.objectives
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    const nextContent = editingLessonId
      ? {
          ...currentContent,
          topics,
          lessons: currentContent.lessons.map((lesson) =>
            lesson.id === editingLessonId
              ? { ...lesson, title, topicId, duration: lessonForm.duration.trim() || undefined, objectives }
              : lesson
          )
        }
      : {
          ...currentContent,
          topics,
          lessons: [
            ...currentContent.lessons,
            {
              id: `L-${Date.now()}`,
              title,
              topicId,
              duration: lessonForm.duration.trim() || undefined,
              objectives
            }
          ]
        };

    await persistContent(nextContent, title);
    setLessonForm({ title: "", topicId, duration: "", objectives: "" });
    setEditingLessonId(null);
  }

  function startEditLesson(lesson: SubjectLesson) {
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title,
      topicId: lesson.topicId,
      duration: lesson.duration ?? "",
      objectives: lesson.objectives?.join("\n") ?? ""
    });
    setActiveView("overview");
    setActiveEditorTab("lesson");
    requestAnimationFrame(() => {
      document.getElementById("subject-editor-accordion")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function startEditVideoLesson(lesson: SubjectLesson) {
    setEditingVideoId(lesson.id);
    setVideoForm({
      title: lesson.title,
      topicId: lesson.topicId,
      duration: lesson.duration ?? "",
      videoUrl: lesson.videoUrl ?? ""
    });
    setActiveView("overview");
    setActiveEditorTab("video");
    requestAnimationFrame(() => {
      document.getElementById("subject-editor-accordion")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function requestDeleteLesson(lesson: SubjectLesson) {
    setDeleteLessonTarget({ id: lesson.id, label: lesson.title });
  }

  async function deleteLesson() {
    if (!deleteLessonTarget) return;

    const lessonId = deleteLessonTarget.id;
    const label = deleteLessonTarget.label;
    const nextContent = {
      ...currentContent,
      lessons: currentContent.lessons.filter((lesson) => lesson.id !== lessonId)
    };

    setDeleteLessonTarget(null);
    if (editingLessonId === lessonId) {
      setEditingLessonId(null);
      setLessonForm({ title: "", topicId: selectedTopicId, duration: "", objectives: "" });
    }
    if (editingVideoId === lessonId) {
      setEditingVideoId(null);
      setVideoForm({ title: "", topicId: selectedVideoTopicId, duration: "", videoUrl: "" });
    }

    await persistContent(nextContent, label);
    setMessage(language === "mn" ? "Хичээл устгагдлаа." : "Lesson deleted.");
  }

  async function addVideoLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = videoForm.title.trim();
    const videoUrl = videoForm.videoUrl.trim();
    if (!title || (!videoUrl && !videoFile)) return;

    const topicId = selectedVideoTopicId || `T-${Date.now()}`;

    if (videoFile) {
      try {
        setSaving(true);
        setMessage("");
        const nextContent = await uploadSubjectFiles(subject.id, [videoFile], {
          title,
          topicId,
          duration: videoForm.duration.trim() || undefined
        });
        setContent(nextContent);
        onSaved(title);
        setMessage(language === "mn" ? "Видео файл амжилттай нэмэгдлээ." : "Video file uploaded successfully.");
        setVideoForm({ title: "", topicId, duration: "", videoUrl: "" });
        setVideoFile(null);
        setEditingVideoId(null);
        if (videoFileInputRef.current) videoFileInputRef.current.value = "";
      } catch (error) {
        setMessage(uploadErrorMessage(error, language, language === "mn" ? "Видео файл upload хийж чадсангүй." : "The video file could not be uploaded."));
      } finally {
        setSaving(false);
      }
      return;
    }

    const topics = currentContent.topics.length > 0
      ? currentContent.topics
      : [{ id: topicId, title: language === "mn" ? "Ерөнхий сэдэв" : "General topic" }];

    const nextContent = editingVideoId
      ? {
          ...currentContent,
          topics,
          lessons: currentContent.lessons.map((lesson) =>
            lesson.id === editingVideoId
              ? { ...lesson, title, topicId, duration: videoForm.duration.trim() || undefined, videoUrl }
              : lesson
          )
        }
      : {
          ...currentContent,
          topics,
          lessons: [
            ...currentContent.lessons,
            {
              id: `L-VIDEO-${Date.now()}`,
              title,
              topicId,
              duration: videoForm.duration.trim() || undefined,
              videoUrl
            }
          ]
        };

    await persistContent(nextContent, title);
    setVideoForm({ title: "", topicId, duration: "", videoUrl: "" });
    setEditingVideoId(null);
  }


  return (
    <section className="subject-content-panel">
      <div className="subject-content-header">
        <button
          className="subject-back-button"
          onClick={() => (activeView === "overview" ? onBack() : setActiveView("overview"))}
          type="button"
        >
          <ArrowLeft size={17} />
          {language === "mn" ? "Буцах" : "Back"}
        </button>
        <div>
          <p>
            {activeView === "overview"
              ? language === "mn" ? "Хичээлийн агуулга" : "Subject content"
              : activeView === "topics"
              ? language === "mn" ? "Сэдвүүд" : "Topics"
              : activeView === "lessons"
              ? language === "mn" ? "Хичээлүүд" : "Lessons"
              : language === "mn" ? "Видео хичээлүүд" : "Video lessons"}
          </p>
          <h2>{translateValue(subject.name, language)}</h2>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent>
            <div className="ec-loading-panel">
              <span className="ec-spinner" style={{ "--ec-spinner-size": "30px", "--ec-spinner-width": "3px" } as CSSProperties} />
              <strong>{language === "mn" ? "Агуулга ачаалж байна..." : "Loading content..."}</strong>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="subject-content-stats">
            <button className="subject-stat-button" onClick={() => setActiveView("topics")} type="button">
              <strong>{currentContent.topics.length}</strong>
              {language === "mn" ? "Сэдэв" : "Topics"}
            </button>
            <button className="subject-stat-button" onClick={() => setActiveView("lessons")} type="button">
              <strong>{currentContent.lessons.length}</strong>
              {language === "mn" ? "Хичээл" : "Lessons"}
            </button>
            <button className="subject-stat-button" onClick={() => setActiveView("videos")} type="button">
              <strong>{videoLessonCount}</strong>
              {language === "mn" ? "Видео" : "Videos"}
            </button>
          </div>

          {canManage && activeView === "overview" ? (
  <div className="subject-accordion" id="subject-editor-accordion">
    {(
      [
        { id: "file", icon: <FileUp size={18} />, labelEn: "Add from file", labelMn: "Файлаас нэмэх" },
        { id: "topic", icon: <BookOpen size={18} />, labelEn: "Add topic", labelMn: "Сэдэв нэмэх" },
        { id: "lesson", icon: <Plus size={18} />, labelEn: "Add lesson", labelMn: "Хичээл нэмэх" },
        { id: "video", icon: <Video size={18} />, labelEn: "Add video lesson", labelMn: "Видео хичээл нэмэх" },
      ] as const
    ).map((item) => {
      const isOpen = activeEditorTab === item.id;
      return (
        <div className={`subject-accordion-item${isOpen ? " open" : ""}`} key={item.id}>
          <button
            className="subject-accordion-trigger"
            onClick={() => setActiveEditorTab(isOpen ? null : item.id)}
            type="button"
            aria-expanded={isOpen}
          >
            <span className="subject-accordion-icon">{item.icon}</span>
            <span>{language === "mn" ? item.labelMn : item.labelEn}</span>
            <ChevronDown size={18} className={`subject-accordion-chevron${isOpen ? " rotated" : ""}`} />
          </button>

          {isOpen && (
            <motion.div
              className="subject-accordion-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="subject-accordion-content">

                {item.id === "file" && (
                  <>
                    <label className="subject-file-import">
                      <FileUp size={20} />
                      <span>{language === "mn" ? "Файл сонгох" : "Choose files"}</span>
                      <input
                        accept=".doc,.docx,.ppt,.pptx,.pdf,.xls,.xlsx,.txt,.rtf,.mp4,.webm,.ogg,.mov,.m4v,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf,video/mp4,video/webm,video/ogg,video/quicktime"
                        multiple
                        onChange={(event) => {
                          uploadLessonFiles(event.target.files);
                          event.currentTarget.value = "";
                        }}
                        type="file"
                      />
                    </label>
                    <p className="subject-help-text">
                      {language === "mn"
                        ? "Компьютер дээр бэлдсэн хичээлийн файл эсвэл video сонгоно."
                        : "Upload prepared lesson files or videos from your computer."}
                    </p>
                  </>
                )}

                {item.id === "topic" && (
                  <form className="subject-inline-form" onSubmit={addTopic}>
                    <Input onChange={(event) => setTopicForm((current) => ({ ...current, title: event.target.value }))} placeholder={language === "mn" ? "Сэдвийн нэр" : "Topic title"} required value={topicForm.title} />
                    <Input onChange={(event) => setTopicForm((current) => ({ ...current, description: event.target.value }))} placeholder={language === "mn" ? "Тайлбар" : "Description"} value={topicForm.description} />
                    <div className="subject-form-actions">
                      <Button disabled={saving} type="submit">
                        {editingTopicId ? <Check size={16} /> : <Plus size={16} />}
                        {editingTopicId
                          ? (language === "mn" ? "Хадгалах" : "Save changes")
                          : (language === "mn" ? "Сэдэв нэмэх" : "Add topic")}
                      </Button>
                      {editingTopicId ? (
                        <Button
                          onClick={() => {
                            setEditingTopicId(null);
                            setTopicForm({ title: "", description: "" });
                          }}
                          type="button"
                          variant="ghost"
                        >
                          {language === "mn" ? "Цуцлах" : "Cancel"}
                        </Button>
                      ) : null}
                    </div>
                  </form>
                )}

                {item.id === "lesson" && (
                  <form className="subject-inline-form subject-lesson-form" onSubmit={addLesson}>
                    <Input onChange={(event) => setLessonForm((current) => ({ ...current, title: event.target.value }))} placeholder={language === "mn" ? "Хичээлийн нэр" : "Lesson title"} required value={lessonForm.title} />
                    <TopicDropdown
                      onChange={(topicId) => setLessonForm((current) => ({ ...current, topicId }))}
                      options={currentContent.topics.map((topic) => ({ id: topic.id, label: translateValue(topic.title, language) }))}
                      placeholder={language === "mn" ? "Ерөнхий сэдэв" : "General topic"}
                      value={selectedTopicId}
                    />
                    <Input onChange={(event) => setLessonForm((current) => ({ ...current, duration: event.target.value }))} placeholder={language === "mn" ? "Үргэлжлэх хугацаа" : "Duration"} value={lessonForm.duration} />
                    <Input onChange={(event) => setLessonForm((current) => ({ ...current, objectives: event.target.value }))} placeholder={language === "mn" ? "Зорилго, таслалаар" : "Objectives, comma-separated"} value={lessonForm.objectives} />
                    <div className="subject-form-actions">
                      <Button disabled={saving} type="submit">
                        {editingLessonId ? <Check size={16} /> : <Plus size={16} />}
                        {editingLessonId
                          ? (language === "mn" ? "Хадгалах" : "Save changes")
                          : (language === "mn" ? "Хичээл нэмэх" : "Add lesson")}
                      </Button>
                      {editingLessonId ? (
                        <Button
                          onClick={() => {
                            setEditingLessonId(null);
                            setLessonForm({ title: "", topicId: selectedTopicId, duration: "", objectives: "" });
                          }}
                          type="button"
                          variant="ghost"
                        >
                          {language === "mn" ? "Цуцлах" : "Cancel"}
                        </Button>
                      ) : null}
                    </div>
                  </form>
                )}

                {item.id === "video" && (
                  <form className="subject-inline-form subject-lesson-form" onSubmit={addVideoLesson}>
                    <Input onChange={(event) => setVideoForm((current) => ({ ...current, title: event.target.value }))} placeholder={language === "mn" ? "Видео хичээлийн нэр" : "Video lesson title"} required value={videoForm.title} />
                    <TopicDropdown
                      onChange={(topicId) => setVideoForm((current) => ({ ...current, topicId }))}
                      options={currentContent.topics.map((topic) => ({ id: topic.id, label: translateValue(topic.title, language) }))}
                      placeholder={language === "mn" ? "Ерөнхий сэдэв" : "General topic"}
                      value={selectedVideoTopicId}
                    />
                    <Input onChange={(event) => setVideoForm((current) => ({ ...current, duration: event.target.value }))} placeholder={language === "mn" ? "Үргэлжлэх хугацаа" : "Duration"} value={videoForm.duration} />
                    <Input onChange={(event) => setVideoForm((current) => ({ ...current, videoUrl: event.target.value }))} placeholder={language === "mn" ? "Видео холбоос оруулах" : "Enter video URL"} type="text" value={videoForm.videoUrl} />
                    {!editingVideoId ? (
                      <label className="subject-video-file-import">
                        <FileUp size={18} />
                        <span>{videoFile?.name ?? (language === "mn" ? "Видео файл сонгох" : "Choose video file")}</span>
                        <input
                          accept=".mp4,.webm,.ogg,.mov,.m4v,video/mp4,video/webm,video/ogg,video/quicktime"
                          onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
                          ref={videoFileInputRef}
                          type="file"
                        />
                      </label>
                    ) : null}
                    <div className="subject-form-actions">
                      <Button disabled={saving} type="submit">
                        {editingVideoId ? <Check size={16} /> : <Video size={16} />}
                        {editingVideoId
                          ? (language === "mn" ? "Хадгалах" : "Save changes")
                          : (language === "mn" ? "Видео нэмэх" : "Add video")}
                      </Button>
                      {editingVideoId ? (
                        <Button
                          onClick={() => {
                            setEditingVideoId(null);
                            setVideoForm({ title: "", topicId: selectedVideoTopicId, duration: "", videoUrl: "" });
                          }}
                          type="button"
                          variant="ghost"
                        >
                          {language === "mn" ? "Цуцлах" : "Cancel"}
                        </Button>
                      ) : null}
                    </div>
                  </form>
                )}


              </div>
            </motion.div>
          )}
        </div>
      );
    })}
  </div>
) : null}
          {message ? <p className="subject-content-message">{message}</p> : null}

          {activeView === "topics" ? (
            <div className="subject-content-grid">
              <Card>
                <CardHeader>
                  <CardTitle>{language === "mn" ? "Сэдвүүд" : "Topics"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="subject-list">
                    {currentContent.topics.length > 0 ? (
                      currentContent.topics.map((topic) => (
                        <article key={topic.id}>
                          <strong>{translateValue(topic.title, language)}</strong>
                          {topic.description ? <p>{translateValue(topic.description, language)}</p> : null}
                          {canManage ? (
                            <div className="subject-file-actions">
                              <button className="subject-item-edit" aria-label={language === "mn" ? "Засах" : "Edit"} onClick={() => startEditTopic(topic)} title={language === "mn" ? "Засах" : "Edit"} type="button">
                                <Pencil size={15} />
                              </button>
                              <button className="subject-item-delete" aria-label={language === "mn" ? "Устгах" : "Delete"} onClick={() => requestDeleteTopic(topic)} title={language === "mn" ? "Устгах" : "Delete"} type="button">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <p className="subject-help-text">{language === "mn" ? "Сэдэв нэмэгдээгүй байна." : "No topics yet."}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeView === "lessons" ? (
            <div className="subject-content-grid">
              <Card>
                <CardHeader>
                  <CardTitle>{language === "mn" ? "Хичээлүүд" : "Lessons"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="subject-list subject-lesson-carousel">
                    {currentContent.lessons.length > 0 ? (
                      currentContent.lessons.map((lesson) => {
                        const topic = currentContent.topics.find((item) => item.id === lesson.topicId);

                        return (
                          <article key={lesson.id}>
                            <strong>{lesson.title}</strong>
                            <p>
                              {topic?.title ? translateValue(topic.title, language) : lesson.topicId}
                              {lesson.duration ? ` - ${lesson.duration}` : ""}
                            </p>
                            {(lesson.fileUrl || canManage) ? (
                              <div className="subject-file-actions">
                                {lesson.fileUrl ? (
                                  <>
                                    <a
                                      className="subject-file-link"
                                      href={lesson.fileUrl}
                                      onClick={(event) => {
                                        event.preventDefault();
                                        openStoredFile(lesson.fileUrl ?? "").catch(() => setMessage(language === "mn" ? "Файлыг нээж чадсангүй." : "Could not open the file."));
                                      }}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      <Download size={15} />
                                      <span>{lesson.fileName ?? (language === "mn" ? "Файл нээх" : "Open file")}</span>
                                      {lesson.fileSize ? <small>{formatFileSize(lesson.fileSize)}</small> : null}
                                    </a>
                                    <button className="subject-file-print" onClick={() => printLessonFile(lesson, topic?.title ? translateValue(topic.title, language) : lesson.topicId)} type="button">
                                      <Printer size={15} />
                                      <span>{language === "mn" ? "PDF-р хэвлэх" : "Print PDF"}</span>
                                    </button>
                                  </>
                                ) : null}
                                {canManage ? (
                                  <>
                                    <button className="subject-item-edit" aria-label={language === "mn" ? "Засах" : "Edit"} onClick={() => startEditLesson(lesson)} title={language === "mn" ? "Засах" : "Edit"} type="button">
                                      <Pencil size={15} />
                                    </button>
                                    <button className="subject-item-delete" aria-label={language === "mn" ? "Устгах" : "Delete"} onClick={() => requestDeleteLesson(lesson)} title={language === "mn" ? "Устгах" : "Delete"} type="button">
                                      <Trash2 size={15} />
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            ) : null}
                            {lesson.objectives?.length ? (
                              <ul>
                                {lesson.objectives.map((objective) => (
                                  <li key={objective}>{objective}</li>
                                ))}
                              </ul>
                            ) : null}
                          </article>
                        );
                      })
                    ) : (
                      <p className="subject-help-text">{language === "mn" ? "Хичээл нэмэгдээгүй байна." : "No lessons yet."}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {videoLessonCount > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{language === "mn" ? "Видео хичээлүүд" : "Video lessons"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="subject-list subject-video-list subject-video-carousel">
                      {currentContent.lessons
                        .filter((lesson) => lesson.videoUrl || isVideoFile(lesson))
                        .map((lesson) => {
                          const topic = currentContent.topics.find((item) => item.id === lesson.topicId);
                          const lessonVideoUrl = lesson.videoUrl || (isVideoFile(lesson) ? lesson.fileUrl : "");
                          const lessonVideoEmbedUrl = videoEmbedUrl(lessonVideoUrl);
                          const showDirectVideo = Boolean(lessonVideoUrl && !lessonVideoEmbedUrl && (isVideoFile(lesson) || isDirectVideoUrl(lessonVideoUrl)));

                          return (
                            <article key={lesson.id}>
                              <strong>{lesson.title}</strong>
                              <p>
                                {topic?.title ? translateValue(topic.title, language) : lesson.topicId}
                                {lesson.duration ? ` - ${lesson.duration}` : ""}
                              </p>
                              <div className="subject-video-preview">
                                {lessonVideoEmbedUrl ? (
                                  <iframe
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    src={lessonVideoEmbedUrl}
                                    title={lesson.title}
                                  />
                                ) : showDirectVideo ? (
                                  <LessonVideo src={lessonVideoUrl ?? ""} />
                                ) : (
                                  <a className="subject-video-link" href={lessonVideoUrl} target="_blank" rel="noreferrer">
                                    <Video size={15} />
                                    <span>{language === "mn" ? "Видео нээх" : "Open video"}</span>
                                  </a>
                                )}
                              </div>
                              {canManage ? (
                                <div className="subject-file-actions">
                                  <button className="subject-item-edit" aria-label={language === "mn" ? "Засах" : "Edit"} onClick={() => startEditVideoLesson(lesson)} title={language === "mn" ? "Засах" : "Edit"} type="button">
                                    <Pencil size={15} />
                                  </button>
                                  <button className="subject-item-delete" aria-label={language === "mn" ? "Устгах" : "Delete"} onClick={() => requestDeleteLesson(lesson)} title={language === "mn" ? "Устгах" : "Delete"} type="button">
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              ) : null}
                            </article>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}

          {activeView === "videos" ? (
            <div className="subject-content-grid subject-videos-grid">
              <Card>
                <CardHeader>
                  <CardTitle>{language === "mn" ? "Видео хичээлүүд" : "Video lessons"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="subject-list subject-video-list subject-video-carousel">
                    {videoLessonCount > 0 ? (
                      currentContent.lessons
                        .filter((lesson) => lesson.videoUrl || isVideoFile(lesson))
                        .map((lesson) => {
                          const topic = currentContent.topics.find((item) => item.id === lesson.topicId);
                          const lessonVideoUrl = lesson.videoUrl || (isVideoFile(lesson) ? lesson.fileUrl : "");
                          const lessonVideoEmbedUrl = videoEmbedUrl(lessonVideoUrl);
                          const showDirectVideo = Boolean(lessonVideoUrl && !lessonVideoEmbedUrl && (isVideoFile(lesson) || isDirectVideoUrl(lessonVideoUrl)));

                          return (
                            <article key={lesson.id}>
                              <strong>{lesson.title}</strong>
                              <p>
                                {topic?.title ? translateValue(topic.title, language) : lesson.topicId}
                                {lesson.duration ? ` - ${lesson.duration}` : ""}
                              </p>
                              {lessonVideoUrl ? (
                                <div className="subject-video-preview">
                                  {lessonVideoEmbedUrl ? (
                                    <iframe
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                      allowFullScreen
                                      src={lessonVideoEmbedUrl}
                                      title={lesson.title}
                                    />
                                  ) : showDirectVideo ? (
                                    <LessonVideo src={lessonVideoUrl ?? ""} />
                                  ) : (
                                    <a className="subject-video-link" href={lessonVideoUrl} target="_blank" rel="noreferrer">
                                      <Video size={15} />
                                      <span>{language === "mn" ? "Видео нээх" : "Open video"}</span>
                                    </a>
                                  )}
                                </div>
                              ) : null}
                              {canManage ? (
                                <div className="subject-file-actions">
                                  <button className="subject-item-edit" aria-label={language === "mn" ? "Засах" : "Edit"} onClick={() => startEditVideoLesson(lesson)} title={language === "mn" ? "Засах" : "Edit"} type="button">
                                    <Pencil size={15} />
                                  </button>
                                  <button className="subject-item-delete" aria-label={language === "mn" ? "Устгах" : "Delete"} onClick={() => requestDeleteLesson(lesson)} title={language === "mn" ? "Устгах" : "Delete"} type="button">
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              ) : null}
                            </article>
                          );
                        })
                    ) : (
                      <p className="subject-help-text">{language === "mn" ? "Видео хичээл нэмэгдээгүй байна." : "No video lessons yet."}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      )}

      {deleteLessonTarget ? (
        <div className="modal-layer">
          <div className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-delete-title">
            <div className="delete-icon">
              <Trash2 size={20} />
            </div>
            <div>
              <strong id="lesson-delete-title">{language === "mn" ? "Хичээл устгах" : "Delete lesson"}</strong>
              <p>
                {language === "mn"
                  ? `"${deleteLessonTarget.label}"-ыг устгахдаа итгэлтэй байна уу?`
                  : `Are you sure you want to delete "${deleteLessonTarget.label}"?`}
              </p>
            </div>
            <div className="delete-actions">
              <Button onClick={() => setDeleteLessonTarget(null)} type="button" variant="ghost">
                {language === "mn" ? "Цуцлах" : "Cancel"}
              </Button>
              <Button onClick={() => deleteLesson()} type="button" variant="danger">
                <Trash2 size={16} />
                {language === "mn" ? "Устгах" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTopicTarget ? (
        <div className="modal-layer">
          <div className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="topic-delete-title">
            <div className="delete-icon">
              <Trash2 size={20} />
            </div>
            <div>
              <strong id="topic-delete-title">{language === "mn" ? "Сэдэв устгах" : "Delete topic"}</strong>
              <p>
                {(() => {
                  const lessonCount = currentContent.lessons.filter((lesson) => lesson.topicId === deleteTopicTarget.id).length;
                  if (language === "mn") {
                    return lessonCount > 0
                      ? `"${deleteTopicTarget.label}" сэдвийг устгахад дотор нь байгаа ${lessonCount} хичээл/видео хамт устгагдана. Үргэлжлүүлэх үү?`
                      : `"${deleteTopicTarget.label}"-ыг устгахдаа итгэлтэй байна уу?`;
                  }
                  return lessonCount > 0
                    ? `Deleting "${deleteTopicTarget.label}" will also delete ${lessonCount} lesson(s)/video(s) inside it. Continue?`
                    : `Are you sure you want to delete "${deleteTopicTarget.label}"?`;
                })()}
              </p>
            </div>
            <div className="delete-actions">
              <Button onClick={() => setDeleteTopicTarget(null)} type="button" variant="ghost">
                {language === "mn" ? "Цуцлах" : "Cancel"}
              </Button>
              <Button onClick={() => deleteTopic()} type="button" variant="danger">
                <Trash2 size={16} />
                {language === "mn" ? "Устгах" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}
