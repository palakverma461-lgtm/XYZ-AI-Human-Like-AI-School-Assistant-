// Mock In-Memory Database for School ERP Ecosystem
const fs = require('fs');
const path = require('path');

// Initial state of the database
const data = {
  students: [
    {
      id: "S101",
      name: "Rahul Sharma",
      searchName: "rahul",
      class: "Class 10-A",
      parentName: "Mrs. Sharma",
      parentUser: "mrs_sharma",
      attendance: 91.2,
      history: [
        { date: "2026-08-15", status: "Absent", reason: "Fever" },
        { date: "2026-08-14", status: "Present" },
        { date: "2026-08-13", status: "Present" },
        { date: "2026-08-12", status: "Present" },
        { date: "2026-08-11", status: "Present" },
        { date: "2026-08-10", status: "Present" },
        { date: "2026-08-09", status: "Present" },
        { date: "2026-08-08", status: "Present" },
        { date: "2026-08-07", status: "Present" },
        { date: "2026-08-06", status: "Present" }
      ],
      grades: { "Mathematics": "A", "Science": "B+", "English": "A-", "Social Studies": "A", "Hindi": "B" }
    },
    {
      id: "S102",
      name: "Priya Patel",
      searchName: "priya",
      class: "Class 10-A",
      parentName: "Mr. Patel",
      parentUser: "mr_patel",
      attendance: 94.5,
      history: [
        { date: "2026-08-15", status: "Present" },
        { date: "2026-08-14", status: "Present" },
        { date: "2026-08-13", status: "Present" },
        { date: "2026-08-12", status: "Present" },
        { date: "2026-08-11", status: "Present" },
        { date: "2026-08-10", status: "Present" },
        { date: "2026-08-09", status: "Present" },
        { date: "2026-08-08", status: "Present" },
        { date: "2026-08-07", status: "Present" },
        { date: "2026-08-06", status: "Present" }
      ],
      grades: { "Mathematics": "A+", "Science": "A", "English": "A", "Social Studies": "A+", "Hindi": "A-" }
    },
    {
      id: "S103",
      name: "Amit Verma",
      searchName: "amit",
      class: "Class 10-A",
      parentName: "Mr. Verma",
      parentUser: "mr_verma",
      attendance: 82.0,
      history: [
        { date: "2026-08-15", status: "Absent", reason: "Family Function" },
        { date: "2026-08-14", status: "Absent", reason: "Family Function" },
        { date: "2026-08-13", status: "Present" },
        { date: "2026-08-12", status: "Present" },
        { date: "2026-08-11", status: "Present" },
        { date: "2026-08-10", status: "Present" },
        { date: "2026-08-09", status: "Present" },
        { date: "2026-08-08", status: "Present" },
        { date: "2026-08-07", status: "Present" },
        { date: "2026-08-06", status: "Absent", reason: "Cold" }
      ],
      grades: { "Mathematics": "B-", "Science": "C+", "English": "B", "Social Studies": "B", "Hindi": "C" }
    },
    {
      id: "S104",
      name: "Sneha Reddy",
      searchName: "sneha",
      class: "Class 10-B",
      parentName: "Mrs. Reddy",
      parentUser: "mrs_reddy",
      attendance: 95.8,
      history: [
        { date: "2026-08-15", status: "Present" },
        { date: "2026-08-14", status: "Present" },
        { date: "2026-08-13", status: "Present" },
        { date: "2026-08-12", status: "Present" },
        { date: "2026-08-11", status: "Present" },
        { date: "2026-08-10", status: "Present" },
        { date: "2026-08-09", status: "Present" },
        { date: "2026-08-08", status: "Present" },
        { date: "2026-08-07", status: "Present" },
        { date: "2026-08-06", status: "Present" }
      ],
      grades: { "Mathematics": "A", "Science": "A+", "English": "A", "Social Studies": "A", "Hindi": "A" }
    }
  ],
  escalations: [
    {
      id: "ESC-001",
      userRole: "Parent",
      userName: "Mrs. Sharma",
      type: "Teacher Call",
      message: "I want to discuss Rahul's math grade. He has been struggling.",
      status: "Confirmed",
      timestamp: "2026-08-15T10:30:00.000Z"
    }
  ]
};

// Calculate attendance helper
function recalculateAttendance(student) {
  const presentCount = student.history.filter(h => h.status === 'Present').length;
  const totalCount = student.history.length;
  student.attendance = parseFloat(((presentCount / totalCount) * 100).toFixed(1));
}

// Programmatically generate 46 more students to make it exactly 50 student records (members of data)
const firstNames = ["Rohan", "Neha", "Vikram", "Anjali", "Suresh", "Divya", "Rajesh", "Kiran", "Aditya", "Shreya", "Deepak", "Aishwarya", "Vijay", "Preeti", "Sanjay", "Ritu", "Arjun", "Sunita", "Karan", "Tanvi", "Ravi", "Simran", "Kabir", "Meera", "Yash", "Ishita", "Abhishek", "Komal", "Manish", "Payal", "Vivek", "Shalini", "Gaurav", "Priyanka", "Harish", "Jyoti", "Sandeep", "Swati", "Nikhil", "Kriti", "Akash", "Ananya", "Pranav", "Riya", "Varun", "Riddhima"];
const lastNames = ["Gupta", "Singh", "Joshi", "Mehta", "Kumar", "Rao", "Nair", "Mishra", "Choudhury", "Das", "Sen", "Bose", "Trivedi", "Pandey", "Saxena", "Roy", "Yadav", "Tripathi", "Dubey", "Gill", "Malhotra", "Kapoor"];
const subjects = ["Mathematics", "Science", "English", "Social Studies", "Hindi"];
const gradeLetters = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-"];

for (let i = 0; i < 46; i++) {
  const fName = firstNames[i % firstNames.length];
  const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const studentId = `S${105 + i}`;
  const fullName = `${fName} ${lName}`;
  const parentGender = Math.random() > 0.5 ? "Mr." : "Mrs.";
  const parentName = `${parentGender} ${lName}`;
  const parentUser = `parent_${fName.toLowerCase()}_${lName.toLowerCase()}`;
  const studentClass = `Class 10-${["A", "B", "C"][Math.floor(Math.random() * 3)]}`;

  const history = [];
  for (let d = 6; d <= 15; d++) {
    const isPresent = Math.random() > 0.12;
    history.push({
      date: `2026-08-${d < 10 ? '0' + d : d}`,
      status: isPresent ? "Present" : "Absent",
      reason: isPresent ? "" : ["Fever", "Family Function", "Cold", "Unspecified"][Math.floor(Math.random() * 4)]
    });
  }

  const grades = {};
  subjects.forEach(sub => {
    grades[sub] = gradeLetters[Math.floor(Math.random() * gradeLetters.length)];
  });

  const newStudent = {
    id: studentId,
    name: fullName,
    searchName: fName.toLowerCase(),
    class: studentClass,
    parentName,
    parentUser,
    attendance: 0,
    history,
    grades
  };
  
  recalculateAttendance(newStudent);
  data.students.push(newStudent);
}

module.exports = {
  // Students
  getStudents: () => data.students,
  
  getStudentById: (id) => {
    return data.students.find(s => s.id.toLowerCase() === id.toLowerCase());
  },
  
  getStudentByName: (name) => {
    const cleanName = name.toLowerCase().trim();
    // Match exact or sub-string
    return data.students.find(s => 
      s.name.toLowerCase().includes(cleanName) || 
      s.searchName.includes(cleanName)
    );
  },

  getStudentByParent: (parentName) => {
    const cleanParent = parentName.toLowerCase().replace(/[^a-z0-9_]/g, '');
    return data.students.find(s => 
      s.parentUser.replace(/[^a-z0-9_]/g, '') === cleanParent ||
      s.parentName.toLowerCase().includes(parentName.toLowerCase())
    );
  },

  updateAttendance: (studentName, date, status, reason = "") => {
    const student = data.students.find(s => 
      s.name.toLowerCase().includes(studentName.toLowerCase())
    );
    if (!student) return { success: false, error: "Student not found" };

    // Check if entry for date already exists
    const existingIndex = student.history.findIndex(h => h.date === date);
    if (existingIndex !== -1) {
      student.history[existingIndex] = { date, status, reason };
    } else {
      student.history.unshift({ date, status, reason });
    }

    recalculateAttendance(student);
    return { success: true, student };
  },

  // Analytics
  getOverallAttendance: () => {
    const total = data.students.reduce((sum, s) => sum + s.attendance, 0);
    return parseFloat((total / data.students.length).toFixed(1));
  },

  getAttendanceStats: () => {
    // School-wide statistics
    const overall = parseFloat((data.students.reduce((sum, s) => sum + s.attendance, 0) / data.students.length).toFixed(1));
    const studentsCount = data.students.length;
    const belowThreshold = data.students.filter(s => s.attendance < 85).map(s => ({
      name: s.name,
      attendance: s.attendance,
      class: s.class
    }));
    
    // Class-wise attendance
    const classes = {};
    data.students.forEach(s => {
      if (!classes[s.class]) classes[s.class] = { total: 0, count: 0 };
      classes[s.class].total += s.attendance;
      classes[s.class].count += 1;
    });

    const classWise = {};
    for (let c in classes) {
      classWise[c] = parseFloat((classes[c].total / classes[c].count).toFixed(1));
    }

    return {
      overall,
      studentsCount,
      belowThreshold,
      classWise
    };
  },

  // Escalations
  createEscalation: (userRole, userName, type, message) => {
    const newEsc = {
      id: `ESC-00${data.escalations.length + 1}`,
      userRole,
      userName,
      type,
      message,
      status: "Confirmed", // System confirms call request
      timestamp: new Date().toISOString()
    };
    data.escalations.unshift(newEsc);
    return { success: true, escalation: newEsc };
  },

  getEscalations: () => data.escalations
};
