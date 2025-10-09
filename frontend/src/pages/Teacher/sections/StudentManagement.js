import React, { useState } from "react";
import "../styles/StudentManagement.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faLink, faSearch, faRotate, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';

const dummyStudents = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", subject: "Math", classBlock: "Grade 10 - A", status: "Active" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", subject: "Science", classBlock: "Grade 11 - B", status: "Inactive" },
  { id: 3, name: "Carol Lee", email: "carol@example.com", subject: "English", classBlock: "Grade 12 - A", status: "Active" },
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
  const [teachers, setTeachers] = useState(dummyStudents);
  const [gradeFilter, setGradeFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const studentsPerPage = 10;

  const handleSearch = () => {
    let filtered = dummyStudents;

    if (gradeFilter) {
      filtered = filtered.filter(student => student.classBlock.startsWith(gradeFilter));
    }

    if (subjectFilter) {
      filtered = filtered.filter(student => student.subject === subjectFilter);
    }

    setTeachers(filtered);
    setCurrentPage(1); 
  };

  const handleReset = () => {
    setGradeFilter("");
    setSubjectFilter("");
    setTeachers(dummyStudents);
    setCurrentPage(1); 
  };

  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = teachers.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalStudents = teachers.length;

  const handleNext = () => {
    if (indexOfLastStudent < totalStudents) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <div className="student-management-page">
      <div className="sm-header">
        <h1>Student Management</h1>
        <div className="sm-actions">
          <button className="btn-add">
            <FontAwesomeIcon icon={faPlus} /> Add Student
          </button>
          <button className="btn-invite">
            <FontAwesomeIcon icon={faLink} /> Invite Link
          </button>
        </div>
      </div>

      <div className="sm-search-panel">
        <h2 className="panel-title">Search Panel</h2>
        <div className="panel-body">
          <div className="filter-item">
            <label>Grade Level</label>
            <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
              <option value="">All Grades</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Subject</label>
            <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
              <option value="">All Subjects</option>
              <option value="Math">Math</option>
              <option value="Science">Science</option>
              <option value="English">English</option>
            </select>
          </div>
        </div>

        <div className="panel-footer">
          <button className="btn-search" onClick={handleSearch}>
            <FontAwesomeIcon icon={faSearch} /> Search
          </button>
          <button className="btn-reset" onClick={handleReset}>
            <FontAwesomeIcon icon={faRotate} /> Reset
          </button>
        </div>
      </div>

      <div className="teachers-table-container">
        <h2 className="table-title">Teachers Table</h2>
        <table className="teachers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Assigned Subject</th>
              <th>Class & Block</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentStudents.map((teacher) => (
              <tr key={teacher.id}>
                <td>{teacher.name}</td>
                <td>{teacher.email}</td>
                <td>{teacher.subject}</td>
                <td>{teacher.classBlock}</td>
                <td>
                  <span className={`status ${teacher.status.toLowerCase()}`}>
                    {teacher.status}
                  </span>
                </td>
                <td>
                  <button className="btn-edit">
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button className="btn-delete">
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm-pagination">
        <button onClick={handlePrev} disabled={currentPage === 1}>{"<"}</button>
        <span>
          {totalStudents === 0
            ? "0-0 out of 0"
            : `${indexOfFirstStudent + 1}-${Math.min(indexOfLastStudent, totalStudents)} out of ${totalStudents}`}
        </span>
        <button onClick={handleNext} disabled={indexOfLastStudent >= totalStudents}>{">"}</button>
      </div>
    </div>
  );
};

export default StudentManagement;
