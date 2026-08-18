// Central server for School ERP Ecosystem & XYZ AI School Assistant
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const db = require('./db');
const security = require('./security');
const nlp = require('./nlp');
const ml = require('./ml');
const rag = require('./rag');
const fs = require('fs');

// Try to initialize Gemini API if key is present
let defaultGenAI = null;
try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  if (process.env.GEMINI_API_KEY) {
    defaultGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("Default Gemini API client initialized successfully.");
  } else {
    console.log("No default GEMINI_API_KEY found in environment. Local NLP engine fallback active by default.");
  }
} catch (err) {
  console.error("Failed to load @google/generative-ai library.", err);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serving the static files for the four portals using relative workspace paths
// API-only backend for Render
// Serve a shared directory for the XYZ AI Widget assets
app.use('/shared', express.static(path.join(__dirname, 'public/shared')));

// ==================== API ENDPOINTS ====================

// 1. Core Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    let { message, role, language, history } = req.body;
    const clientKey = req.headers['x-gemini-key'];
    
    role = role || "student";
    language = language || "english";
    history = history || [];

    // Safety Step 1: Prompt Injection Check
    const injectionCheck = security.detectPromptInjection(message);
    if (injectionCheck.blocked) {
      console.log(`[Blocked] Prompt injection check failed: "${message}"`);
      return res.status(200).json({
        response: nlp.processQuery("safety_blocked", role, language).response,
        blocked: true,
        reason: injectionCheck.reason
      });
    }

    // ML Processing: Intent & Sentiment Classification
    const sentiment = ml.analyzeSentiment(message);
    const intent = ml.classifyIntent(message);
    console.log(`[ML Engine] Intent: ${intent.label} (Conf: ${intent.confidence}) | Sentiment: ${sentiment.label} (Score: ${sentiment.score})`);

    // RAG Processing: Retrieve matching documents from the Knowledge Base
    const ragResults = rag.retrieve(message, 2);
    let ragContext = "";
    if (ragResults.length > 0) {
      ragContext = "\n\nRELEVANT SCHOOL KNOWLEDGE BASE CONTEXT (RAG):\n" + 
        ragResults.map(item => `[Title: ${item.doc.title}] ${item.doc.content}`).join("\n");
      console.log(`[RAG Engine] Retrieved ${ragResults.length} matching document(s).`);
    }

    // Automatic Escalation on negative sentiment from parent/student
    if (sentiment.label === "negative" && (role === "parent" || role === "student")) {
      console.log(`[ML Action] Negative sentiment detected. Offering direct teacher callback.`);
      const localResult = nlp.processQuery("angry_escalate", role, language);
      return res.json({
        response: `[ML Sentiment: Negative Emotion Detected] ${localResult.response}`,
        actionTriggered: "escalate_offer",
        sentiment,
        intent
      });
    }

    // Role-based Context Extraction
    let roleContext = "";
    if (role === "student") {
      const s = db.getStudentById("S101");
      roleContext = `You are talking to Rahul Sharma (Student S101). His attendance is ${s.attendance}%.`;
    } else if (role === "parent") {
      const s = db.getStudentByParent("Mrs. Sharma");
      roleContext = `You are talking to Mrs. Sharma (Parent of Rahul Sharma). Rahul's attendance is ${s.attendance}%.`;
    } else if (role === "teacher") {
      roleContext = `You are talking to Teacher Mr. Kumar. He can mark attendance. Current students: ${JSON.stringify(db.getStudents().map(st => ({ name: st.name, attendance: st.attendance })))};`;
    } else if (role === "principal") {
      roleContext = `You are talking to the Principal. School-wide statistics: ${JSON.stringify(db.getAttendanceStats())}`;
    }

    // Setup active Gemini client
    let activeGenAI = null;
    if (clientKey) {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        activeGenAI = new GoogleGenerativeAI(clientKey);
      } catch (e) {
        console.error("Failed to initialize GoogleGenerativeAI with client key");
      }
    } else {
      activeGenAI = defaultGenAI;
    }

    // Use Gemini API if configured & initialized, otherwise fallback to local NLP
    if (activeGenAI && req.body.useLiveAI !== false) {
      try {
        console.log(`[Gemini API] Querying model for role: ${role}, language: ${language}`);
        
        const systemInstruction = `You are XYZ AI, a highly human-like school ERP assistant.
Your persona depends strictly on the user's role:
- Student: Friendly, motivating, supportive academic assistant.
- Parent: Caring, patient, reassuring, parent support assistant.
- Teacher: Professional, efficient teaching assistant.
- Principal/Management: Formal, analytical management assistant.

Current User Role: ${role}.
${roleContext}
${ragContext ? `\nUse the following verified school guidelines or syllabus details to answer queries (RAG Context):\n${ragContext}` : ''}

CRITICAL INSTRUCTIONS:
1. Enforce strict permissions:
   - If a student asks to view other students' attendance or mark attendance, refuse politely.
   - If a parent asks to view other children's attendance or mark attendance, refuse politely.
   - If a student or parent asks for overall school statistics, refuse politely.
   - Only Teachers can mark attendance.
   - Only Principal/Management can see overall metrics.
2. Answer in the requested language: ${language} (Write in the native script of that language, e.g. Hindi -> हिन्दी, Tamil -> தமிழ், Marathi -> मराठी, Telugu -> తెలుగు, Bengali -> বাংলা, Gujarati -> ગુજરાતી, Punjabi -> ਪੰਜਾਬੀ, Kannada -> ಕನ್ನಡ, Malayalam -> മലയാളം, Urdu -> اردو).
3. If the user is a parent or student and is unsatisfied, frustrated, or asks to speak to someone, offer a callback request or school management escalation.
4. Keep answers short, natural, conversational, and direct. Do not output raw JSON, system variables, or markdown code blocks in greetings.
5. If the user asks you to perform an action (e.g. mark attendance, escalate), say you are performing it, and the UI layer will execute it.`;

        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          systemInstruction: systemInstruction
        });

        // Map history to Gemini format
        const contents = history.map(h => ({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        }));
        
        // Add current message
        contents.push({ role: 'user', parts: [{ text: message }] });

        const result = await model.generateContent({ contents });
        let reply = result.response.text();
        
        // Safety Step 2: Response Sanitization
        reply = security.sanitizeResponse(reply);

        // Action detection in Gemini text for mock actions
        let actionTriggered = null;
        const lowerReply = reply.toLowerCase();
        
        if (role === "teacher" && (lowerReply.includes("marked") || lowerReply.includes("mark"))) {
          // Trigger mock attendance update if match found
          let name = "Rahul Sharma";
          if (message.toLowerCase().includes("priya")) name = "Priya Patel";
          if (message.toLowerCase().includes("amit")) name = "Amit Verma";
          if (message.toLowerCase().includes("sneha")) name = "Sneha Reddy";
          
          const isAbsent = message.toLowerCase().includes("absent");
          const status = isAbsent ? "Absent" : "Present";
          const date = new Date().toISOString().split('T')[0];
          db.updateAttendance(name, date, status, isAbsent ? "Medical/Unspecified" : "");
          actionTriggered = "mark_success";
        } else if ((role === "parent" || role === "student") && (lowerReply.includes("submit") || lowerReply.includes("escalat") || lowerReply.includes("request") || lowerReply.includes("callback") || lowerReply.includes("connect"))) {
          // If the model agrees to escalate, make sure it is registered in DB
          if (lowerReply.includes("success") || lowerReply.includes("done") || lowerReply.includes("sent") || lowerReply.includes("confirm")) {
            const target = (role === "parent") ? "Class Teacher" : "School Management";
            const userName = (role === "parent") ? "Mrs. Sharma" : "Rahul Sharma";
            db.createEscalation(role, userName, (role === "parent" ? "Teacher Call" : "Management Call"), "User requested escalation via live chat.");
            actionTriggered = "escalate_success";
          } else {
            actionTriggered = "escalate_offer";
          }
        }

        return res.json({ response: reply, actionTriggered });
      } catch (geminiErr) {
        console.error("Gemini API Error, falling back to local NLP:", geminiErr);
        // Fallback below
      }
    }

    // Local NLP Fallback execution powered by Multinomial Naive Bayes Intent Classification
    console.log(`[Local NLP Fallback] Routing via Naive Bayes Intent: ${intent.label}`);
    let mappedQuery = message;
    if (intent.label === 'GREET') mappedQuery = 'hello';
    else if (intent.label === 'HELP') mappedQuery = 'help';
    else if (intent.label === 'ATTENDANCE_VIEW') mappedQuery = 'attendance';
    else if (intent.label === 'ATTENDANCE_MARK') mappedQuery = 'mark absent/present';
    else if (intent.label === 'ESCALATE') mappedQuery = 'teacher';
    else if (intent.label === 'CONFIRMATION') mappedQuery = 'yes';

    const localResult = nlp.processQuery(mappedQuery, role, language);
    let finalResponse = localResult.response;
    if (ragResults.length > 0) {
      finalResponse += `\n\n[RAG Document Reference: ${ragResults[0].doc.title}] ${ragResults[0].doc.content}`;
    }

    return res.json({
      ...localResult,
      response: finalResponse,
      intent,
      sentiment,
      ragResults
    });

  } catch (err) {
    console.error("Chat endpoint error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 2. Attendance Stats API
app.get('/api/attendance', (req, res) => {
  const role = req.headers['x-user-role'];
  if (!security.validateRoleAction(role, 'view_analytics')) {
    return res.status(403).json({ error: "Access Denied: principal role required" });
  }
  return res.json(db.getAttendanceStats());
});

// 3. Mark Attendance API (Teacher-only direct submission)
app.post('/api/attendance', (req, res) => {
  const role = req.headers['x-user-role'];
  if (!security.validateRoleAction(role, 'mark_attendance')) {
    return res.status(403).json({ error: "Access Denied: teacher role required" });
  }
  
  const { studentName, date, status, reason } = req.body;
  const result = db.updateAttendance(studentName, date, status, reason);
  return res.json(result);
});

// 4. Create Escalation API
app.post('/api/escalation', (req, res) => {
  const role = req.body.role || 'parent';
  const name = req.body.name || 'Anonymous';
  const type = req.body.type || 'Teacher Call';
  const message = req.body.message || '';
  
  const result = db.createEscalation(role, name, type, message);
  return res.json(result);
});

// 5. Get Escalations API
app.get('/api/escalations', (req, res) => {
  const role = req.headers['x-user-role'];
  if (!security.validateRoleAction(role, 'view_escalations')) {
    return res.status(403).json({ error: "Access Denied: unauthorized" });
  }
  return res.json(db.getEscalations());
});

// 6. ML Prediction Endpoint: Absence Risk Predictor (Logistic Regression)
app.get('/api/predictions/:studentId', (req, res) => {
  const { studentId } = req.params;
  const student = db.getStudentById(studentId);
  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }

  // Feature x1: Calculate past absences count in the last 10 days
  const pastAbsences = student.history.filter(h => h.status === 'Absent').length;

  // Feature x2: Predict risk for the next school day (which is Monday, adjacent to weekend)
  const isWeekendAdjacent = true;

  // Feature x3: Calculate student average grades (scale: A+=98, A=95, B=85, C=75, etc.)
  let gradeSum = 0;
  let gradeCount = 0;
  const gradeWeights = { 'A+': 98, 'A': 95, 'A-': 90, 'B+': 87, 'B': 83, 'B-': 80, 'C+': 77, 'C': 73, 'C-': 70 };
  for (let key in student.grades) {
    const letter = student.grades[key];
    const score = gradeWeights[letter] || 85;
    gradeSum += score;
    gradeCount++;
  }
  const averageGrade = gradeCount > 0 ? (gradeSum / gradeCount) : 85;

  // Run ML Inference (Logistic Regression Sigmoid model)
  const probability = ml.predictAbsenceRisk(pastAbsences, isWeekendAdjacent, averageGrade);

  return res.json({
    studentId: student.id,
    studentName: student.name,
    class: student.class,
    pastAbsences,
    isWeekendAdjacent,
    averageGrade: parseFloat(averageGrade.toFixed(1)),
    absenceRisk: probability
  });
});

// 7. Get Database Dump (For UI syncing)
app.get('/api/db-dump', (req, res) => {
  return res.json({
    students: db.getStudents(),
    escalations: db.getEscalations(),
    overall: db.getOverallAttendance()
  });
});

// 8. Get RAG Knowledge Base Documents
app.get('/api/kb', (req, res) => {
  return res.json(rag.loadKB());
});

// 9. Update RAG Knowledge Base (Faculty only)
app.post('/api/kb', (req, res) => {
  const role = req.headers['x-user-role'];
  if (role !== 'teacher' && role !== 'principal' && role !== 'management' && role !== 'staff') {
    return res.status(403).json({ error: "Access Denied: Faculty permissions required" });
  }

  const newKB = req.body;
  if (!Array.isArray(newKB)) {
    return res.status(400).json({ error: "Invalid payload: expected an array of documents" });
  }

  try {
    const filePath = path.join(__dirname, 'knowledge_base.json');
    fs.writeFileSync(filePath, JSON.stringify(newKB, null, 2), 'utf8');
    console.log(`[RAG Update] Knowledge base successfully updated. Total documents: ${newKB.length}`);
    return res.json({ success: true, count: newKB.length });
  } catch (err) {
    console.error('Error writing knowledge base file:', err);
    return res.status(500).json({ error: "Failed to persist updated knowledge base" });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`XYZ AI School ERP Server running on: http://localhost:${PORT}`);
  console.log(`Portals Map:`);
  console.log(`- ERP Central Hub:    http://localhost:${PORT}/`);
  console.log(`- Student Portal:     http://localhost:${PORT}/student`);
  console.log(`- Parent Portal:       http://localhost:${PORT}/parent`);
  console.log(`- Staff (Teacher):    http://localhost:${PORT}/staff`);
  console.log(`- Management Portal:  http://localhost:${PORT}/management`);
  console.log(`==================================================`);
});
