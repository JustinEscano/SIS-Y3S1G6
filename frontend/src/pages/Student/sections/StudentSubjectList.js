// src/pages/Student/sections/StudentSubjectList.js
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faChartLine, faHistory, faLayerGroup, faCalendarAlt, faArchive, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';

import subjectService from '../../../services/subjectService';
import { useAuth } from '../../../context/authContext';
import LoadingSpinner from '../../../components/loadingSpinner';
import Pagination from '../../../components/Pagination'; // Assuming you have this

const StudentSubjectList = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [subjects, setSubjects] = useState([]); // Holds active or archived
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'archived'

  // Fetch subjects based on viewMode
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Please log in to view your subjects.');
      return;
    }

    const fetchSubjects = async () => {
      try {
        setLoading(true);
        setError(null);
        let response;
        if (viewMode === 'active') {
          console.log('Fetching active student subjects...');
          response = await subjectService.getStudentSubjects(token);
        } else {
          console.log('Fetching archived student subjects...');
          response = await subjectService.getStudentArchivedSubjects(token);
        }
        // Handle potential variations in API response structure
        const responseData = response.data || response;
        const subjectsArray = responseData.data || responseData || [];

        console.log(`🔍 Loaded ${viewMode} student subjects:`, subjectsArray.length);
        if (!Array.isArray(subjectsArray)) {
             console.error("Expected an array of subjects, but received:", subjectsArray);
             throw new Error("Invalid data format received from server.");
        }
        setSubjects(subjectsArray);
      } catch (err) {
        const status = err.response?.status;
        let msg;
        if (status === 403) {
          msg = 'Access denied. Please ensure you are logged in as a student.';
        } else if (status === 401) {
          msg = 'Session expired. Please log in again.';
        } else {
          msg = err.message || `Failed to fetch ${viewMode} subjects. Please try again.`;
        }
        setError(msg);
        console.error(`Error fetching ${viewMode} student subjects:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [token, viewMode]);

  // Reset pagination on subjects change
  useEffect(() => {
    setCurrentPage(1);
  }, [subjects]);

  const paginatedSubjects = subjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCardClick = (subjectId) => {
    // Only navigate if the subject is active
    if (viewMode === 'active') {
      navigate(`/student/subjects/${subjectId}/analytics`);
    }
  };

  const handleRetry = () => {
    setError(null);

    // Re-trigger fetch by toggling mode temporarily (or just call fetch function again)
    const fetchSubjectsAgain = async () => {
        // Copied fetch logic from useEffect
         try {
            setLoading(true);
            setError(null);
            let response;
            if (viewMode === 'active') {
            response = await subjectService.getStudentSubjects(token);
            } else {
            response = await subjectService.getStudentArchivedSubjects(token);
            }
            const responseData = response.data || response;
            const subjectsArray = responseData.data || responseData || [];
            if (!Array.isArray(subjectsArray)) {
                throw new Error("Invalid data format.");
            }
            setSubjects(subjectsArray);
        } catch (err) {
            setError(err.message || `Failed to fetch ${viewMode} subjects.`);
        } finally {
            setLoading(false);
        }
    };
    if(token) fetchSubjectsAgain();
  };

  const summaryCards = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const upcomingSubjects = subjects.filter((s) => {
      if (!s?.academicYear) return false;
      const [startYear] = s.academicYear.split('-');
      const numericYear = parseInt(startYear, 10);
      return !Number.isNaN(numericYear) && numericYear >= currentYear;
    });

    return [
      {
        label: viewMode === 'active' ? 'Active subjects' : 'Archived subjects',
        value: subjects.length,
        helper: viewMode === 'active' ? 'Currently available for study' : 'Previously completed classes',
        icon: viewMode === 'active' ? faLayerGroup : faArchive,
        accent: viewMode === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-600',
      },
      {
        label: 'With analytics enabled',
        value: viewMode === 'active' ? subjects.length : 0,
        helper: viewMode === 'active' ? 'Tap a card to open insights' : 'Analytics disabled for archived classes',
        icon: faChartLine,
        accent: 'bg-sky-100 text-sky-600',
      },
      {
        label: 'Upcoming academic years',
        value: upcomingSubjects.length,
        helper: 'Classes scheduled this school year',
        icon: faCalendarAlt,
        accent: 'bg-amber-100 text-amber-600',
      },
      {
        label: 'View mode',
        value: viewMode === 'active' ? 'Active' : 'Archived',
        helper: 'Switch to review other records',
        icon: faHistory,
        accent: 'bg-purple-100 text-purple-600',
      },
    ];
  }, [subjects, viewMode]);

  if (loading && subjects.length === 0) { // Show full screen spinner only on initial load
    return (
      <LoadingSpinner
        size="3xl"
        color="blue"
        fullScreen
        message="Loading your subjects..."
      />
    );
  }

  return (
    <div className="space-y-8 px-4 pb-16 pt-10 sm:px-8 bg-gray-50 min-h-screen">
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
                <FontAwesomeIcon icon={faBook} /> My subjects
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">Keep tabs on every class you belong to</h1>
                <p className="text-sm text-white/85">
                  Switch between active and archived classes, jump into analytics for current subjects, and stay organised throughout the school year.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 text-sm md:items-end">
              <button
                onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-white/25"
              >
                <FontAwesomeIcon icon={faHistory} /> {viewMode === 'active' ? 'View archived subjects' : 'View active subjects'}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              <FontAwesomeIcon icon={faCircleExclamation} className="mr-2" />
              {error}
              <div className="mt-3 flex gap-2 text-xs">
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 font-semibold text-white transition hover:bg-red-600"
                >
                  Retry
                </button>
                <button onClick={() => setError(null)} className="rounded-full bg-white/80 px-3 py-1 font-semibold text-red-600 transition hover:bg-white">
                  Dismiss
                </button>
              </div>
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {viewMode === 'active' ? 'Currently enrolled subjects' : 'Archived subjects'}
            </h2>
            <p className="text-sm text-gray-500">
              {viewMode === 'active'
                ? 'Select a subject to open analytics and grade forecasts.'
                : 'Review the classes you previously completed. Analytics access is disabled for archived records.'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-10 text-center">
            <LoadingSpinner message={`Loading ${viewMode} subjects...`} />
          </div>
        ) : subjects.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
            {viewMode === 'active'
              ? 'No subjects currently enrolled. Reach out to your adviser if this seems incorrect.'
              : 'No archived subjects found yet. Your completed classes will appear here.'}
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedSubjects.map((subject) => {
                const isArchived = viewMode === 'archived';
                return (
                  <div
                    key={subject._id}
                    onClick={() => !isArchived && handleCardClick(subject._id)}
                    className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition ${
                      isArchived
                        ? 'cursor-not-allowed opacity-70'
                        : 'cursor-pointer hover:-translate-y-1 hover:shadow-lg'
                    }`}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600 opacity-80" />
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">{subject.name}</h3>
                        {!isArchived && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
                            <FontAwesomeIcon icon={faChartLine} /> Analytics
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-xs text-gray-500">{subject.description || 'No description provided.'}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                          <FontAwesomeIcon icon={faBook} /> Grade {subject.gradeLevel ?? '—'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                          <FontAwesomeIcon icon={faCalendarAlt} /> {subject.academicYear || 'Academic year TBD'}
                        </span>
                      </div>
                      {subject.teacher?.name && (
                        <p className="text-xs text-gray-400">Teacher: {subject.teacher.name}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {subjects.length > itemsPerPage && (
              <div className="mt-6 flex justify-center">
                <Pagination
                  totalItems={subjects.length}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default StudentSubjectList;