import React, { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faTrash,
  faSearch,
  faUserGraduate,
  faChalkboardTeacher,
  faUserShield,
  faUsers,
  faPlus,
  faPenToSquare,
} from "@fortawesome/free-solid-svg-icons";
import AppService from "../../../appService";
import Pagination from "../../../components/Pagination";

const initialCreateForm = {
  name: "",
  email: "",
  password: "",
  role: "teacher",
  department: "",
};

const ROLE_TILES = [
  {
    key: "total",
    label: "Total users",
    helper: "Across all roles",
    icon: faUsers,
    accent: "bg-blue-100 text-blue-600",
  },
  {
    key: "student",
    label: "Students",
    helper: "Learners in the system",
    icon: faUserGraduate,
    accent: "bg-sky-100 text-sky-600",
  },
  {
    key: "teacher",
    label: "Teachers",
    helper: "Active instructors",
    icon: faChalkboardTeacher,
    accent: "bg-emerald-100 text-emerald-600",
  },
  {
    key: "superadmin",
    label: "Superadmins",
    helper: "Platform administrators",
    icon: faUserShield,
    accent: "bg-purple-100 text-purple-600",
  },
];

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, student, teacher, superadmin
  const [searchTerm, setSearchTerm] = useState("");
  const [alert, setAlert] = useState(null); // { type: 'success' | 'error', message }
  const [viewModal, setViewModal] = useState({ open: false, user: null });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [editForm, setEditForm] = useState({ name: "", email: "", department: "", section: "", parentName: "", lrn: "", newPassword: "" });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const editingRole = (editModal.user?.role || "").toLowerCase();
  const isEditingStudent = editingRole === "student";

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setAlert(null);
      console.log("Fetching users...");
      
      // Fetch both students and teachers
      const [studentsRes, teachersRes] = await Promise.all([
        AppService.get("/students"),
        AppService.get("/admin/users"), // Endpoint to get teachers and superadmins
      ]);

      const studentPayload = Array.isArray(studentsRes.data?.students)
        ? studentsRes.data.students
        : Array.isArray(studentsRes.data?.data)
        ? studentsRes.data.data
        : Array.isArray(studentsRes.data)
        ? studentsRes.data
        : [];

      const adminPayload = Array.isArray(teachersRes.data?.users)
        ? teachersRes.data.users
        : Array.isArray(teachersRes.data?.data)
        ? teachersRes.data.data
        : Array.isArray(teachersRes.data)
        ? teachersRes.data
        : [];

      const students = studentPayload.map((s) => ({ ...s, role: "student" }));
      const teachers = adminPayload.filter((u) => u.role === "teacher");
      const superadmins = adminPayload.filter((u) => u.role === "superadmin");

      const allUsers = [...students, ...teachers, ...superadmins];
      console.log("Total users:", allUsers.length);
      
      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      console.error("Error details:", error.response?.data);
      setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to fetch users.' });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user) => {
    if (!user) {
      setAlert({ type: "error", message: "Unable to load user details for editing." });
      return;
    }

    setEditModal({ open: true, user });
    setEditError("");
    setEditSaving(false);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      department: user.department || "",
      section: user.section || "",
      parentName: user.parentName || "",
      lrn: user.lrn || "",
      newPassword: "",
    });
  };

  const closeEditModal = () => {
    setEditModal({ open: false, user: null });
    setEditForm({ name: "", email: "", department: "", section: "", parentName: "", lrn: "", newPassword: "" });
    setEditError("");
    setEditSaving(false);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    if (editError) setEditError("");
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editModal.user) return;

    const isStudent = (editModal.user.role || "").toLowerCase() === "student";
    const trimmedName = editForm.name.trim();
    const trimmedEmail = editForm.email.trim();

    if (!trimmedName || !trimmedEmail) {
      setEditError("Please provide both name and email.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setEditError("Enter a valid email address (e.g., name@example.com).");
      return;
    }

    const trimmedPassword = (editForm.newPassword || "").trim();
    if (trimmedPassword && trimmedPassword.length < 6) {
      setEditError("New password should be at least 6 characters long.");
      return;
    }

    const payload = {
      name: trimmedName,
      email: trimmedEmail.toLowerCase(),
    };

    if (trimmedPassword) {
      payload.newPassword = trimmedPassword;
    }

    try {
      setEditSaving(true);
      setEditError("");

      if (isStudent) {
        const normalizeNullable = (value) => {
          if (value === undefined || value === null) return null;
          const trimmedValue = String(value).trim();
          return trimmedValue ? trimmedValue : null;
        };

        payload.section = normalizeNullable(editForm.section);
        payload.parentName = normalizeNullable(editForm.parentName);
        payload.lrn = normalizeNullable(editForm.lrn);

        await AppService.put(`/students/${editModal.user._id}`, payload);
        const successMessage = trimmedPassword
          ? "Student password updated successfully."
          : "Student details updated successfully.";
        setAlert({ type: "success", message: successMessage });
      } else {
        const trimmedDepartment = (editForm.department ?? "").trim();
        payload.department = trimmedDepartment ? trimmedDepartment : null;

        await AppService.put(`/admin/users/${editModal.user._id}`, payload);
        const successMessage = trimmedPassword
          ? "Staff password updated successfully."
          : "User details updated successfully.";
        setAlert({ type: "success", message: successMessage });
      }

      closeEditModal();
      await fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update user.";
      setEditError(errorMessage);
      setAlert({ type: "error", message: errorMessage });
    } finally {
      setEditSaving(false);
    }
  };

  const closeModal = () => setViewModal({ open: false, user: null });

  const openViewModal = (user) => {
    setViewModal({ open: true, user });
  };

  const handleDelete = async (userId, role) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const endpoint = role === "student" ? `/students/${userId}` : `/admin/users/${userId}`;
      await AppService.delete(endpoint);
      fetchUsers();
      setAlert({ type: "success", message: "User deleted successfully." });
    } catch (error) {
      console.error("Error deleting user:", error);
      setAlert({ type: "error", message: error.response?.data?.message || "Failed to delete user." });
    }
  };

  const openCreateModal = () => {
    setCreateForm(initialCreateForm);
    setCreateError("");
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateError("");
    setCreateLoading(false);
  };

  const handleCreateChange = (event) => {
    const { name, value } = event.target;
    if (createError) setCreateError("");
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = createForm.name.trim();
    const trimmedEmail = createForm.email.trim();
    const trimmedPassword = createForm.password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setCreateError("Please complete name, email, and password before creating a user.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setCreateError("Enter a valid email address (e.g., name@example.com).");
      return;
    }

    if (trimmedPassword.length < 6) {
      setCreateError("Temporary password should be at least 6 characters long.");
      return;
    }

    if (!["teacher", "superadmin"].includes(createForm.role)) {
      setCreateError("Role must be either Teacher or Superadmin.");
      return;
    }

    try {
      setCreateLoading(true);
      setCreateError("");
      await AppService.post("/admin/users", {
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        role: createForm.role,
        department: createForm.department || undefined,
      });
      setAlert({ type: "success", message: "New user created successfully." });
      closeCreateModal();
      await fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      setCreateError(error.response?.data?.message || error.message || "Failed to create user.");
    } finally {
      setCreateLoading(false);
    }
  };

  const roleCounts = useMemo(() => {
    return users.reduce((acc, user) => {
      const normalizedRole = (user.role || "").toLowerCase();
      if (normalizedRole) {
        acc[normalizedRole] = (acc[normalizedRole] || 0) + 1;
      }
      acc.total = (acc.total || 0) + 1;
      return acc;
    }, { total: 0 });
  }, [users]);

  const filteredUsers = users.filter(user => {
    const normalizedRole = (user.role || "").toLowerCase();
    const matchesFilter = filter === "all" || normalizedRole === filter;
    const target = `${user.name ?? ''} ${user.email ?? ''}`.toLowerCase();
    const matchesSearch = target.includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm, users.length]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const getRoleIcon = (role) => {
    switch (role) {
      case "student": return faUserGraduate;
      case "teacher": return faChalkboardTeacher;
      case "superadmin": return faUserShield;
      default: return faUserGraduate;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "student": return "bg-blue-100 text-blue-700";
      case "teacher": return "bg-emerald-100 text-emerald-700";
      case "superadmin": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const tileCount = (key) => (key === "total" ? roleCounts.total || 0 : roleCounts[key] || 0);

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
                User administration
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">Manage every account with confidence</h1>
                <p className="text-sm text-white/85">
                  Review students, teachers, and superadmins in one place. Filter by role, audit account details, and remove access when necessary.
                </p>
              </div>
              {alert && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${
                    alert.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : alert.type === "error"
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-blue-200 bg-blue-50 text-blue-600"
                  }`}
                >
                  {alert.message}
                </div>
              )}
            </div>
            <div className="flex flex-col items-start gap-3 text-sm md:items-end">
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-white/25"
              >
                <FontAwesomeIcon icon={faPlus} /> Add new user
              </button>
              <p className="text-xs text-white/75">Create teacher or superadmin accounts instantly.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ROLE_TILES.map((tile) => (
          <div key={tile.label} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm">
            <span className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold ${tile.accent}`}>
              <FontAwesomeIcon icon={tile.icon} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tile.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{tileCount(tile.key)}</p>
              <p className="text-xs text-gray-500">{tile.helper}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white/95 shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-700 transition focus:border-[#81020b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#81020b]/30"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[{ key: "all", label: "All" }, { key: "student", label: "Students" }, { key: "teacher", label: "Teachers" }, { key: "superadmin", label: "Superadmins" }].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  filter === key
                    ? "border-[#81020b] bg-[#81020b] text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-[#81020b]/40 hover:text-[#81020b]"
                }`}
              >
                {label}
                <span className={`ml-2 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  filter === key
                    ? "border-white/60 bg-white/10 text-white"
                    : "border-[#81020b]/15 bg-[#81020b]/5 text-[#81020b]"
                }`}>
                  {key === "all" ? roleCounts.total || 0 : roleCounts[key] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-6">
          {loading ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-sm text-gray-500">
              Loading users...
            </p>
          ) : filteredUsers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-sm text-gray-500">
              No users found for the current filters.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedUsers.map((user) => (
                <div
                  key={user._id}
                  className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#81020b] via-[#b0121c] to-[#81020b] opacity-70" />
                  <div className="flex items-start gap-3 px-5 py-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition group-hover:bg-[#81020b]/10 group-hover:text-[#81020b]">
                      <FontAwesomeIcon icon={getRoleIcon(user.role)} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-gray-900">{user.name}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.section && (
                        <p className="text-xs font-medium text-blue-600">Section {user.section}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-3 text-sm text-gray-500">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Joined</p>
                      <p className="text-sm text-gray-700">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditModal(user)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-amber-500 shadow-inner transition hover:bg-amber-500 hover:text-white"
                        title="Edit user"
                      >
                        <FontAwesomeIcon icon={faPenToSquare} />
                      </button>
                      <button
                        onClick={() => openViewModal(user)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#81020b] shadow-inner transition hover:bg-[#81020b] hover:text-white"
                        title="View user details"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button
                        onClick={() => handleDelete(user._id, user.role)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-500 shadow-inner transition hover:bg-red-500 hover:text-white"
                        title="Delete user"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {filteredUsers.length > itemsPerPage && (
          <div className="flex justify-end border-t border-gray-100 px-6 py-4">
            <Pagination
              totalItems={filteredUsers.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </section>

      {viewModal.open && viewModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="relative border-b border-gray-200 bg-white px-6 py-5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#81020b] via-[#b0121c] to-[#81020b]" />
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#81020b]/10 px-3 py-1 text-xs font-semibold text-[#81020b]">
                    <FontAwesomeIcon icon={getRoleIcon(viewModal.user.role)} />
                    <span className="uppercase tracking-wide">{viewModal.user.role}</span>
                  </div>
                  <h2 className="text-2xl font-semibold leading-tight text-gray-900">{viewModal.user.name}</h2>
                  <p className="text-sm text-gray-500">{viewModal.user.email}</p>
                </div>
                <button
                  onClick={closeModal}
                  className="rounded-full border border-gray-200 bg-white px-2 py-1 text-lg text-gray-500 transition hover:border-[#81020b] hover:text-[#81020b]"
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
            </div>
            <div className="px-6 py-6">
              <dl className="divide-y divide-gray-200">
                <div className="grid grid-cols-3 gap-4 py-3">
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="col-span-2 text-sm text-gray-900 capitalize">{viewModal.user.role}</dd>
                </div>
                {viewModal.user.section && (
                  <div className="grid grid-cols-3 gap-4 py-3">
                    <dt className="text-sm font-medium text-gray-500">Section</dt>
                    <dd className="col-span-2 text-sm text-gray-900">{viewModal.user.section}</dd>
                  </div>
                )}
                {viewModal.user.parentName && (
                  <div className="grid grid-cols-3 gap-4 py-3">
                    <dt className="text-sm font-medium text-gray-500">Parent / Guardian</dt>
                    <dd className="col-span-2 text-sm text-gray-900">{viewModal.user.parentName}</dd>
                  </div>
                )}
                {viewModal.user.lrn && (
                  <div className="grid grid-cols-3 gap-4 py-3">
                    <dt className="text-sm font-medium text-gray-500">LRN</dt>
                    <dd className="col-span-2 text-sm text-gray-900">{viewModal.user.lrn}</dd>
                  </div>
                )}
                {viewModal.user.department && (
                  <div className="grid grid-cols-3 gap-4 py-3">
                    <dt className="text-sm font-medium text-gray-500">Department</dt>
                    <dd className="col-span-2 text-sm text-gray-900">{viewModal.user.department}</dd>
                  </div>
                )}
                {viewModal.user.createdAt && (
                  <div className="grid grid-cols-3 gap-4 py-3">
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="col-span-2 text-sm text-gray-900">
                      {new Date(viewModal.user.createdAt).toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeModal}
                  className="rounded-full bg-[#81020b] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#6a0109]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="relative border-b border-gray-200 bg-white px-6 py-5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#81020b] via-[#b0121c] to-[#81020b]" />
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#81020b]/10 px-3 py-1 text-xs font-semibold text-[#81020b]">
                    <FontAwesomeIcon icon={faPlus} />
                    <span className="uppercase tracking-wide">Add user</span>
                  </div>
                  <h2 className="text-2xl font-semibold leading-tight text-gray-900">Create a new account</h2>
                  <p className="text-sm text-gray-500">Set up a teacher or superadmin. Students are created through enrollment.</p>
                </div>
                <button
                  onClick={closeCreateModal}
                  className="rounded-full border border-gray-200 bg-white px-2 py-1 text-lg text-gray-500 transition hover:border-[#81020b] hover:text-[#81020b]"
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="px-6 py-6 space-y-4">
              {createError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">
                  {createError}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Full name</span>
                  <input
                    type="text"
                    name="name"
                    value={createForm.name}
                    onChange={handleCreateChange}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20 ${createError && !createForm.name.trim() ? "border-red-300 bg-red-50/40" : "border-gray-200"}`}
                    placeholder="e.g. Alex Cruz"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email address</span>
                  <input
                    type="email"
                    name="email"
                    value={createForm.email}
                    onChange={handleCreateChange}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20 ${createError && createForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim()) ? "border-red-300 bg-red-50/40" : "border-gray-200"}`}
                    placeholder="name@example.com"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Temporary password</span>
                  <input
                    type="password"
                    name="password"
                    value={createForm.password}
                    onChange={handleCreateChange}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20 ${createError && createForm.password.trim().length < 6 ? "border-red-300 bg-red-50/40" : "border-gray-200"}`}
                    placeholder="Min. 6 characters"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Role</span>
                  <select
                    name="role"
                    value={createForm.role}
                    onChange={handleCreateChange}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20 ${createError && !["teacher", "superadmin"].includes(createForm.role) ? "border-red-300 bg-red-50/40" : "border-gray-200"}`}
                  >
                    <option value="teacher">Teacher</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </label>
                <label className="md:col-span-2 space-y-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Department (optional)</span>
                  <input
                    type="text"
                    name="department"
                    value={createForm.department}
                    onChange={handleCreateChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
                    placeholder="e.g. Mathematics"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-[#81020b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6a0109] disabled:cursor-not-allowed disabled:bg-[#b23a43]"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  {createLoading ? "Creating..." : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="relative border-b border-gray-200 bg-white px-6 py-5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#81020b] via-[#b0121c] to-[#81020b]" />
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#81020b]/10 px-3 py-1 text-xs font-semibold text-[#81020b]">
                    <FontAwesomeIcon icon={faPenToSquare} />
                    <span className="uppercase tracking-wide">Edit user</span>
                  </div>
                  <h2 className="text-2xl font-semibold leading-tight text-gray-900">
                    {isEditingStudent ? "Update student account" : "Update staff account"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {isEditingStudent
                      ? "Update student profile fields or reset their password from a single view."
                      : "Adjust staff information and rotate credentials without re-inviting."}
                  </p>
                </div>
                <button
                  onClick={closeEditModal}
                  className="rounded-full border border-gray-200 bg-white px-2 py-1 text-lg text-gray-500 transition hover:border-[#81020b] hover:text-[#81020b]"
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="px-6 py-6 space-y-4">
              {editError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">
                  {editError}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Full name</span>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20 ${editError && !editForm.name.trim() ? "border-red-300 bg-red-50/40" : "border-gray-200"}`}
                    placeholder="e.g. Alex Cruz"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email address</span>
                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20 ${editError && editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim()) ? "border-red-300 bg-red-50/40" : "border-gray-200"}`}
                    placeholder="name@example.com"
                  />
                </label>
                {isEditingStudent ? (
                  <>
                    <label className="space-y-1 text-sm">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Section</span>
                      <input
                        type="text"
                        name="section"
                        value={editForm.section}
                        onChange={handleEditChange}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
                        placeholder="e.g. 10 - Rizal"
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Parent / Guardian</span>
                      <input
                        type="text"
                        name="parentName"
                        value={editForm.parentName}
                        onChange={handleEditChange}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
                        placeholder="e.g. Maria Santos"
                      />
                    </label>
                    <label className="md:col-span-2 space-y-1 text-sm">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">LRN</span>
                      <input
                        type="text"
                        name="lrn"
                        value={editForm.lrn}
                        onChange={handleEditChange}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
                        placeholder="Enter LRN or leave blank"
                      />
                    </label>
                  </>
                ) : (
                  <label className="md:col-span-2 space-y-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Department (optional)</span>
                    <input
                      type="text"
                      name="department"
                      value={editForm.department}
                      onChange={handleEditChange}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
                      placeholder="e.g. Mathematics"
                    />
                  </label>
                )}
                <label className="md:col-span-2 space-y-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">New password (optional)</span>
                  <input
                    type="password"
                    name="newPassword"
                    value={editForm.newPassword}
                    onChange={handleEditChange}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-[#81020b] focus:outline-none focus:ring-2 focus:ring-[#81020b]/20"
                    placeholder="Leave blank to keep current password"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center gap-2 rounded-full bg-[#81020b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6a0109] disabled:cursor-not-allowed disabled:bg-[#b23a43]"
                >
                  <FontAwesomeIcon icon={faPenToSquare} />
                  {editSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
