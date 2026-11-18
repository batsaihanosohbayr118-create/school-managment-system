"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppCopy, Language } from "@/lib/i18n";
import type { Role } from "@/lib/types";

export function SettingsModule({
  copy,
  currentUserAvatar,
  currentUserEmail,
  currentUserName,
  language,
  logout,
  onSaveProfile,
  role,
  setLanguage
}: {
  copy: AppCopy;
  currentUserAvatar: string;
  currentUserEmail: string;
  currentUserName: string;
  language: Language;
  logout: () => void;
  onSaveProfile: (values: { name: string; email: string; avatarUrl: string }) => Promise<boolean>;
  role: Role;
  setLanguage: (value: Language) => void;
}) {
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(currentUserName);
  const [profileEmail, setProfileEmail] = useState(currentUserEmail);
  const [profileAvatar, setProfileAvatar] = useState(currentUserAvatar);
  const [savingProfile, setSavingProfile] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const initials = (currentUserName || currentUserEmail || "?").trim().charAt(0).toUpperCase();

  function openProfile() {
    setProfileName(currentUserName);
    setProfileEmail(currentUserEmail);
    setProfileAvatar(currentUserAvatar);
    setProfileOpen(true);
  }

  function onAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setProfileAvatar(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    const success = await onSaveProfile({ name: profileName.trim(), email: profileEmail.trim(), avatarUrl: profileAvatar });
    setSavingProfile(false);
    if (success) setProfileOpen(false);
  }

  return (
    <section className="settings-grid">
      {profileOpen ? (
        <div className="mobile-account-page">
          <button className="mobile-account-back" onClick={() => setProfileOpen(false)} type="button">
            {language === "mn" ? "Буцах" : "Back"}
          </button>
          <div className="mobile-account-card">
            <div className="mobile-account-header">
              <span>{language === "mn" ? "Профайл" : "Profile"}</span>
            </div>

            <div className="mobile-profile-avatar-row">
              <div className="mobile-profile-avatar">
                {profileAvatar ? <img alt="" src={profileAvatar} /> : <span>{initials}</span>}
                <button
                  aria-label={language === "mn" ? "Зураг солих" : "Change photo"}
                  className="mobile-profile-avatar-edit"
                  onClick={() => avatarInputRef.current?.click()}
                  type="button"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <input accept="image/*" hidden onChange={onAvatarSelected} ref={avatarInputRef} type="file" />
            </div>

            <label className="mobile-profile-field">
              <span>{language === "mn" ? "Нэр" : "Name"}</span>
              <input
                className="ec-input"
                onChange={(event) => setProfileName(event.target.value)}
                placeholder={language === "mn" ? "Нэрээ оруулна уу" : "Enter your name"}
                value={profileName}
              />
            </label>

            <label className="mobile-profile-field">
              <span>{language === "mn" ? "Имэйл" : "Email"}</span>
              <input
                className="ec-input"
                onChange={(event) => setProfileEmail(event.target.value)}
                placeholder="you@example.com"
                // Access is keyed by email; only an admin can change it (the server enforces this too).
                readOnly={role !== "admin"}
                title={role !== "admin" ? (language === "mn" ? "Имэйлийг зөвхөн админ өөрчилнө" : "Only an administrator can change your email") : undefined}
                type="email"
                value={profileEmail}
              />
            </label>

            <button className="mobile-profile-save" disabled={savingProfile} onClick={handleSaveProfile} type="button">
              {savingProfile ? (language === "mn" ? "Хадгалж байна..." : "Saving...") : language === "mn" ? "Хадгалах" : "Save"}
            </button>
          </div>
        </div>
      ) : accountOpen ? (
        <div className="mobile-account-page">
          <button className="mobile-account-back" onClick={() => setAccountOpen(false)} type="button">
            {language === "mn" ? "Буцах" : "Back"}
          </button>
          <div className="mobile-account-card">
            <div className="mobile-account-header">
              <span>{copy.common.account}</span>
              <Badge tone="blue">{copy.roles[role]}</Badge>
            </div>
            <div className="mobile-role-list">
              <span className="mobile-role-current">
                <span>{copy.roles[role]}</span>
                <Check size={16} />
              </span>
            </div>
            <button className="mobile-account-logout" onClick={logout} type="button">
              {copy.common.logout}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mobile-settings-list">
            <button className="mobile-setting-row mobile-setting-row-profile" onClick={openProfile} type="button">
              <span className="mobile-profile-row-info">
                <span className="mobile-profile-row-avatar">
                  {currentUserAvatar ? <img alt="" src={currentUserAvatar} /> : <span>{initials}</span>}
                </span>
                <span className="mobile-profile-row-text">
                  <strong>{currentUserName || (language === "mn" ? "Профайл" : "Profile")}</strong>
                  {currentUserEmail ? <small>{currentUserEmail}</small> : null}
                </span>
              </span>
              <ChevronRight size={18} />
            </button>

            <button className="mobile-setting-row" onClick={() => setLanguage(language === "mn" ? "en" : "mn")} type="button">
              <span>{language === "mn" ? "Монгол хэл" : "English"}</span>
              <span className={`mobile-switch${language === "mn" ? " active" : ""}`} aria-hidden="true">
                <span />
              </span>
            </button>

            <button className="mobile-setting-row" onClick={() => setAccountOpen(true)} type="button">
              <span>{copy.common.account}</span>
              <Badge tone="blue">{copy.roles[role]}</Badge>
            </button>

            <button className="mobile-setting-row" onClick={() => setPermissionsOpen((value) => !value)} type="button">
              <span>{copy.common.rolePermissions}</span>
              <Badge tone="blue">{copy.roles[role]}</Badge>
              <ChevronDown className={permissionsOpen ? "open" : ""} size={18} />
            </button>
          </div>

          <div className="mobile-permission-panel">
            {permissionsOpen ? (
              <div className="mobile-permission-list">
                {copy.rolePermissions[role].map((permission) => (
                  <span key={permission}>
                    <Check size={16} />
                    {permission}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}

      <Card className="desktop-permission-card">
        <CardHeader>
          <CardTitle>{copy.common.rolePermissions}</CardTitle>
          <Badge tone="blue">{copy.roles[role]}</Badge>
        </CardHeader>
        <CardContent>
          <div className="permission-grid">
            {copy.rolePermissions[role].map((permission) => (
              <span key={permission}>
                <Check size={16} />
                {permission}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
