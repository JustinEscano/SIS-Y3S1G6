import React, { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faSearch, faEye, faPlus, faSave, faTimes } from "@fortawesome/free-solid-svg-icons";
import AppService from "../../../appService";
import Pagination from "../../../components/Pagination";

const SUBJECT_TILES = [
  {
    key: "total",
    label: "Total subjects",
    helper: "Across all grade levels",
  },
  {
    key: "active",
    label: "Active subjects",
    helper: "Currently offered",
  },
  {
    key: "archived",
    label: "Archived",
    helper: "Hidden from enrollment",
  },
  {
    key: "students",
    label: "Enrolled students",
    helper: "Across all subjects",
  },
];

function SubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const initialCreateForm = {
    name: "",
    code: "",
    gradeLevel: "",
    academicYear: "",
    description: ""
  };
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [alert, setAlert] = useState(null); // { type: 'success' | 'error', message: string }
  const [detailError, setDetailError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [savingSubject, setSavingSubject] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const { data } = await AppService.get("/subjects");
      console.log("Subjects response:", data);
      const subjectsArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.subjects)
        ? data.subjects
        : [];
      setSubjects(subjectsArray);
      if (!subjectsArray.length) {
        setAlert((prev) =>
          prev?.type === 'success'
            ? prev
            : { type: 'info', message: 'No subjects found yet. Create one to get started.' }
        );
      } else {
        setAlert((prev) => (prev?.type === 'success' ? prev : null));
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setSubjects([]); // Set empty array on error
      setAlert({ type: 'error', message: 'Failed to load subjects. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFormChange = (e) => {
    if (createError) setCreateError("");
    setCreateForm({ ...createForm, [e.target.name]: e.target.value });
  };

  const openCreateModal = () => {
    setCreateForm(initialCreateForm);
    setCreateError("");
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateError("");
    setCreating(false);
  };

  const openSubjectDetails = async (subjectId) => {
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      const { data } = await AppService.get(`/subjects/${subjectId}`);
      const subjectData = data?.data || data;
      setSelectedSubject(subjectData);
      setEditingSubject({
        name: subjectData.name || "",
        code: subjectData.code || "",
        gradeLevel: subjectData.gradeLevel || "",
        academicYear: subjectData.academicYear || "",
        description: subjectData.description || ""
      });
    } catch (error) {
      console.error("Error fetching subject details:", error);
      setDetailError(error.response?.data?.error || 'Failed to load subject details.');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedSubject(null);
    setEditingSubject(null);
    setSavingSubject(false);
    setDetailError(null);
  };

  const handleDetailFieldChange = (e) => {
    if (!editingSubject) return;
    setEditingSubject({ ...editingSubject, [e.target.name]: e.target.value });
  };

  const handleSaveSubject = async () => {
    if (!selectedSubject || !editingSubject) return;
    try {
      setSavingSubject(true);
      setDetailError(null);
      const payload = {
        name: editingSubject.name?.trim(),
        code: editingSubject.code?.trim() || undefined,
        gradeLevel: editingSubject.gradeLevel ? Number(editingSubject.gradeLevel) : undefined,
        academicYear: editingSubject.academicYear?.trim(),
        description: editingSubject.description ?? ""
      };

      if (!payload.name || !payload.academicYear) {
        setDetailError('Subject name and academic year are required.');
        setSavingSubject(false);
        return;
      }

      if (payload.gradeLevel === undefined || Number.isNaN(payload.gradeLevel)) {
        setDetailError('Please choose a grade level between 7 and 10.');
        setSavingSubject(false);
        return;
      }

      if (!/^\d{4}-\d{4}$/.test(payload.academicYear)) {
        setDetailError('Academic year must follow YYYY-YYYY format.');
        setSavingSubject(false);
        return;
      }

      await AppService.put(`/subjects/${selectedSubject._id}`, payload);
      await fetchSubjects();
      await openSubjectDetails(selectedSubject._id);
      setDetailError('Subject updated successfully.');
    } catch (error) {
      console.error('Error updating subject:', error);
      const errMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to update subject.';
      setDetailError(errMessage);
    } finally {
      setSavingSubject(false);
    }
  };

  const handleCreateSubject = async () => {
    try {
      if (!createForm.name.trim() || !createForm.gradeLevel || !createForm.academicYear.trim()) {
        setCreateError('Please complete the required fields before creating a subject.');
        return;
      }

      if (!/^\d{4}-\d{4}$/.test(createForm.academicYear.trim())) {
        setCreateError('Academic year must follow the YYYY-YYYY format (e.g., 2024-2025).');
        return;
      }

      const gradeLevelNumber = Number(createForm.gradeLevel);
      if (Number.isNaN(gradeLevelNumber) || gradeLevelNumber < 7 || gradeLevelNumber > 10) {
        setCreateError('Grade level must be between 7 and 10.');
        return;
      }

      setCreating(true);
      setCreateError("");
      const payload = {
        ...createForm,
        gradeLevel: gradeLevelNumber,
        academicYear: createForm.academicYear.trim(),
        teacher: createForm.teacher || undefined
      };
      await AppService.post("/subjects", payload);
      closeCreateModal();
      setAlert({ type: 'success', message: 'Subject created successfully.' });
      fetchSubjects();
    } catch (error) {
      console.error("Error creating subject:", error);
      setCreateError(error.response?.data?.error || 'Failed to create subject.');
    } finally {
      setCreating(false);
    }
  };

  const filteredSubjects = Array.isArray(subjects) ? subjects.filter(subject =>
    subject.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.code?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, subjects.length]);

  const paginatedSubjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSubjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSubjects, currentPage, itemsPerPage]);

  const subjectSummary = useMemo(() => {
    const stats = {
      total: subjects.length,
      active: 0,
      archived: 0,
      students: 0,
    };

    subjects.forEach((subject) => {
      if (subject?.archived) {
        stats.archived += 1;
      } else {
        stats.active += 1;
      }
      stats.students += subject?.students?.length || 0;
    });

    return stats;
  }, [subjects]);

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
                Subject catalog
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">All subjects across your SIS</h1>
                <p className="text-sm text-white/85">
                  Track academic offerings, manage archived classes, and ensure every grade level has the coverage it needs for the school year.
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
                  <div className="flex items-start justify-between gap-3">
                    <span>{alert.message}</span>
                    <button onClick={() => setAlert(null)} className="text-[10px] uppercase tracking-wide text-current/70">
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-start gap-3 text-sm md:items-end">
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-white/25"
              >
                <FontAwesomeIcon icon={faPlus} /> Create subject
              </button>
              <p className="text-xs text-white/75">Add new offerings or keep archives up to date.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SUBJECT_TILES.map((tile) => (
          <div key={tile.label} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#81020b]/10 text-lg font-semibold text-[#81020b]">
              <FontAwesomeIcon icon={faBook} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tile.label}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {tile.key === "students" ? subjectSummary.students : subjectSummary[tile.key] || 0}
              </p>
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
              placeholder="Search by subject name or code"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-700 transition focus:border-[#81020b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#81020b]/30"
            />
          </div>
          <div className="text-xs text-gray-500">
            Showing {filteredSubjects.length} of {subjects.length} subjects
          </div>
        </div>

        <div className="px-6 py-6">
          {loading ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-sm text-gray-500">
              Loading subjects...
            </p>
          ) : filteredSubjects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-sm text-gray-500">
              No subjects found.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedSubjects.map((subject) => (
                <div key={subject._id} className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#81020b] via-[#b0121c] to-[#81020b] opacity-70" />
                  <div className="flex items-start gap-3 px-5 py-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#81020b]/10 text-[#81020b]">
                      <FontAwesomeIcon icon={faBook} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-gray-900">{subject.name}</p>
                        {subject.archived && (
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">Archived</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{subject.code || "No code yet"}</p>
                      <p className="text-xs text-gray-500">Grade level: <span className="font-semibold text-gray-700">{subject.gradeLevel ?? "Unassigned"}</span></p>
                      <p className="text-xs text-gray-500">Enrolled students: <span className="font-semibold text-gray-700">{subject.students?.length || 0}</span></p>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 bg-gray-50 px-5 py-3 text-sm text-gray-500">
                    <button
                      onClick={() => openSubjectDetails(subject._id)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#81020b] transition hover:border-[#81020b] hover:text-[#81020b]"
                    >
                      <FontAwesomeIcon icon={faEye} /> View subject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {filteredSubjects.length > itemsPerPage && (
          <div className="flex justify-end border-t border-gray-100 px-6 py-4">
            <Pagination
              totalItems={filteredSubjects.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </section>

      {/* Subject Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">Subject Details</h3>
              <button onClick={closeDetailModal} className="text-gray-400 hover:text-gray-600">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {detailLoading ? (
                <div className="text-center text-gray-500">Loading subject details...</div>
              ) : !selectedSubject ? (
                <div className="text-center text-gray-500">Subject not found.</div>
              ) : (
                <>
                  {detailError && (
                    <div className={`mb-4 p-3 rounded-lg border ${
                      detailError.includes('successfully')
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                      {detailError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500 uppercase tracking-wide">Subject Name</label>
                      <input
                        type="text"
                        name="name"
                        value={editingSubject?.name || ''}
                        onChange={handleDetailFieldChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500 uppercase tracking-wide">Subject Code</label>
                      <input
                        type="text"
                        name="code"
                        value={editingSubject?.code || ''}
                        onChange={handleDetailFieldChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
                        placeholder="Optional code"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500 uppercase tracking-wide">Grade Level</label>
                      <select
                        name="gradeLevel"
                        value={editingSubject?.gradeLevel ?? ''}
                        onChange={handleDetailFieldChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
                      >
                        <option value="">Unassigned</option>
                        {[7, 8, 9, 10].map((grade) => (
                          <option key={grade} value={grade}>
                            Grade {grade}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500 uppercase tracking-wide">Academic Year</label>
                      <input
                        type="text"
                        name="academicYear"
                        value={editingSubject?.academicYear || ''}
                        onChange={handleDetailFieldChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
                        placeholder="YYYY-YYYY"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-500 uppercase tracking-wide">Description</label>
                    <textarea
                      name="description"
                      value={editingSubject?.description || ''}
                      onChange={handleDetailFieldChange}
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
                      placeholder="Optional description"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Created</p>
                      <p className="text-lg text-gray-800">
                        {selectedSubject.createdAt ? new Date(selectedSubject.createdAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Updated</p>
                      <p className="text-lg text-gray-800">
                        {selectedSubject.updatedAt ? new Date(selectedSubject.updatedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Students</p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {selectedSubject.students && selectedSubject.students.length > 0 ? (
                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedSubject.students.map((student) => (
                            <li key={student._id || student.id} className="flex justify-between text-sm text-gray-700">
                              <span>{student.name || 'Unnamed Student'}</span>
                              <span className="text-gray-500">{student.lrn || student.email || 'N/A'}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-sm">No students enrolled.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={handleSaveSubject}
                disabled={savingSubject}
                className="px-4 py-2 bg-[#81020b] text-white rounded-lg hover:bg-[#6a0109] disabled:bg-gray-400 transition-colors"
              >
                {savingSubject ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={closeDetailModal} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Subject Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">Create New Subject</h3>
              <button
                onClick={closeCreateModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {createError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={createForm.name}
                  onChange={handleCreateFormChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent ${createError && !createForm.name.trim() ? 'border-red-300 bg-red-50/40' : 'border-gray-300'}`}
                  placeholder="e.g., Mathematics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Code
                </label>
                <input
                  type="text"
                  name="code"
                  value={createForm.code}
                  onChange={handleCreateFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
                  placeholder="e.g., MATH101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade Level
                </label>
                <select
                  name="gradeLevel"
                  value={createForm.gradeLevel}
                  onChange={handleCreateFormChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent ${createError && !createForm.gradeLevel ? 'border-red-300 bg-red-50/40' : 'border-gray-300'}`}
                >
                  <option value="">Select Grade Level</option>
                  {[7, 8, 9, 10].map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year
                </label>
                <input
                  type="text"
                  name="academicYear"
                  value={createForm.academicYear}
                  onChange={handleCreateFormChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent ${createError && !/^\d{4}-\d{4}$/.test(createForm.academicYear.trim()) ? 'border-red-300 bg-red-50/40' : 'border-gray-300'}`}
                  placeholder="e.g., 2024-2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={createForm.description}
                  onChange={handleCreateFormChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
                  placeholder="Optional description..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={closeCreateModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubject}
                disabled={creating || !createForm.name.trim()}
                className="bg-[#81020b] text-white px-6 py-2 rounded-lg hover:bg-[#6a0109] disabled:bg-gray-400 transition-colors flex items-center gap-2"
              >
                {creating ? "Creating..." : (
                  <>
                    <FontAwesomeIcon icon={faSave} />
                    Create Subject
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubjectManagement;
