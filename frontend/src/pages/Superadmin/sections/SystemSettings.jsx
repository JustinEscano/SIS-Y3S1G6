import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog, faEnvelope, faHistory } from "@fortawesome/free-solid-svg-icons";
import AppService from "../../../appService";
import Pagination from "../../../components/Pagination";

function SystemSettings() {
  const [invites, setInvites] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newInvite, setNewInvite] = useState({
    email: "",
    role: "student"
  });
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fetchInvites = useCallback(async (pageToLoad) => {
    setIsFetching(true);
    setError(null);

    try {
      const response = await AppService.get("/admin/invites", {
        params: { page: pageToLoad }
      });

      const { invites: inviteList = [], totalPages: total = 1, currentPage: activePage } = response.data || {};

      setInvites(inviteList);
      setTotalPages(total || 1);
      if (activePage) {
        setCurrentPage(Number(activePage));
      }
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to load invites";
      setError(message);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites(currentPage);
  }, [currentPage, fetchInvites]);

  const handleSendInvite = async () => {
    try {
      setIsSending(true);
      setError(null);

      const payload = {
        email: newInvite.email.trim(),
        role: newInvite.role
      };

      await AppService.post("/admin/invites", payload);

      await fetchInvites(currentPage);

      setNewInvite({ email: "", role: "student" });

      alert(`Invite sent successfully to ${payload.email}`);
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to send invite";
      setError(message);
      alert(`Error sending invite: ${message}`);
    } finally {
      setIsSending(false);
    }
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

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Send New Invite</h2>
            <p className="text-sm text-gray-500">Generate and email one-time invite codes</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</span>
            <input
              type="email"
              value={newInvite.email}
              onChange={(e) => setNewInvite({...newInvite, email: e.target.value})}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
              placeholder="recipient@example.com"
            />
          </label>
          
          <label className="space-y-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Role</span>
            <select
              value={newInvite.role}
              onChange={(e) => setNewInvite({...newInvite, role: e.target.value})}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </label>
          
          <div className="flex items-end">
            <button
              onClick={handleSendInvite}
              disabled={isSending || !newInvite.email}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#81020b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6a0109] disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faEnvelope} />
              {isSending ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Invite History</h2>
            <p className="text-sm text-gray-500">Track all sent invite codes and their status</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-600">
            <FontAwesomeIcon icon={faHistory} /> {invites.length} records
          </span>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isFetching ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500">
                    Loading invites...
                  </td>
                </tr>
              ) : invites.length ? (
                invites.map((invite) => (
                  <tr key={invite._id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{invite.code}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{invite.email}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 capitalize">{invite.role || 'Student'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${invite.used ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {invite.used ? 'Used' : 'Active'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {invite.createdBy?.name || 'System'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500">
                    No invites found yet. Send a new invite to populate history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
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
