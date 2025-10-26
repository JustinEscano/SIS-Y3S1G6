import React, { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog, faKey, faSave, faUserGraduate, faChalkboardTeacher, faUserShield } from "@fortawesome/free-solid-svg-icons";

function SystemSettings() {
  const [settings, setSettings] = useState({
    studentInviteCode: "STUDENT123",
    teacherInviteCode: "TEACHER123",
    superadminInviteCode: "SUPERADMIN123",
  });

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const summaryCards = useMemo(() => (
    [
      {
        label: "Student invite code",
        value: settings.studentInviteCode,
        helper: "Share with learners joining the SIS",
        icon: faUserGraduate,
        accent: "bg-blue-100 text-blue-600",
      },
      {
        label: "Teacher invite code",
        value: settings.teacherInviteCode,
        helper: "Provide to incoming instructors",
        icon: faChalkboardTeacher,
        accent: "bg-emerald-100 text-emerald-600",
      },
      {
        label: "Superadmin invite code",
        value: settings.superadminInviteCode,
        helper: "Limit to trusted platform owners",
        icon: faUserShield,
        accent: "bg-purple-100 text-purple-600",
      },
      {
        label: "Security status",
        value: "Manual entry",
        helper: "Auto-sync coming soon",
        icon: faKey,
        accent: "bg-amber-100 text-amber-600",
      },
    ]
  ), [settings]);

  const handleSave = () => {
    // TODO: Implement save functionality
    alert("Settings saved! (Backend integration needed)");
  };

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
                System configuration
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">Control how teams join and manage the SIS</h1>
                <p className="text-sm text-white/85">
                  Regenerate invite codes, coordinate onboarding, and preview future automation tools from this central settings page.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 text-sm md:items-end">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white">
                <FontAwesomeIcon icon={faCog} /> Administration toolkit
              </span>
            </div>
          </div>
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Invite code management</h2>
            <p className="text-sm text-gray-500">Rotate codes periodically to maintain secure onboarding.</p>
          </div>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-full bg-[#81020b] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#6a0109]"
          >
            <FontAwesomeIcon icon={faSave} /> Save changes
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Student invite code</span>
            <input
              type="text"
              name="studentInviteCode"
              value={settings.studentInviteCode}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Teacher invite code</span>
            <input
              type="text"
              name="teacherInviteCode"
              value={settings.teacherInviteCode}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Superadmin invite code</span>
            <input
              type="text"
              name="superadminInviteCode"
              value={settings.superadminInviteCode}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-gray-300 bg-white/80 p-6 text-sm text-gray-500 shadow-inner">
        <h3 className="text-base font-semibold text-gray-800">General settings</h3>
        <p className="mt-2">Additional configuration modules (notifications, integrations, automations) will appear here soon.</p>
      </section>
    </div>
  );
}

export default SystemSettings;
