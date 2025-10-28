// src/pages/Student/Profile.js (Student Profile)
import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faShield,
  faEdit,
  faSave,
  faTimes,
  faKey,
  faCircleExclamation,
  faIdBadge,
} from "@fortawesome/free-solid-svg-icons";
import AppService from "../../../appService";
import authService from "../../../services/authService";
import studentService from "../../../services/studentService";

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("accessToken");
        if (!token) {
          setError("We couldn't verify your session. Please sign in again.");
          return;
        }

        authService.decodeToken(token);
        const { data } = await AppService.get("/students/profile/me");
        const payload = data?.data ?? data ?? null;
        setProfile(payload);
        if (payload) {
          setFormData({
            name: payload.name ?? "",
            email: payload.email ?? "",
          });
        }
      } catch (err) {
        console.error("Error fetching student profile:", err);
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const summaryCards = useMemo(() => (
    [
      {
        label: "Full name",
        value: profile?.name || "—",
        helper: "Used in certificates and reports",
        icon: faUser,
        accent: "bg-sky-100 text-sky-600",
      },
      {
        label: "Email",
        value: profile?.email || "—",
        helper: "Log-in and notification address",
        icon: faEnvelope,
        accent: "bg-emerald-100 text-emerald-600",
      },
      {
        label: "Section",
        value: profile?.section || "To be assigned",
        helper: profile?.gradeLevel ? `Grade ${profile.gradeLevel}` : "Awaiting homeroom placement",
        icon: faIdBadge,
        accent: "bg-amber-100 text-amber-600",
      },
      {
        label: "Role",
        value: "Student",
        helper: "Student access level",
        icon: faShield,
        accent: "bg-purple-100 text-purple-600",
      },
    ]
  ), [profile]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (error) setError("");
    if (success) setSuccess("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!profile?._id) return;
    try {
      setError("");
      setSuccess("");
      const response = await studentService.updateOwnProfile({
        name: formData.name,
        email: formData.email,
      });
      const updatedPayload = response?.data || response || null;
      setSuccess("Profile updated successfully!");
      setIsEditing(false);
      if (updatedPayload) {
        setProfile((prev) => ({ ...prev, ...updatedPayload }));
        setFormData({
          name: updatedPayload.name ?? "",
          email: updatedPayload.email ?? "",
        });
      }
    } catch (err) {
      console.error("Error updating student profile:", err);
      setError(err.response?.data?.message || err.message || "Failed to update profile");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 px-4 pb-16 pt-10 sm:px-8">
        <div className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm">
          <p className="text-center text-sm text-gray-500">Loading your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 pb-16 pt-10 sm:px-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-sky-600 to-sky-900 text-white shadow-2xl">
        <div
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: "radial-gradient(circle at top left, rgba(255,255,255,0.6), transparent 55%)" }}
          aria-hidden="true"
        />
        <div className="relative z-10 space-y-6 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
                <FontAwesomeIcon icon={faUser} /> Student profile
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  {profile?.name ? `${profile.name}, this is your hub` : "Manage your student credentials"}
                </h1>
                <p className="text-sm text-white/85">
                  Review personal details, confirm your section placement, and keep your contact information current.
                </p>
              </div>
            </div>
          </div>

          {(error || success) && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                error ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-emerald-50 text-emerald-600"
              }`}
            >
              {error || success}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
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
            <h2 className="text-xl font-semibold text-gray-900">Contact information</h2>
            <p className="text-sm text-gray-500">Make sure your name and email are accurate for adviser communication.</p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              <FontAwesomeIcon icon={faEdit} /> Edit details
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
                  if (profile) {
                    setFormData({
                      name: profile.name ?? "",
                      email: profile.email ?? "",
                    });
                  }
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
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
              />
            ) : (
              <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800">
                {profile?.name || "—"}
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
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
              />
            ) : (
              <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800">
                {profile?.email || "—"}
              </p>
            )}
          </label>

          {profile?.lrn && (
            <div className="space-y-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Learner reference number</span>
              <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800">
                {profile.lrn}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Security</h2>
            <p className="text-sm text-gray-500">Ask your adviser or the ICT officer if you need a password reset.</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-700">
          <FontAwesomeIcon icon={faCircleExclamation} className="mr-2" /> Password changes are currently handled by the school administrators.
        </div>
      </section>
    </div>
  );
};

export default StudentProfile;