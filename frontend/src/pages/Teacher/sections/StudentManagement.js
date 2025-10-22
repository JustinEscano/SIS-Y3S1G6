import React, { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faLink, faSearch, faRotate, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';

const dummyStudents = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", subject: "Math", classBlock: "Grade 10 - A", status: "Active" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", subject: "Science", classBlock: "Grade 11 - B", status: "Inactive" },
  { id: 3, name: "Carol Lee", email: "carol@example.com", subject: "English", classNameBlock: "Grade 12 - A", status: "Active" },
  { id: 4, name: "David Kim", email: "david@example.com", subject: "Math", classBlock: "Grade 10 - B", status: "Active" },
  { id: 5, name: "Eva Green", email: "eva@example.com", subject: "Science", classBlock: "Grade 11 - A", status: "Active" },
  { id: 6, name: "Frank Moore", email: "frank@example.com", subject: "Math", classBlock: "Grade 12 - B", status: "Inactive" },
  { id: 7, name: "Grace Park", email: "grace@example.com", subject: "English", classBlock: "Grade 10 - C", status: "Active" },
  { id: 8, name: "Henry Lee", email: "henry@example.com", subject: "Math", classBlock: "Grade 11 - B", status: "Active" },
  { id: 9, name: "Ivy Wong", email: "ivy@example.com", subject: "Science", classBlock: "Grade 12 - A", status: "Active" },
  { id: 10, name: "Jack Black", email: "jack@example.com", subject: "English", classBlock: "Grade 10 - B", status: "Inactive" },
  { id: 11, name: "Karen White", email: "karen@example.com", subject: "Math", classBlock: "Grade 11 - A", status: "Active" },
  { id: 12, name: "Leo Kim", email: "leo@example.com", subject: "Science", classBlock: "Grade 12 - B", status: "Active" },
];

const StudentManagement = () => {
  const [students, setStudents] = useState(dummyStudents);
  const [gradeFilter, setGradeFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const handleSearch = () => {
    let filtered = dummyStudents;

    if (gradeFilter) {
      filtered = filtered.filter(student => student.classBlock.startsWith(gradeFilter));
    }

    if (subjectFilter) {
      filtered = filtered.filter(student => student.subject === subjectFilter);
    }

    setStudents(filtered);
  };

  const handleReset = () => {
    setGradeFilter("");
    setSubjectFilter("");
    setStudents(dummyStudents);
  };

  return (
    <div className="ml-1 pt-8 pl-0 pr-5 py-5 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-3xl font-bold text-gray-800">Student Management</h1>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#81020b] text-white font-semibold rounded-lg hover:bg-[#6c0209] transition-colors duration-200">
            <FontAwesomeIcon icon={faPlus} />
            Add Student
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#81020b] text-white font-semibold rounded-lg hover:bg-[#6c0209] transition-colors duration-200">
            <FontAwesomeIcon icon={faLink} />
            Invite Link
          </button>
        </div>
      </div>

      {/* Search Panel */}
      <div className="bg-white rounded-lg p-5 mb-5 shadow-sm border border-gray-200 flex flex-col">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Search Panel</h2>
        <div className="flex gap-5 flex-wrap pb-4 border-b border-gray-200 mb-4">
          <div className="flex flex-col min-w-[150px]">
            <label className="text-sm text-gray-600 mb-2 font-medium">Grade Level</label>
            <select 
              value={gradeFilter} 
              onChange={e => setGradeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
            >
              <option value="">All Grades</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
            </select>
          </div>
          <div className="flex flex-col min-w-[150px]">
            <label className="text-sm text-gray-600 mb-2 font-medium">Subject</label>
            <select 
              value={subjectFilter} 
              onChange={e => setSubjectFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:border-transparent"
            >
              <option value="">All Subjects</option>
              <option value="Math">Math</option>
              <option value="Science">Science</option>
              <option value="English">English</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-[#81020b] text-white font-semibold rounded-lg hover:bg-[#6c0209] transition-colors duration-200"
            onClick={handleSearch}
          >
            <FontAwesomeIcon icon={faSearch} />
            Search
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-white text-[#81020b] font-semibold border border-[#81020b] rounded-lg hover:bg-[#81020b] hover:text-white transition-colors duration-200"
            onClick={handleReset}
          >
            <FontAwesomeIcon icon={faRotate} />
            Reset
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 flex flex-col">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Students Table</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class & Block</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.classBlock}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-normal rounded-full ${
                      student.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="p-1 text-gray-400 hover:text-[#81020b] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:ring-opacity-50 rounded">
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-[#81020b] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#81020b] focus:ring-opacity-50 rounded">
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;