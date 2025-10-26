// src/pages/Teacher/sections/StudentManagement.js
import React, { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Added faFilter icon
import { faSearch, faTimes, faRotate, faEye, faEdit, faTrash, faFilter, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/authContext';
import studentService from '../../../services/studentService';
import LoadingSpinner from "../../../components/loadingSpinner"; // Added LoadingSpinner
import Pagination from "../../../components/Pagination"; // Added Pagination

const StudentManagement = () => {
    const { token } = useAuth();
    const [students, setStudents] = useState([]); // Raw list from API
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Or your preferred number

    useEffect(() => {
        fetchStudents();
    }, [token]); // Dependency array includes token

    const fetchStudents = async () => {
        if (!token) {
            setError("Authentication required."); // Set error if no token
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const response = await studentService.getAllStudents(token);
            console.log('📥 Raw student response:', response); // Debug log

            // Expecting { success: true, count: N, students: [...] }
            const apiData = response;
            let fetchedStudents = [];
            // Use the students array directly from the response
            if (apiData && apiData.students && Array.isArray(apiData.students)) {
                fetchedStudents = apiData.students;
            } else if (Array.isArray(apiData)) { // Fallback if structure is different
               console.warn("Unexpected response structure, expected { students: [...] }", apiData);
               fetchedStudents = apiData; // Attempt to use if it's just an array
            } else {
                 console.error("Invalid data structure received for students:", apiData);
                 throw new Error("Received invalid data format for students.");
            }
            console.log('📋 Extracted students (with grade level):', fetchedStudents.length, fetchedStudents[0]); // Debug log
            setStudents(fetchedStudents);
        } catch (err) {
            console.error('Error fetching students:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setSearchTerm('');
        setCurrentPage(1); // Reset page on filter reset
    };

    const openStudentModal = (student) => {
        setSelectedStudent(student);
        setShowModal(true);
    };

    // Filter students based on search term
    const filteredStudents = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        if (!lowerSearchTerm) return students; // No search term, return all

        return students.filter(student =>
            student.name?.toLowerCase().includes(lowerSearchTerm) ||
            student.email?.toLowerCase().includes(lowerSearchTerm) ||
            student._id?.toString().includes(searchTerm) || // Keep ID search if needed
            (student.lrn && student.lrn.toLowerCase().includes(lowerSearchTerm))
        );
    }, [students, searchTerm]);

    // Paginate the filtered students
    const paginatedStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredStudents, currentPage, itemsPerPage]);

    // Reset page if filters result in current page being invalid
     useEffect(() => {
        const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages); // Go to last valid page
        } else if (currentPage < 1 && filteredStudents.length > 0) {
             setCurrentPage(1); // Go to first page if invalid
        } else if (filteredStudents.length === 0) {
             setCurrentPage(1); // Reset to 1 if no results
        }
    }, [filteredStudents, currentPage, itemsPerPage]);


    if (loading) {
        // Use LoadingSpinner component
        return <LoadingSpinner message="Loading students..." size="lg" />;
    }

    if (error) {
        return (
            <div className="m-6 max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md border border-red-200">
                <div className="flex items-center mb-4">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-red-500 mr-3" />
                    <h2 className="text-xl font-semibold text-gray-800">Error Loading Students</h2>
                </div>
                <p className="text-gray-600 mb-6">{error}</p>
                <button onClick={fetchStudents} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="ml-1 pt-8 pl-0 pr-5 py-5 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
                <h1 className="text-3xl font-bold text-gray-800">Student Management</h1>
                 {/* Add button can go here if needed */}
                 {/* <button className="btn-primary">Add New Student</button> */}
            </div>

            {/* Search Panel */}
            <div className="bg-white rounded-lg p-5 mb-5 shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    <FontAwesomeIcon icon={faSearch} className="mr-2 text-gray-500"/>
                    Find Students
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-grow">
                        <label htmlFor="student-search" className="block text-sm text-gray-600 mb-1 font-medium">Search by Name, Email, or LRN</label>
                        <input
                            id="student-search"
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} // Reset page on search
                            placeholder="Type to search..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#81020b] focus:border-[#81020b] text-sm"
                        />
                    </div>
                    <button onClick={handleReset} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-sm font-medium whitespace-nowrap">
                        <FontAwesomeIcon icon={faRotate} className="mr-1" /> Reset
                    </button>
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 flex flex-col">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    Students ({filteredStudents.length}) {/* Show total filtered count */}
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full table-auto border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="th">Name</th>
                                <th className="th">Email</th>
                                <th className="th">LRN</th>
                                {/* Use Current Grade */}
                                <th className="th">Current Grade</th>
                                <th className="th">Section</th>
                                <th className="th">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 italic">
                                        {searchTerm ? 'No students found matching your search.' : 'No students available.'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedStudents.map((student) => (
                                    <tr key={student._id} className="hover:bg-gray-50 transition-colors duration-150">
                                        <td className="td font-medium text-gray-900">{student.name}</td>
                                        <td className="td">{student.email}</td>
                                        <td className="td">{student.lrn || 'N/A'}</td>
                                        {/* Display currentGradeLevel */}
                                        <td className="td font-medium">
                                             {student.currentGradeLevel ?
                                                 `Grade ${student.currentGradeLevel}`
                                                 : <span className='text-gray-400 italic'>Inactive</span>
                                             }
                                        </td>
                                        <td className="td">{student.section || 'N/A'}</td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm font-medium space-x-3"> {/* Adjusted padding/spacing */}
                                            <button onClick={() => openStudentModal(student)} className="text-blue-600 hover:text-blue-800 transition-colors duration-200" title="View Details"> <FontAwesomeIcon icon={faEye} /> </button>
                                            <button className="text-yellow-500 hover:text-yellow-700 transition-colors duration-200" title="Edit Student (Placeholder)"> <FontAwesomeIcon icon={faEdit} /> </button>
                                            <button className="text-red-500 hover:text-red-700 transition-colors duration-200" title="Delete Student (Placeholder)"> <FontAwesomeIcon icon={faTrash} /> </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                 {/* Pagination Controls */}
                 {filteredStudents.length > itemsPerPage && (
                    <Pagination
                        totalItems={filteredStudents.length}
                        itemsPerPage={itemsPerPage}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                 )}
            </div>

            {/* Student Details Modal */}
            {showModal && selectedStudent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h2 className="text-xl font-semibold text-gray-800">Student Details</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FontAwesomeIcon icon={faTimes} /></button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div><label className="font-medium text-gray-600">Name:</label> <p className="text-gray-900">{selectedStudent.name}</p></div>
                            <div><label className="font-medium text-gray-600">Email:</label> <p className="text-gray-900">{selectedStudent.email}</p></div>
                            <div><label className="font-medium text-gray-600">LRN:</label> <p className="text-gray-900">{selectedStudent.lrn || 'N/A'}</p></div>
                            {/* Display calculated grade level */}
                            <div><label className="font-medium text-gray-600">Current Grade:</label> <p className="text-gray-900">{selectedStudent.currentGradeLevel ? `Grade ${selectedStudent.currentGradeLevel}` : <span className='italic text-gray-500'>Inactive</span>}</p></div>
                            <div><label className="font-medium text-gray-600">Section:</label> <p className="text-gray-900">{selectedStudent.section || 'N/A'}</p></div>
                             {/* Display Status based on grade level */}
                             <div>
                                <label className="font-medium text-gray-600">Status:</label>
                                <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full leading-tight ${
                                    selectedStudent.currentGradeLevel
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800' // Changed inactive to yellow/orange
                                }`}>
                                    {selectedStudent.currentGradeLevel ? 'Active' : 'Inactive'}
                                </span>
                             </div>
                        </div>
                        <div className="flex justify-end mt-6 pt-4 border-t">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Add basic CSS for th/td if not globally defined (e.g., in index.css)
/*
.th { @apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider; }
.td { @apply px-6 py-4 whitespace-nowrap text-sm text-gray-500; }
*/

export default StudentManagement;