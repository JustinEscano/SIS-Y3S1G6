import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faUserGraduate,
  faChalkboardTeacher,
  faBook,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import AppService from "../../../appService";

const STAT_CARDS = [
  {
    key: "totalUsers",
    label: "Total users",
    helper: "Across all roles",
    icon: faUsers,
    accent: "bg-blue-100 text-blue-600",
  },
  {
    key: "totalStudents",
    label: "Students",
    helper: "Enrolled records",
    icon: faUserGraduate,
    accent: "bg-sky-100 text-sky-600",
  },
  {
    key: "totalTeachers",
    label: "Teachers",
    helper: "Active instructors",
    icon: faChalkboardTeacher,
    accent: "bg-emerald-100 text-emerald-600",
  },
  {
    key: "totalSubjects",
    label: "Subjects",
    helper: "Managed in the system",
    icon: faBook,
    accent: "bg-amber-100 text-amber-600",
  },
];

function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalSuperadmins: 0,
    totalSubjects: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await AppService.get("/admin/stats");
        setStats(data);
      } catch (err) {
        console.error("Error fetching stats:", err);
        setError(err.response?.data?.message || err.message || "Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const DashboardStatCard = ({ card }) => (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold ${card.accent}`}>
        <FontAwesomeIcon icon={card.icon} />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
        <p className="text-2xl font-semibold text-gray-900">{loading ? "…" : stats[card.key]}</p>
        <p className="text-xs text-gray-500">{card.helper}</p>
      </div>
    </div>
  );

  const quickActions = [
    {
      title: "Manage users",
      description: "Add, edit, or remove platform accounts",
      href: "/superadmin/users",
      accent: "bg-blue-50 hover:bg-blue-100",
      icon: faUsers,
      iconColor: "text-blue-600",
    },
    {
      title: "Review subjects",
      description: "Monitor and curate subject offerings",
      href: "/superadmin/subjects",
      accent: "bg-green-50 hover:bg-green-100",
      icon: faBook,
      iconColor: "text-green-600",
    },
    {
      title: "System settings",
      description: "Configure authentication and platform defaults",
      href: "/superadmin/settings",
      accent: "bg-purple-50 hover:bg-purple-100",
      icon: faUserShield,
      iconColor: "text-purple-600",
    },
  ];

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
                Superadmin workspace
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">Oversee your entire SIS</h1>
                <p className="text-sm text-white/85">
                  Monitor account growth, staffing levels, and subject coverage at a glance. Quick actions help you respond faster to platform needs.
                </p>
              </div>
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <DashboardStatCard key={card.label} card={card} />
        ))}
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
        <h2 className="text-xl font-semibold text-gray-900">Quick actions</h2>
        <p className="text-sm text-gray-500">Frequent administrative tasks at your fingertips.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => (window.location.href = action.href)}
              className={`${action.accent} rounded-2xl p-5 text-left transition`}
            >
              <FontAwesomeIcon icon={action.icon} className={`${action.iconColor} text-xl`} />
              <h3 className="mt-3 text-base font-semibold text-gray-900">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
