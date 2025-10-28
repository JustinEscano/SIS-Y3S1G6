// src/pages/Teacher/sections/Profile.js (Teacher Profile)
import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faShield,
  faEdit,
  faSave,
  faTimes,
  faKey,
  faChalkboardTeacher,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import teacherService from "../../../services/teacherService";

const INITIAL_PROFILE = {
  id: "",
  name: "",
  email: "",
  department: "",
  createdAt: "",
  updatedAt: "",
};

const TeacherProfile = () => {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", department: "" });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const response = await teacherService.getProfile();
        if (response?.profile) {
          setProfile(response.profile);
          setFormData({
            name: response.profile.name || "",
            email: response.profile.email || "",
            department: response.profile.department || "",
          });
        }
      } catch (err) {
        console.error("Error loading teacher profile", err);
        setErrorMessage(err?.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await teacherService.updateProfile(formData);
      if (response?.profile) {
        setProfile(response.profile);
        setFormData({
          name: response.profile.name || "",
          email: response.profile.email || "",
          department: response.profile.department || "",
        });
      }

      setSuccessMessage("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile", err);
      setErrorMessage(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      setErrorMessage("");
      setSuccessMessage("");

      if (!passwordData.currentPassword || !passwordData.newPassword) {
        setErrorMessage("Current password and new password are required");
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setErrorMessage("New passwords do not match");
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setErrorMessage("New password must be at least 6 characters long");
        return;
      }

      setChangingPassword(true);
      await teacherService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setSuccessMessage("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setChangingPassword(false);
    } catch (err) {
      console.error("Error changing password", err);
      setErrorMessage(err?.response?.data?.message || "Failed to change password");
      setChangingPassword(false);
    }
  };

  const resetEditingState = () => {
    setIsEditing(false);
    setFormData({
      name: profile.name || "",
      email: profile.email || "",
      department: profile.department || "",
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        Loading profile…
      </div>
    );
  }

  const formattedCreatedAt = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—";
  const formattedUpdatedAt = profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : "—";

  return (
    <div className="space-y-8 px-4 pb-16 pt-10 sm:px-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#81020b] via-[#b6232e] to-[#4b0206] text-white shadow-2xl">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at top left, rgba(255,255,255,0.6), transparent 55%)" }}
          aria-hidden="true"
        />
        <div className="relative z-10 space-y-6 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
                Teacher profile
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">{profile.name || "Manage your account"}</h1>
                <p className="text-sm text-white/85">
                  Keep your contact information up to date and ensure your password remains secure. The details below feed into classroom insights and communications.
                </p>
              </div>
            </div>
            <div className="grid gap-3 rounded-2xl border border-white/30 bg-white/15 p-4 text-xs text-white/90 shadow-lg backdrop-blur-sm sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl bg-white/15 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white">
                  <FontAwesomeIcon icon={faUser} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Account created</p>
                  <p className="text-sm font-semibold text-white">{formattedCreatedAt}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/15 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white">
                  <FontAwesomeIcon icon={faClock} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Last updated</p>
                  <p className="text-sm font-semibold text-white">{formattedUpdatedAt}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {(errorMessage || successMessage) && (
        <div
          className={`rounded-2xl border px-5 py-4 shadow-sm ${
            errorMessage
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <section className="space-y-6 rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Profile information</h2>
            <p className="text-sm text-gray-500">Update your name, contact details, and department.</p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-[#81020b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6a0209] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FontAwesomeIcon icon={faSave} />
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  onClick={resetEditingState}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  <FontAwesomeIcon icon={faTimes} />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <FontAwesomeIcon icon={faEdit} />
                Edit profile
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              <FontAwesomeIcon icon={faUser} className="mr-2 text-gray-400" />
              Full name
            </label>
            {isEditing ? (
              <input
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
              />
            ) : (
              <p className="text-base font-medium text-gray-900">{profile.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-gray-400" />
              Email
            </label>
            {isEditing ? (
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
              />
            ) : (
              <p className="text-base font-medium text-gray-900">{profile.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              <FontAwesomeIcon icon={faShield} className="mr-2 text-gray-400" />
              Role
            </label>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <FontAwesomeIcon icon={faChalkboardTeacher} />
              Teacher
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Department
            </label>
            {isEditing ? (
              <input
                name="department"
                value={formData.department}
                onChange={handleFormChange}
                placeholder="Optional"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
              />
            ) : (
              <p className="text-base font-medium text-gray-900">{profile.department || "Not specified"}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 text-sm text-gray-500 md:grid-cols-2">
          <p>
            <span className="font-semibold text-gray-700">Account created:</span> {formattedCreatedAt}
          </p>
          <p>
            <span className="font-semibold text-gray-700">Last updated:</span> {formattedUpdatedAt}
          </p>
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            <p className="text-sm text-gray-500">Change your password to keep your account secure.</p>
          </div>
          <button
            onClick={() => setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })}
            className="text-xs font-semibold uppercase tracking-wide text-[#81020b]"
          >
            Reset fields
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Current password
            </label>
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              New password
            </label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Confirm new password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#81020b] focus:ring-2 focus:ring-[#81020b]/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={handleUpdatePassword}
            disabled={changingPassword}
            className="inline-flex items-center gap-2 rounded-full bg-[#81020b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6a0209] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FontAwesomeIcon icon={faKey} />
            {changingPassword ? "Updating…" : "Update password"}
          </button>
          <p className="text-xs text-gray-500">
            Passwords must be at least 6 characters long. Avoid reusing old passwords for better security.
          </p>
        </div>
      </section>
    </div>
  );
}
;

export default TeacherProfile;