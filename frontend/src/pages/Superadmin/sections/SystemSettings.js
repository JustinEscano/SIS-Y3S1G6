import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog, faKey, faUserGraduate, faChalkboardTeacher, faUserShield, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import AppService from "../../../appService";

const ROLE_CONFIG = [
  {
    key: "student",
    label: "Student invite code",
    helper: "Valid student email required to receive a one-time code",
    icon: faUserGraduate,
    accent: "bg-blue-100 text-blue-600",
  },
  {
    key: "teacher",
    label: "Teacher invite code",
    helper: "Send secure onboarding access to instructors",
    icon: faChalkboardTeacher,
    accent: "bg-emerald-100 text-emerald-600",
  },
  {
    key: "superadmin",
    label: "Superadmin invite code",
    helper: "Restrict ownership access to trusted leaders",
    icon: faUserShield,
    accent: "bg-purple-100 text-purple-600",
  },
];

const initialRoleState = ROLE_CONFIG.reduce((acc, role) => {
  acc[role.key] = { email: "", loading: false, message: null, variant: "info" };
  return acc;
}, {});

function SystemSettings() {
  const [roleState, setRoleState] = useState(initialRoleState);
  const [history, setHistory] = useState({
    loading: true,
    invites: [],
    error: null,
    pagination: { page: 1, totalPages: 1, total: 0, limit: 10 },
  });
  const [historyFilters, setHistoryFilters] = useState({
    role: "all",
    status: "all",
    page: 1,
    limit: 10,
  });

  const updateRoleState = (role, patch) => {
    setRoleState((prev) => ({
      ...prev,
      [role]: { ...prev[role], ...patch },
    }));
  };

  const handleEmailChange = (role, value) => {
    updateRoleState(role, { email: value });
  };

  const handleGenerate = async (role) => {
    const { email } = roleState[role];
    if (!email) {
      updateRoleState(role, {
        message: "Enter an email before sending an invite code.",
        variant: "error",
      });
      return;
    }

    updateRoleState(role, { loading: true, message: null });

    try {
      await AppService.post("/admin/invite-codes", {
        email,
        role,
      });

      updateRoleState(role, {
        message: `Invite code sent to ${email}. It will expire automatically if unused.`,
        variant: "success",
        email: "",
      });
      await fetchHistory(historyFilters);
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to send invite code. Please try again.";
      updateRoleState(role, {
        message: errMsg,
        variant: "error",
      });
    } finally {
      updateRoleState(role, { loading: false });
    }
  };

  const fetchHistory = useCallback(async (filters) => {
    setHistory((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        limit: filters.limit,
        page: filters.page,
      };
      if (filters.role !== "all") params.role = filters.role;
      if (filters.status !== "all") params.status = filters.status;

      const { data } = await AppService.get("/admin/invite-codes", { params });
      const invites = Array.isArray(data?.invites) ? data.invites : [];
      setHistory({
        loading: false,
        invites,
        error: null,
        pagination: {
          page: data?.pagination?.page || filters.page,
          totalPages: data?.pagination?.totalPages || 1,
          total: data?.pagination?.total || invites.length,
          limit: data?.pagination?.limit || filters.limit,
        },
      });
    } catch (error) {
      const errMsg = error.response?.data?.message || "Unable to load invite history.";
      setHistory({
        loading: false,
        invites: [],
        error: errMsg,
        pagination: {
          page: filters.page,
          totalPages: 1,
          total: 0,
          limit: filters.limit,
        },
      });
    }
  }, []);

  useEffect(() => {
    fetchHistory(historyFilters);
  }, [fetchHistory, historyFilters]);

  const updateHistoryFilters = useCallback((patch) => {
    setHistoryFilters((prev) => {
      const next = { ...prev, ...patch };
      return next;
    });
  }, []);

  const summaryCards = useMemo(() => (
    [
      ...ROLE_CONFIG.map((role) => {
        const state = roleState[role.key];
        let value = "Awaiting request";
        if (state.message) {
          value = state.variant === "success" ? "Invite sent" : "Action required";
        }
        return {
          label: role.label,
          value,
          helper: role.helper,
          icon: role.icon,
          accent: role.accent,
        };
      }),
      {
        label: "Security status",
        value: "One-time codes",
        helper: "Codes are generated per email and expire automatically",
        icon: faKey,
        accent: "bg-amber-100 text-amber-600",
      },
    ]
  ), [roleState]);

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
                  Send one-time invite codes, coordinate onboarding, and preview future automation tools from this central settings page.
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
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">Invite code management</h2>
          <p className="text-sm text-gray-500">
            One-time invite codes are generated per email address. Each code is sent over email and expires automatically if unused.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {ROLE_CONFIG.map((role) => {
            const state = roleState[role.key];
            return (
              <div key={role.key} className="space-y-2 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{role.label}</span>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={state.email}
                    onChange={(e) => handleEmailChange(role.key, e.target.value)}
                    placeholder={`Enter ${role.key} email`}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleGenerate(role.key)}
                    disabled={state.loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#81020b] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#6a0109] disabled:bg-gray-400"
                  >
                    <FontAwesomeIcon icon={faPaperPlane} />
                    {state.loading ? "Sending" : "Send"}
                  </button>
                </div>
                <p className="text-xs text-gray-500">{role.helper}</p>
                {state.message && (
                  <div
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                      state.variant === "success"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-red-50 text-red-600 border border-red-100"
                    }`}
                  >
                    {state.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900">Invite code history</h2>
            <p className="text-sm text-gray-500">Recent invites generated by superadmins. Codes expire automatically and are marked when used.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span className="mr-2 text-gray-600">Role</span>
              <select
                value={historyFilters.role}
                onChange={(e) => updateHistoryFilters({ role: e.target.value, page: 1 })}
                className="rounded-full border border-gray-200 px-3 py-1.5 text-sm focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
              >
                <option value="all">All</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span className="mr-2 text-gray-600">Status</span>
              <select
                value={historyFilters.status}
                onChange={(e) => updateHistoryFilters({ status: e.target.value, page: 1 })}
                className="rounded-full border border-gray-200 px-3 py-1.5 text-sm focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="used">Used</option>
                <option value="expired">Expired</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span className="mr-2 text-gray-600">Page size</span>
              <select
                value={historyFilters.limit}
                onChange={(e) => updateHistoryFilters({ limit: Number(e.target.value), page: 1 })}
                className="rounded-full border border-gray-200 px-3 py-1.5 text-sm focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
              >
                {[5, 10, 15, 20].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => fetchHistory(historyFilters)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 transition hover:border-[#81020b] hover:text-[#81020b]"
            >
              Refresh
            </button>
          </div>
        </div>

        {history.loading ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-6 text-center text-sm text-gray-500">
            Loading invite history...
          </p>
        ) : history.error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 py-6 text-center text-sm font-semibold text-red-600">
            {history.error}
          </p>
        ) : history.invites.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-6 text-center text-sm text-gray-500">
            No invite codes generated yet.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Expires</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {history.invites.map((invite) => {
                    const status = invite.usedAt ? "Used" : new Date(invite.expiresAt) < new Date() ? "Expired" : "Active";
                    const statusStyles = invite.usedAt
                      ? "bg-emerald-50 text-emerald-700"
                      : new Date(invite.expiresAt) < new Date()
                        ? "bg-amber-50 text-amber-700"
                        : "bg-blue-50 text-blue-700";

                    return (
                      <tr key={invite.id}>
                        <td className="px-4 py-3 text-gray-800">{invite.email}</td>
                        <td className="px-4 py-3 capitalize text-gray-600">{invite.role}</td>
                        <td className="px-4 py-3 font-mono text-gray-800">{invite.code}</td>
                        <td className="px-4 py-3 text-gray-600">{new Date(invite.expiresAt).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles}`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
              <span>
                Showing page {history.pagination.page} of {history.pagination.totalPages} · {history.pagination.total} invites total
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => history.pagination.page > 1 && updateHistoryFilters({ page: history.pagination.page - 1 })}
                  disabled={history.pagination.page <= 1}
                  className="rounded-full border border-gray-200 px-3 py-1 uppercase tracking-wide transition hover:border-[#81020b] hover:text-[#81020b] disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => history.pagination.page < history.pagination.totalPages && updateHistoryFilters({ page: history.pagination.page + 1 })}
                  disabled={history.pagination.page >= history.pagination.totalPages}
                  className="rounded-full border border-gray-200 px-3 py-1 uppercase tracking-wide transition hover:border-[#81020b] hover:text-[#81020b] disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-dashed border-gray-300 bg-white/80 p-6 text-sm text-gray-500 shadow-inner">
        <h3 className="text-base font-semibold text-gray-800">General settings</h3>
        <p className="mt-2">Additional configuration modules (notifications, integrations, automations) will appear here soon.</p>
      </section>
    </div>
  );
}

export default SystemSettings;
