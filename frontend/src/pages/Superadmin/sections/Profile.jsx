import React, { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faShield,
  faEdit,
  faSave,
  faTimes,
  faKey,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import AppService from "../../../appService";
import authService from "../../../services/authService";

function SuperadminProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const decoded = authService.decodeToken(token);

      const { data } = await AppService.get(`/admin/users/${decoded.id}`);
      setUser(data);
      setFormData({
        name: data.name,
        email: data.email,
      });
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    try {
      setError("");
      setSuccess("");
      const token = localStorage.getItem("accessToken");
      const decoded = authService.decodeToken(token);

      await AppService.put(`/admin/users/${decoded.id}`, formData);
      setSuccess("Profile updated successfully!");
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.response?.data?.message || "Failed to update profile");
    }
  };

  const handleChangePassword = async () => {
    try {
      setError("");
      setSuccess("");

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError("New passwords do not match");
        return;
      }

      if (passwordData.newPassword.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }

      const token = localStorage.getItem("accessToken");
      const decoded = authService.decodeToken(token);

      await AppService.put(`/admin/users/${decoded.id}/password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setSuccess("Password changed successfully!");
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error("Error changing password:", err);
      setError(err.response?.data?.message || "Failed to change password");
    }
  };

  const profileSummaryCards = useMemo(() => (
    [
      {
        label: "Full name",
        value: user?.name || "—",
        helper: "Used across reports and notifications",
        icon: faUser,
        accent: "bg-blue-100 text-blue-600",
      },
      {
        label: "Email",
        value: user?.email || "—",
        helper: "Primary contact address",
        icon: faEnvelope,
        accent: "bg-sky-100 text-sky-600",
      },
      {
        label: "Role",
        value: user?.role || "—",
        helper: "Access level in the SIS",
        icon: faUserShield,
        accent: "bg-purple-100 text-purple-600",
      },
      {
        label: "Status",
        value: "Active",
        helper: "Profile is in good standing",
        icon: faShield,
        accent: "bg-emerald-100 text-emerald-600",
      },
    ]
  ), [user]);

  if (loading) {
    return (
      <div className="space-y-6 px-4 pb-16 pt-10 sm:px-8">
        <div className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm">
          <p className="text-center text-sm text-gray-500">Loading profile…</p>
        </div>
      </div>
    );
  }

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
                Superadmin profile
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">Manage your credentials with confidence</h1>
                <p className="text-sm text-white/85">
                  Update contact information, review your access level, and keep your password secure from this central profile hub.
                </p>
              </div>
              {(error || success) && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${
                    error
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-emerald-200 bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {error || success}
                </div>
              )}
            </div>
            <div className="flex flex-col items-start gap-3 text-sm md:items-end">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white">
                <FontAwesomeIcon icon={faShield} />
                Secure account tools
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {profileSummaryCards.map((card) => (
          <div key={card.label} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm">
            <span className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold ${card.accent}`}>
              <FontAwesomeIcon icon={card.icon} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.helper}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Profile information</h2>
            <p className="text-sm text-gray-500">Keep your name and email current for accurate audit trails.</p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#81020b] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#6a0109]"
            >
              <FontAwesomeIcon icon={faEdit} /> Edit profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <FontAwesomeIcon icon={faSave} /> Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: user?.name || "",
                    email: user?.email || "",
                  });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-gray-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-gray-600"
              >
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              <FontAwesomeIcon icon={faUser} className="mr-2 text-gray-400" /> Full name
            </span>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
              />
            ) : (
              <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800">
                {user?.name}
              </p>
            )}
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-gray-400" /> Email address
            </span>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
              />
            ) : (
              <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800">
                {user?.email}
              </p>
            )}
          </label>

        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Security</h2>
            <p className="text-sm text-gray-500">Update your password regularly to protect sensitive data.</p>
          </div>
          {!isChangingPassword && (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#81020b] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#6a0109]"
            >
              <FontAwesomeIcon icon={faKey} /> Change password
            </button>
          )}
        </div>

        {isChangingPassword ? (
          <div className="mt-6 space-y-4">
            <label className="space-y-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current password</span>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">New password</span>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Confirm new password</span>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
              />
            </label>
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleChangePassword}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <FontAwesomeIcon icon={faSave} /> Update password
              </button>
              <button
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-gray-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-gray-600"
              >
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-gray-600">Click “Change password” to generate a new secure password for your account.</p>
        )}
      </section>
    </div>
  );
}

export default SuperadminProfile;
