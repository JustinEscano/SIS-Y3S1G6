import React, { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faCalendarAlt,
  faClock,
  faChevronLeft,
  faSearch,
  faEdit,
  faTrash,
  faEllipsisV,
} from "@fortawesome/free-solid-svg-icons";

import "../styles/SubjectManagement.css";

const initialSubjects = [
  {
    id: 1,
    name: "English",
    schoolYear: "SY 2024 - 2025",
    status: "Ongoing",
    blocks: [
      {
        id: 101,
        name: "Grade 7 - Block A",
        schoolYear: "SY 2024 - 2025",
        status: "Ongoing",
        students: [
          { id: 1001, name: "Alice Johnson", email: "alice@example.com" },
          { id: 1002, name: "Bob Smith", email: "bob@example.com" },
        ],
        schedule: { days: "Mon / Wed", time: "7:30 am - 8:30 am" },
      },
      {
        id: 102,
        name: "Grade 7 - Block B",
        schoolYear: "SY 2024 - 2025",
        status: "Ongoing",
        students: [],
        schedule: { days: "Tue / Thu", time: "8:45 am - 9:45 am" },
      },
    ],
  },
  {
    id: 2,
    name: "Mathematics",
    schoolYear: "SY 2024 - 2025",
    status: "Ongoing",
    blocks: [
      {
        id: 201,
        name: "Grade 8 - Block A",
        schoolYear: "SY 2024 - 2025",
        status: "Ongoing",
        students: [
          { id: 2001, name: "Charlie Brown", email: "charlie@example.com" },
        ],
        schedule: { days: "Mon / Wed", time: "10:00 am - 11:00 am" },
      },
    ],
  },
  {
    id: 3,
    name: "Science",
    schoolYear: "SY 2024 - 2025",
    status: "Ongoing",
    blocks: [],
  },
];


const SUBJECT_OPTIONS = [
  "English", "Mathematics", "Science", "Filipino",
  "Araling Panlipunan", "MAPEH", "TLE", "Values Education",
];

const SCHOOLYEAR_OPTIONS = ["SY 2023 - 2024", "SY 2024 - 2025", "SY 2025 - 2026"];

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState(initialSubjects);

  // UI state
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);

  const [currentView, setCurrentView] = useState({ subjectId: null, blockId: null });

  // Form states
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectSY, setNewSubjectSY] = useState("SY 2024 - 2025");

  const [classSubjectId, setClassSubjectId] = useState(null);
  const [newClassGrade, setNewClassGrade] = useState("");
  const [newClassBlock, setNewClassBlock] = useState("");
  const [newClassDays, setNewClassDays] = useState("Mon / Wends");
  const [newClassTime, setNewClassTime] = useState("7:30 am - 8:30 am");

  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const studentsPerPage = 10;

  const currentSubject = useMemo(
    () => subjects.find((s) => s.id === currentView.subjectId) || null,
    [subjects, currentView.subjectId]
  );
  const currentBlock = useMemo(() => {
    if (!currentSubject || !currentView.blockId) return null;
    return currentSubject.blocks.find((b) => b.id === currentView.blockId) || null;
  }, [currentSubject, currentView.blockId]);

  // Add Subject
  function handleAddSubject(e) {
    e?.preventDefault?.();
    if (!newSubjectName.trim()) return;
    const id = Date.now();
    const newSub = { id, name: newSubjectName.trim(), schoolYear: newSubjectSY, status: "Ongoing", blocks: [] };
    setSubjects((s) => [newSub, ...s]);
    setNewSubjectName("");
    setNewSubjectSY("SY 2024 - 2025");
    setShowAddSubject(false);
  }

  // Add Class
  function openAddClassForSubject(subjectId) {
    setClassSubjectId(subjectId);
    setNewClassGrade("");
    setNewClassBlock("");
    setNewClassDays("Mon / Wends");
    setNewClassTime("7:30 am - 8:30 am");
    setShowAddClass(true);
  }
  function handleAddClass(e) {
    e?.preventDefault?.();
    if (!newClassGrade.trim() || !newClassBlock.trim()) return;
    const blockName = `${newClassGrade.trim()} - ${newClassBlock.trim()}`;
    const id = Date.now();
    const newBlock = { id, name: blockName, schoolYear: "SY 2024 - 2025", status: "Ongoing", students: [], schedule: { days: newClassDays, time: newClassTime } };
    setSubjects((list) => list.map((s) => (s.id === classSubjectId ? { ...s, blocks: [...s.blocks, newBlock] } : s)));
    setShowAddClass(false);
  }

  // Add Student
  function openAddStudentForBlock(subjectId, blockId) {
    setCurrentView({ subjectId, blockId });
    setStudentName("");
    setStudentEmail("");
    setShowAddStudent(true);
  }
  function handleAddStudent(e) {
    e?.preventDefault?.();
    if (!studentName.trim() || !studentEmail.trim()) return;
    const newStudent = { id: Date.now(), name: studentName.trim(), email: studentEmail.trim() };
    setSubjects((list) =>
      list.map((s) =>
        s.id === currentView.subjectId ? { ...s, blocks: s.blocks.map((b) => (b.id === currentView.blockId ? { ...b, students: [...b.students, newStudent] } : b)) } : s
      )
    );
    setShowAddStudent(false);
    setStudentPage(1 + Math.floor((currentBlock?.students?.length || 0) / studentsPerPage));
  }

  const filteredStudents = useMemo(() => {
    if (!currentBlock) return [];
    const q = studentSearch.trim().toLowerCase();
    return currentBlock.students.filter((st) => !q || st.name.toLowerCase().includes(q) || st.email.toLowerCase().includes(q));
  }, [currentBlock, studentSearch]);

  const totalStudents = filteredStudents.length;
  const studentIndexOfLast = studentPage * studentsPerPage;
  const studentIndexOfFirst = studentIndexOfLast - studentsPerPage;
  const currentStudentsPage = filteredStudents.slice(studentIndexOfFirst, studentIndexOfLast);

  function handleDeleteStudent(studentId) {
    if (!currentBlock) return;
    if (!window.confirm("Delete this student?")) return;
    setSubjects((list) =>
      list.map((s) =>
        s.id === currentView.subjectId ? { ...s, blocks: s.blocks.map((b) => (b.id === currentView.blockId ? { ...b, students: b.students.filter((st) => st.id !== studentId) } : b)) } : s
      )
    );
  }

  function handleDeleteBlock(subjectId, blockId) {
    if (!window.confirm("Delete this class block? This removes all enrolled students.")) return;
    setSubjects((list) => list.map((s) => (s.id === subjectId ? { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) } : s)));
    if (currentView.blockId === blockId) setCurrentView({ subjectId: null, blockId: null });
  }

  // Components
  function SubjectCard({ subject }) {
    return (
      <div className="card" onClick={() => setCurrentView({ subjectId: subject.id, blockId: null })}>
        <div className="card-header">
          <div>
            <h3>{subject.name}</h3>
            <p>{subject.schoolYear}</p>
          </div>
          <span className="status-badge">{subject.status}</span>
        </div>

        <div className="block-list">
          {subject.blocks.length === 0 ? (
            <div>No classes yet.</div>
          ) : (
            subject.blocks.map((b) => (
              <div key={b.id} className="block-card">
                <div className="block-info">
                  <div className="block-name">{b.name}</div>
                  <div className="schedule">
                    <FontAwesomeIcon icon={faCalendarAlt} /> {b.schedule.days}
                    <FontAwesomeIcon icon={faClock} /> {b.schedule.time}
                  </div>
                </div>
                <div className="block-students">
                  <div>Students</div>
                  <div>{b.students.length}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card-footer">
          <div>{subject.blocks.length} classes</div>
          <div className="actions">
            <button className="btn-secondary"><FontAwesomeIcon icon={faEdit} /></button>
            <button className="btn-add-class" onClick={(e) => { e.stopPropagation(); openAddClassForSubject(subject.id); }}><FontAwesomeIcon icon={faPlus} /> Add Class</button>
            <button className="btn-secondary"><FontAwesomeIcon icon={faEllipsisV} /></button>
          </div>
        </div>
      </div>
    );
  }

  function AddSubjectCard() {
    return (
      <div className="add-card" onClick={() => setShowAddSubject(true)}>
        <div>
          <div className="plus-circle">+</div>
          <div>Create New Subject</div>
        </div>
      </div>
    );
  }

  function BlockCard({ block, subjectId }) {
    return (
      <div className="card" onClick={() => setCurrentView({ subjectId, blockId: block.id })}>
        <div className="card-header">
          <div>
            <h3>{block.name}</h3>
            <p>{block.schoolYear}</p>
          </div>
          <span className="status-badge">{block.status}</span>
        </div>

        <div>
          <div>Students: <strong>{block.students.length}</strong></div>
          <div className="schedule">
            <FontAwesomeIcon icon={faCalendarAlt} /> {block.schedule.days}
            <FontAwesomeIcon icon={faClock} /> {block.schedule.time}
          </div>
        </div>

        <div className="card-footer">
          <button className="btn-add-student" onClick={(e) => { e.stopPropagation(); openAddStudentForBlock(subjectId, block.id); }}><FontAwesomeIcon icon={faPlus} /> Add Student</button>
          <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); handleDeleteBlock(subjectId, block.id); }}><FontAwesomeIcon icon={faTrash} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="subject-page">
      <div className="subject-header">
        {currentView.blockId && currentBlock ? (
        <>
            <button className="btn-secondary" onClick={() => setCurrentView({ subjectId: currentView.subjectId, blockId: null })}>
            <FontAwesomeIcon icon={faChevronLeft} /> 
            </button>
            <div className="header-text">
            <h2>{currentBlock.name} - {currentSubject.name}</h2>
            <p className="sub-header">{currentBlock.schoolYear}</p>
            </div>
            <button className="btn-add" onClick={() => openAddStudentForBlock(currentView.subjectId, currentView.blockId)}>
            <FontAwesomeIcon icon={faPlus} /> Add Student
            </button>
        </>
        ) : currentView.subjectId && currentSubject ? (
        <>
            <button className="btn-secondary" onClick={() => setCurrentView({ subjectId: null, blockId: null })}>
            <FontAwesomeIcon icon={faChevronLeft} /> 
            </button>
            <div className="header-text">
            <h2>{currentSubject.name}</h2>
            <p className="sub-header">{currentSubject.schoolYear}</p>
            </div>
            <button className="btn-add" onClick={() => openAddClassForSubject(currentSubject.id)}>
            <FontAwesomeIcon icon={faPlus} /> Add Class
            </button>
        </>
        ) : (
        <>
            <h2>Subject Management</h2>
            <button className="btn-add" onClick={() => setShowAddSubject(true)}>
            <FontAwesomeIcon icon={faPlus} /> Add Subject
            </button>
        </>
        )}
      </div>

      {!currentView.subjectId && (
        <div className="grid-container">
          {subjects.map((sub) => <SubjectCard key={sub.id} subject={sub} />)}
          <AddSubjectCard />
        </div>
      )}

      {currentView.subjectId && !currentView.blockId && (
        <div className="grid-container">
          {currentSubject.blocks.map((b) => <BlockCard key={b.id} block={b} subjectId={currentSubject.id} />)}
          <div className="add-card" onClick={() => openAddClassForSubject(currentSubject.id)}>
            <div>
              <div className="plus-circle">+</div>
              <div>Create New Class</div>
            </div>
          </div>
        </div>
      )}

        {currentBlock && (
        <div className="student-view">
            <div className="student-search">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
                type="text"
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => {
                setStudentSearch(e.target.value);
                setStudentPage(1);
                }}
            />
            </div>

            <table className="student-table">
            <thead>
                <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Subject</th>
                <th>Grade Level</th>
                <th>Class/Block</th>
                <th>Action</th>
                </tr>
            </thead>
            <tbody>
                {currentStudentsPage.map((st) => {
                // Split grade level and block from the parent block's name
                const parentBlock = currentSubject.blocks.find(b => b.students.some(s => s.id === st.id));
                const [gradeLevel, blockName] = parentBlock ? parentBlock.name.split(" - ") : ["", ""];
                return (
                    <tr key={st.id}>
                    <td>{st.name}</td>
                    <td>{st.email}</td>
                    <td>{currentSubject.name}</td>
                    <td>{gradeLevel}</td>
                    <td>{blockName}</td>
                    <td>
                        <div className="action-buttons">
                        <button onClick={() => openAddStudentForBlock(currentSubject.id, parentBlock?.id)}>
                            <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button onClick={() => handleDeleteStudent(st.id)}>
                            <FontAwesomeIcon icon={faTrash} />
                        </button>
                        </div>
                    </td>
                    </tr>
                );
                })}
            </tbody>
            </table>


            <div className="student-pagination">
            <button disabled={studentPage === 1} onClick={() => setStudentPage((p) => p - 1)}>{"<"}</button>
            <span>
                {totalStudents === 0
                ? "0-0 out of 0"
                : `${studentIndexOfFirst + 1}-${Math.min(studentIndexOfLast, totalStudents)} out of ${totalStudents}`}
            </span>
            <button disabled={studentIndexOfLast >= totalStudents} onClick={() => setStudentPage((p) => p + 1)}>{">"}</button>
            </div>
        </div>
        )}


      {showAddSubject && (
        <div className="modal-backdrop" onClick={() => setShowAddSubject(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Subject</h3>
            <form onSubmit={handleAddSubject}>
              <label>Subject Name</label>
              <select value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)}>
                <option value="">Select Subject</option>
                {SUBJECT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <label>School Year</label>
              <select value={newSubjectSY} onChange={(e) => setNewSubjectSY(e.target.value)}>
                {SCHOOLYEAR_OPTIONS.map((sy) => <option key={sy} value={sy}>{sy}</option>)}
              </select>
              <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddSubject(false)}>Cancel</button>
                <button type="submit" className="btn-add">Add Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

        {showAddClass && (
        <div className="modal-backdrop" onClick={() => setShowAddClass(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Class</h3>
            <form onSubmit={handleAddClass}>
                <label>Grade Level</label>
                <select value={newClassGrade} onChange={(e) => setNewClassGrade(e.target.value)}>
                <option value="">Select Grade</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                </select>

                <label>Block</label>
                <select value={newClassBlock} onChange={(e) => setNewClassBlock(e.target.value)}>
                <option value="">Select Block</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                </select>

                <label>Days</label>
                <select value={newClassDays} onChange={(e) => setNewClassDays(e.target.value)}>
                <option value="">Select Days</option>
                <option value="Mon / Wed">Mon / Wed</option>
                <option value="Tue / Thu">Tue / Thu</option>
                <option value="Mon / Wed / Fri">Mon / Wed / Fri</option>
                </select>

                <label>Time</label>
                <select value={newClassTime} onChange={(e) => setNewClassTime(e.target.value)}>
                <option value="">Select Time</option>
                <option value="7:30 am - 8:30 am">7:30 am - 8:30 am</option>
                <option value="8:45 am - 9:45 am">8:45 am - 9:45 am</option>
                <option value="10:00 am - 11:00 am">10:00 am - 11:00 am</option>
                <option value="1:00 pm - 2:00 pm">1:00 pm - 2:00 pm</option>
                </select>

                <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddClass(false)}>Cancel</button>
                <button type="submit" className="btn-add">Add Class</button>
                </div>
            </form>
            </div>
        </div>
        )}

        {showAddStudent && (
        <div className="modal-backdrop" onClick={() => setShowAddStudent(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Student</h3>
            <form onSubmit={handleAddStudent}>
                <label>Name</label>
                <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} />

                <label>Subject</label>
                <select
                value={currentView.subjectId || ""}
                onChange={(e) => setCurrentView({ subjectId: Number(e.target.value), blockId: null })}
                >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                </select>

                <label>Grade Level</label>
                <select
                value={currentView.gradeLevel || ""}
                onChange={(e) => setCurrentView((v) => ({ ...v, gradeLevel: e.target.value }))}
                disabled={!currentView.subjectId}
                >
                <option value="">Select Grade Level</option>
                {currentView.subjectId &&
                    subjects
                    .find((s) => s.id === currentView.subjectId)
                    .blocks.map((b) => (
                        <option key={b.id} value={b.name.split(" - ")[0]}>{b.name.split(" - ")[0]}</option>
                    ))}
                </select>

                <label>Section</label>
                <select
                value={currentView.blockId || ""}
                onChange={(e) => setCurrentView((v) => ({ ...v, blockId: Number(e.target.value) }))}
                disabled={!currentView.subjectId}
                >
                <option value="">Select Section</option>
                {currentView.subjectId &&
                    subjects
                    .find((s) => s.id === currentView.subjectId)
                    .blocks.map((b) => (
                        <option key={b.id} value={b.id}>{b.name.split(" - ")[1]}</option>
                    ))}
                </select>

                <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddStudent(false)}>Cancel</button>
                <button type="submit" className="btn-add">Add Student</button>
                </div>
            </form>
            </div>
        </div>
        )}

    </div>
  );
}
