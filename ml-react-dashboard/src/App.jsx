import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  MessageSquare, 
  Database, 
  ShieldAlert, 
  Send, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Settings, 
  User, 
  TrendingUp, 
  Calendar, 
  ArrowRight,
  RefreshCw,
  Clock,
  Sparkles,
  Info,
  BookOpen,
  Plus,
  Trash2,
  Edit,
  GraduationCap
} from 'lucide-react';

// Client-side sentiment dictionary for sandbox
const SENTIMENT_DICTIONARY = {
  "good": 1, "great": 1.5, "excellent": 2, "happy": 1.5, "satisfied": 1.5, 
  "nice": 1, "fine": 1, "wonderful": 2, "present": 0.5, "accha": 1, "bahut": 0.5,
  "bad": -1, "poor": -1.5, "unhappy": -1.5, "angry": -2, "unsatisfied": -2,
  "sad": -1, "fail": -1.5, "absent": -0.5, "complaint": -1.5, "worst": -2,
  "wrong": -1.5, "error": -1, "terrible": -2, "disappointed": -2, "unfit": -1,
  "bimar": -1, "gairhazir": -1, "gussa": -2, "kharab": -1.5
};

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [userRole, setUserRole] = useState('student'); // 'student' or 'faculty'

  // --- 1. CHAT & RAG STATES ---
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: 'assistant', text: 'Hello! I am your RAG-assisted School Assistant. Ask me anything about school guidelines, syllabus, attendance policy, or schedules.', timestamp: new Date() }
  ]);
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [useLiveAI, setUseLiveAI] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [lastRequestJson, setLastRequestJson] = useState(null);
  const [lastResponseJson, setLastResponseJson] = useState(null);
  const [retrievedDocs, setRetrievedDocs] = useState([]); // Visual RAG indicator

  // --- 2. ERP / STUDENTS STATES ---
  const [students, setStudents] = useState([]);
  const [activeStudentId, setActiveStudentId] = useState('S101');
  const [escalations, setEscalations] = useState([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentPrediction, setStudentPrediction] = useState(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    studentName: 'Rahul Sharma',
    date: new Date().toISOString().split('T')[0],
    status: 'Present',
    reason: ''
  });

  // --- 3. RAG KNOWLEDGE BASE EDITOR STATES ---
  const [kbDocs, setKbDocs] = useState([]);
  const [isLoadingKb, setIsLoadingKb] = useState(false);
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [docForm, setDocForm] = useState({
    id: '',
    title: '',
    category: 'Policy',
    content: ''
  });

  // --- 4. SANDBOX STATES ---
  const [intentText, setIntentText] = useState('What happens if attendance is under 75%?');
  const [intentResult, setIntentResult] = useState(null);
  const [isIntentLoading, setIsIntentLoading] = useState(false);
  const [sentimentText, setSentimentText] = useState('Rahul is doing great and we are happy with school');
  const [simAbsences, setSimAbsences] = useState(3);
  const [simWeekend, setSimWeekend] = useState(true);
  const [simGrade, setSimGrade] = useState(85);

  // --- 5. SECURITY LOGS ---
  const [securityLogs, setSecurityLogs] = useState([
    {
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString(),
      type: 'Response scrubbed',
      details: 'Scrubbed outbound text. Replaced mock key with [REDACTED_CONFIG]',
      severity: 'Low'
    },
    {
      timestamp: new Date(Date.now() - 1800000).toLocaleTimeString(),
      type: 'Prompt Injection Check',
      details: 'Evaluated user message: "What is my attendance". Safe, allowed.',
      severity: 'Info'
    }
  ]);

  const [currentMinutes, setCurrentMinutes] = useState(
    new Date().getHours() * 60 + new Date().getMinutes()
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 10000); // Update every 10 seconds for real-time responsiveness
    return () => clearInterval(timer);
  }, []);

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    fetchDbData();
    fetchKbData();
    runIntentClassification(intentText);
  }, []);

  const fetchDbData = async () => {
    setIsLoadingDb(true);
    try {
      const res = await fetch('/api/db-dump');
      const data = await res.json();
      setStudents(data.students || []);
      setEscalations(data.escalations || []);
    } catch (err) {
      console.error('Error fetching ERP DB dump:', err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  const fetchKbData = async () => {
    setIsLoadingKb(true);
    try {
      const res = await fetch('/api/kb');
      const data = await res.json();
      setKbDocs(data || []);
    } catch (err) {
      console.error('Error fetching Knowledge Base:', err);
    } finally {
      setIsLoadingKb(false);
    }
  };

  // --- CHAT SUBMIT & RAG MATCHING ---
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'user', text: chatInput, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    const headers = { 'Content-Type': 'application/json' };
    if (geminiApiKey) {
      headers['x-gemini-key'] = geminiApiKey;
    }

    const requestBody = {
      message: chatInput,
      role: userRole === 'student' ? 'student' : 'teacher', // Student role uses supporting agent, Faculty role uses teacher
      language: selectedLanguage,
      history: chatHistory.slice(-5).map(h => ({ sender: h.sender, text: h.text })),
      useLiveAI: useLiveAI
    };

    setLastRequestJson(requestBody);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
      const data = await res.json();
      setLastResponseJson(data);

      // Record visual RAG matched documents
      if (data.ragResults) {
        setRetrievedDocs(data.ragResults);
      } else {
        setRetrievedDocs([]);
      }

      // Add to security audits log
      if (data.blocked) {
        setSecurityLogs(prev => [
          {
            timestamp: new Date().toLocaleTimeString(),
            type: 'Prompt Injection Blocked',
            details: `Query blocked: "${chatInput}". Reason: ${data.reason || 'Security threat detected'}`,
            severity: 'High'
          },
          ...prev
        ]);
      } else {
        setSecurityLogs(prev => [
          {
            timestamp: new Date().toLocaleTimeString(),
            type: 'RAG Context Check',
            details: `Query: "${chatInput}". Matches found: ${data.ragResults?.length || 0} document(s).`,
            severity: 'Info'
          },
          ...prev
        ]);
      }

      const assistantMsg = {
        sender: 'assistant',
        text: data.response || 'No response returned.',
        timestamp: new Date(),
        actionTriggered: data.actionTriggered
      };

      setChatHistory(prev => [...prev, assistantMsg]);

      if (data.actionTriggered) {
        fetchDbData();
      }

    } catch (err) {
      console.error('Error during chat request:', err);
      setChatHistory(prev => [
        ...prev,
        { sender: 'assistant', text: 'Sorry, I encountered an error connecting to the API. Make sure the Node server is running.', timestamp: new Date() }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- KNOWLEDGE BASE CRUD OPERATIONS ---
  const handleSaveDoc = async (e) => {
    e.preventDefault();
    if (!docForm.title || !docForm.content) {
      alert('Please fill out all fields');
      return;
    }

    let updatedDocs = [...kbDocs];
    if (isEditingDoc) {
      updatedDocs = updatedDocs.map(d => d.id === docForm.id ? docForm : d);
    } else {
      const newDoc = {
        ...docForm,
        id: `doc_${docForm.category.toLowerCase()}_${Date.now()}`
      };
      updatedDocs.push(newDoc);
    }

    try {
      const res = await fetch('/api/kb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'teacher' // Verify as teacher (faculty role)
        },
        body: JSON.stringify(updatedDocs)
      });
      const data = await res.json();
      if (data.success) {
        alert('School Knowledge Base successfully updated!');
        setKbDocs(updatedDocs);
        setIsEditingDoc(false);
        setDocForm({ id: '', title: '', category: 'Policy', content: '' });
        setSecurityLogs(prev => [
          {
            timestamp: new Date().toLocaleTimeString(),
            type: 'Knowledge Base Write',
            details: `Faculty updated document: "${docForm.title}". Index rebuilt.`,
            severity: 'Medium'
          },
          ...prev
        ]);
      } else {
        alert(`Error: ${data.error || 'Failed to save document'}`);
      }
    } catch (err) {
      console.error('Error saving KB document:', err);
      alert('Failed to save document.');
    }
  };

  const handleDeleteDoc = async (id, title) => {
    if (!confirm(`Are you sure you want to delete "${title}" from the School Knowledge Base?`)) return;

    const updatedDocs = kbDocs.filter(d => d.id !== id);

    try {
      const res = await fetch('/api/kb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'teacher'
        },
        body: JSON.stringify(updatedDocs)
      });
      const data = await res.json();
      if (data.success) {
        alert('Document deleted and search index updated.');
        setKbDocs(updatedDocs);
        setSecurityLogs(prev => [
          {
            timestamp: new Date().toLocaleTimeString(),
            type: 'Knowledge Base Delete',
            details: `Faculty deleted document: "${title}". Index rebuilt.`,
            severity: 'Medium'
          },
          ...prev
        ]);
      }
    } catch (err) {
      console.error('Error deleting KB document:', err);
    }
  };

  const handleEditDocInit = (doc) => {
    setDocForm(doc);
    setIsEditingDoc(true);
  };

  // --- MANUAL ATTENDANCE SUBMIT ---
  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'teacher'
        },
        body: JSON.stringify(attendanceForm)
      });
      const result = await res.json();
      if (result.success) {
        alert(`Attendance updated successfully for ${attendanceForm.studentName}!`);
        setIsMarkingAttendance(false);
        fetchDbData(); // Reload student roster
        setSecurityLogs(prev => [
          {
            timestamp: new Date().toLocaleTimeString(),
            type: 'Manual DB Write',
            details: `Faculty updated ${attendanceForm.studentName} roster: ${attendanceForm.status}`,
            severity: 'Medium'
          },
          ...prev
        ]);
      }
    } catch (err) {
      console.error('Error submitting attendance:', err);
    }
  };

  const handleOpenStudentModal = async (student) => {
    setSelectedStudent(student);
    setIsLoadingPrediction(true);
    try {
      const res = await fetch(`/api/predictions/${student.id}`);
      const data = await res.json();
      setStudentPrediction(data);
    } catch (err) {
      console.error('Error fetching risk prediction:', err);
    } finally {
      setIsLoadingPrediction(false);
    }
  };

  // --- SANDBOX LOGIC ---
  const runIntentClassification = async (text) => {
    if (!text.trim()) return;
    setIsIntentLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, role: 'student', useLiveAI: false })
      });
      const data = await res.json();
      if (data.intent) {
        setIntentResult(data.intent);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsIntentLoading(false);
    }
  };

  const analyzeSentimentLocal = (text) => {
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    const tokens = cleanText.split(/\s+/).filter(w => w.length > 0);
    let score = 0;
    let matchCount = 0;
    
    const highlightedWords = tokens.map((token, idx) => {
      let sentimentType = 'neutral';
      if (SENTIMENT_DICTIONARY[token] !== undefined) {
        score += SENTIMENT_DICTIONARY[token];
        sentimentType = SENTIMENT_DICTIONARY[token] > 0 ? 'pos' : 'neg';
        matchCount++;
      }
      return { word: token, type: sentimentType, id: idx };
    });

    let label = 'neutral';
    if (score > 0.2) label = 'positive';
    else if (score < -0.2) label = 'negative';

    return { score, label, matchCount, highlightedWords };
  };

  const sentimentResultLocal = analyzeSentimentLocal(sentimentText);

  const calculateLocalAbsenceRisk = () => {
    const x1 = simAbsences;
    const x2 = simWeekend ? 1 : 0;
    const x3 = simGrade / 100;
    
    const z = (0.55 * x1) + (0.40 * x2) + (-1.2 * x3) - 0.95;
    const probability = 1 / (1 + Math.exp(-z));
    return {
      z: parseFloat(z.toFixed(4)),
      probability: parseFloat((probability * 100).toFixed(1))
    };
  };

  const localRisk = calculateLocalAbsenceRisk();

  const getActiveStudentRisk = (student) => {
    if (!student || !student.history) return { probability: 0, z: 0, absences: 0, averageGrade: 85 };
    const absences = student.history.filter(h => h.status === 'Absent').length;
    const isWeekendAdjacent = true; // Match backend assumption
    
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
    const normalizedGrade = averageGrade / 100;
    
    const z = (0.55 * absences) + (0.40 * (isWeekendAdjacent ? 1 : 0)) + (-1.2 * normalizedGrade) - 0.95;
    const probability = 1 / (1 + Math.exp(-z));
    return {
      z: parseFloat(z.toFixed(4)),
      probability: parseFloat((probability * 100).toFixed(1)),
      averageGrade: parseFloat(averageGrade.toFixed(1)),
      absences
    };
  };

  const activeStudent = students.find(s => s.id === activeStudentId) || students[0] || {};
  const activeStudentRisk = getActiveStudentRisk(activeStudent);

  return (
    <div className="app-container">
      {/* Header section */}
      <header className="app-header">
        <div className="logo-section">
          <h1 className="logo-title">
            <GraduationCap size={28} className="text-primary" />
            <span>XYZ AI</span> Professional ERP Portal
          </h1>
          <p className="logo-sub">Retrieval-Augmented Generation (RAG) & Machine Learning Ecosystem</p>
        </div>
        
        {/* Unified Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', textAlign: 'right' }}>Active Portal Profile</label>
            <select 
              className="form-select" 
              style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 600, borderColor: 'var(--color-primary)' }}
              value={userRole}
              onChange={(e) => {
                setUserRole(e.target.value);
                setChatHistory([{ sender: 'assistant', text: `Hello! I am your RAG-assisted assistant configured for the ${e.target.value.toUpperCase()} portal. How can I help you today?`, timestamp: new Date() }]);
                setRetrievedDocs([]);
              }}
            >
              <option value="student">Student Portal (Rahul Sharma)</option>
              <option value="faculty">Faculty/Staff Portal (Teacher Mr. Kumar)</option>
            </select>
          </div>
          <div className="developer-badge">
            <span className="badge-name">Palak Verma</span>
            <span className="badge-role">ML & Software Engineering Intern</span>
            <span className="badge-contact">palakverma461@gmail.com</span>
          </div>
        </div>
      </header>

      {/* Tabs navigation */}
      <nav className="tabs-navigation">
        <button 
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={16} />
          RAG AI Assistant
        </button>
        {userRole === 'student' ? (
          <button 
            className={`tab-btn ${activeTab === 'student-dash' ? 'active' : ''}`}
            onClick={() => setActiveTab('student-dash')}
          >
            <User size={16} />
            Student Dashboard
          </button>
        ) : (
          <button 
            className={`tab-btn ${activeTab === 'faculty-dash' ? 'active' : ''}`}
            onClick={() => { setActiveTab('faculty-dash'); fetchKbData(); }}
          >
            <BookOpen size={16} />
            Faculty Controls
          </button>
        )}
        <button 
          className={`tab-btn ${activeTab === 'sandbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('sandbox')}
        >
          <Brain size={16} />
          ML Sandbox
        </button>
        <button 
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <ShieldAlert size={16} />
          Safety & Security Audits
        </button>
      </nav>

      {/* MAIN LAYOUT GRID */}
      <div className="dashboard-grid">
        
        {/* ==================== TAB 1: RAG CHAT BOT ==================== */}
        {activeTab === 'chat' && (
          <>
            {/* RAG Context Panel (Displays what information was searched) */}
            <div className="card grid-col-4">
              <div className="card-header">
                <h2 className="card-title">
                  <Database size={18} className="text-primary" />
                  RAG Document Retrieval Inspector
                </h2>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p className="logo-sub" style={{ fontSize: '12px' }}>
                  When you send a message, the server uses a TF-IDF index to search the school policies and syllabus database, appending the most relevant sections directly into the AI's instruction context.
                </p>

                <div className="escalations-list" style={{ flex: 1, overflowY: 'auto', maxHeight: '380px' }}>
                  {retrievedDocs.length === 0 ? (
                    <div className="empty-log-state" style={{ padding: '24px 12px' }}>
                      <Info size={24} style={{ marginBottom: '8px', color: 'var(--color-text-muted)' }} />
                      No document matched yet. Ask about school rules, Saturday classes, or Class 10 Math syllabus.
                    </div>
                  ) : (
                    retrievedDocs.map((item, i) => (
                      <div className="escalation-item" style={{ borderLeft: '3px solid var(--color-success)' }} key={i}>
                        <div className="esc-header">
                          <span className="esc-badge teacher">{item.doc.category}</span>
                          <span className="esc-time">Relevance Score: {item.score}</span>
                        </div>
                        <h4 style={{ fontSize: '13px', margin: '4px 0', fontFamily: 'var(--font-heading)' }}>{item.doc.title}</h4>
                        <div className="esc-msg" style={{ fontSize: '12px', lineHeight: '1.4', fontStyle: 'normal', color: 'var(--color-text-secondary)' }}>
                          "{item.doc.content}"
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-primary)', marginTop: '4px' }}>
                          Matched keywords: {item.matchedTerms.join(', ')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Main Chat Hub UI */}
            <div className="card grid-col-8">
              <div className="chat-container">
                <div className="chat-main">
                  {/* Persona configuration bar */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '16px', backgroundColor: 'var(--bg-card-header)', alignItems: 'center' }}>
                    <span className="tag-badge info" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                      Persona: {userRole === 'student' ? 'Student Academic Help' : 'Professional Faculty Assistant'}
                    </span>
                    
                    <div className="form-group" style={{ margin: 0 }}>
                      <select 
                        className="form-select" 
                        style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                      >
                        <option value="english">English</option>
                        <option value="hindi">Hindi (हिन्दी)</option>
                        <option value="tamil">Tamil (தமிழ்)</option>
                        <option value="telugu">Telugu (తెలుగు)</option>
                        <option value="marathi">Marathi (மराठी)</option>
                        <option value="bengali">Bengali (বাংলা)</option>
                        <option value="gujarati">Gujarati (ગુજરાતી)</option>
                        <option value="punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
                        <option value="kannada">Kannada (ಕನ್ನಡ)</option>
                        <option value="malayalam">Malayalam (മലയാളம்)</option>
                        <option value="urdu">Urdu (اردو)</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input 
                        type="checkbox" 
                        id="gemini-toggle"
                        checked={useLiveAI}
                        onChange={(e) => setUseLiveAI(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <label htmlFor="gemini-toggle" className="form-label" style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                        <Sparkles size={11} className="text-warning" /> Live Gemini AI
                      </label>
                    </div>
                  </div>

                  {useLiveAI && (
                    <div style={{ padding: '8px 16px', backgroundColor: 'rgba(255, 179, 0, 0.06)', borderBottom: '1px solid rgba(255,179,0,0.15)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span className="logo-sub" style={{ margin: 0, fontSize: '11px', color: 'var(--color-warning)' }}>
                        API Key:
                      </span>
                      <input 
                        type="password" 
                        placeholder="Paste Google Gemini API Key..." 
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '11px', height: '24px', flex: 1, maxWidth: '240px' }}
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                      />
                      <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }} onClick={handleSaveApiKey}>
                        Save
                      </button>
                    </div>
                  )}

                  {/* Message History */}
                  <div className="chat-history" style={{ height: '360px' }}>
                    {chatHistory.map((msg, idx) => (
                      <React.Fragment key={idx}>
                        <div className={`chat-message ${msg.sender}`}>
                          {msg.text}
                        </div>
                        {msg.actionTriggered && (
                          <div className="chat-message system-action">
                            <CheckCircle2 size={12} /> System Update: [ {msg.actionTriggered} ]
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                    {isChatLoading && (
                      <div className="chat-message assistant" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={14} className="animate-spin" /> Retrieving context & generating answer...
                      </div>
                    )}
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleSendChatMessage} className="chat-input-bar">
                    <input 
                      type="text" 
                      className="chat-input"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={userRole === 'student' ? "Ask about syllabus, Saturday school timing, exam policies..." : "Type request (e.g. 'Mark Rahul absent today')..."}
                      disabled={isChatLoading}
                    />
                    <button type="submit" className="btn btn-primary" disabled={isChatLoading}>
                      <Send size={14} /> Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB 2: STUDENT DASHBOARD ==================== */}
        {activeTab === 'student-dash' && userRole === 'student' && (
          <>
            {/* Student Selector Menu */}
            <div className="card grid-col-12" style={{ gridColumn: 'span 12', marginBottom: '16px' }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <GraduationCap size={20} className="text-primary" />
                  <span className="form-label" style={{ margin: 0, fontWeight: 600 }}>Active Student Profile Selector:</span>
                </div>
                <select 
                  className="form-select" 
                  style={{ maxWidth: '320px', padding: '6px 12px', fontSize: '13px', fontWeight: 600, borderColor: 'var(--color-primary)' }}
                  value={activeStudentId}
                  onChange={(e) => setActiveStudentId(e.target.value)}
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Roll ID: {s.id} - {s.class})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student Profile Overview */}
            <div className="card grid-col-8">
              <div className="card-header">
                <h2 className="card-title">
                  <User size={20} className="text-primary" />
                  Student Academic Profile: {activeStudent.name || 'Rahul Sharma'}
                </h2>
                <span className="tag-badge info">{activeStudent.class || 'Class 10-A'}</span>
              </div>
              <div className="card-body">
                <div style={{ marginBottom: '24px' }}>
                  <div className="grid-2col" style={{ marginBottom: '16px' }}>
                    <div className="math-explanation">
                      <span className="form-label">Parent Representative:</span>
                      <strong>{activeStudent.parentName || 'Mrs. Sharma'} ({activeStudent.parentUser || 'mrs_sharma'})</strong>
                    </div>
                    <div className="math-explanation">
                      <span className="form-label">Overall Attendance:</span>
                      <strong className={`status-indicator ${activeStudent.attendance >= 90 ? 'success' : (activeStudent.attendance >= 85 ? 'warning' : 'danger')}`}>
                        {activeStudent.attendance || 0}%
                      </strong>
                    </div>
                  </div>

                  <h3 className="form-label" style={{ fontSize: '14px', marginBottom: '10px' }}>Current Academic Grades</h3>
                  <div className="grid-2col">
                    {activeStudent.grades ? Object.keys(activeStudent.grades).map(subject => (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--border-color)' }} key={subject}>
                        <span>{subject}</span>
                        <strong>{activeStudent.grades[subject]}</strong>
                      </div>
                    )) : (
                      <div className="logo-sub">No grade logs available.</div>
                    )}
                  </div>
                </div>

                <h3 className="form-label" style={{ fontSize: '14px', marginBottom: '10px' }}>Weekly Attendance Log</h3>
                <div className="erp-table-container">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Excused Reason / Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStudent.history && activeStudent.history.length > 0 ? (
                        activeStudent.history.map((day, i) => (
                          <tr key={i}>
                            <td>{day.date}</td>
                            <td>
                              <span className={`status-indicator ${day.status === 'Present' ? 'success' : 'danger'}`}>
                                {day.status}
                              </span>
                            </td>
                            <td>{day.reason || 'Regular Attendance'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" style={{ textAlign: 'center' }} className="logo-sub">No attendance records.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Sidebar Stack */}
            <div className="grid-col-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px', gridColumn: 'span 4' }}>
              {/* Attendance Risk Dial */}
              <div className="card" style={{ width: '100%' }}>
                <div className="card-header">
                  <h2 className="card-title">
                    <TrendingUp size={18} className="text-primary" />
                    Attendance Risk Analysis
                  </h2>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="gauge-container" style={{ margin: '12px auto' }}>
                    <svg className="gauge-svg" viewBox="0 0 100 100">
                      <circle className="gauge-track" cx="50" cy="50" r="40" />
                      <circle 
                        className={`gauge-fill ${activeStudentRisk.probability < 30 ? 'low' : (activeStudentRisk.probability < 70 ? 'medium' : 'high')}`}
                        cx="50" 
                        cy="50" 
                        r="40" 
                        strokeDasharray={`${(activeStudentRisk.probability * 251.2) / 100} 251.2`}
                      />
                    </svg>
                    <div className="gauge-text">
                      <div className="gauge-percent">{activeStudentRisk.probability}%</div>
                      <div className="gauge-label">Absence Risk</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <div className={`status-indicator ${activeStudentRisk.probability < 30 ? 'success' : (activeStudentRisk.probability < 70 ? 'warning' : 'danger')}`}>
                      {activeStudentRisk.probability < 30 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      {activeStudentRisk.probability < 30 ? 'Regular attendance profile' : (activeStudentRisk.probability < 70 ? 'Requires attention' : 'High absenteeism alert')}
                    </div>
                    <p className="logo-sub" style={{ fontSize: '11px', marginTop: '8px', lineHeight: '1.4' }}>
                      * {activeStudent.name}'s current record shows {activeStudent.attendance}% attendance and average grade {activeStudentRisk.averageGrade}%. The ML logit algorithm predicts a {activeStudentRisk.probability}% risk.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Class Schedule Panel */}
              <div className="card" style={{ width: '100%' }}>
                <div className="card-header">
                  <h2 className="card-title">
                    <Calendar size={18} className="text-primary" />
                    Today's Live Schedule
                  </h2>
                </div>
                <div className="card-body">
                  <div className="timeline">
                    {[
                      { time: "09:00 AM", title: "Mathematics (Algebra)", room: "Room 302 • Mr. Kumar", start: 540, end: 630 },
                      { time: "10:30 AM", title: "Science (Physics)", room: "Physics Lab • Mrs. Gupta", start: 630, end: 720 },
                      { time: "12:00 PM", title: "English Literature", room: "Room 101 • Miss Andrews", start: 720, end: 780 },
                      { time: "01:00 PM", title: "Lunch Break", room: "School Cafeteria", start: 780, end: 840 }
                    ].map((cls, idx) => {
                      const isActive = (currentMinutes >= cls.start && currentMinutes < cls.end) || (currentMinutes < 540 && idx === 0);
                      return (
                        <div className={`timeline-item ${isActive ? 'active' : ''}`} key={idx} style={{ 
                          borderLeft: isActive ? '3px solid var(--color-primary)' : '2px solid var(--border-color)',
                          paddingLeft: '16px',
                          paddingBottom: '16px',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            position: 'absolute',
                            left: '-6px',
                            top: '6px',
                            boxShadow: isActive ? '0 0 8px var(--color-primary)' : 'none'
                          }} />
                          <span className="time" style={{ fontSize: '11px', color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 'bold' }}>{cls.time}</span>
                          <div className="class-info" style={{ marginTop: '4px' }}>
                            <span className="class-title" style={{ fontSize: '13px', fontWeight: 600, display: 'block', color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>{cls.title}</span>
                            <span className="class-room" style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>{cls.room}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB 3: FACULTY PANEL CONTROLS ==================== */}
        {activeTab === 'faculty-dash' && userRole === 'faculty' && (
          <>
            {/* Student Database & Roster updates */}
            <div className="card grid-col-8">
              <div className="card-header">
                <h2 className="card-title">
                  <Database size={20} className="text-primary" />
                  Student Directory & Live ML Risk Analysis
                </h2>
                <div className="flex-gap-12">
                  <button onClick={fetchDbData} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    <RefreshCw size={12} /> Sync Directory
                  </button>
                  <button 
                    onClick={() => setIsMarkingAttendance(true)} 
                    className="btn btn-primary" 
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    <UserCheck size={12} /> Mark Attendance
                  </button>
                </div>
              </div>

              <div className="card-body">
                <div className="erp-table-container">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th>Attendance %</th>
                        <th>Absence Risk (ML)</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => {
                        // Calculate simple color coding for risk predictions
                        // Under ideal records risk is low, under higher absences risk is warning/danger
                        const absCount = s.history.filter(h => h.status === 'Absent').length;
                        return (
                          <tr key={s.id}>
                            <td><strong>{s.id}</strong></td>
                            <td>{s.name}</td>
                            <td>{s.class}</td>
                            <td>
                              <span className={`status-indicator ${s.attendance >= 90 ? 'success' : (s.attendance >= 85 ? 'warning' : 'danger')}`}>
                                {s.attendance}%
                              </span>
                            </td>
                            <td>
                              <span className={`tag-badge ${absCount > 2 ? 'tag-badge info' : 'tag-badge info'}`} style={{ backgroundColor: absCount > 2 ? 'var(--color-danger-light)' : 'var(--color-success-light)', color: absCount > 2 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 'bold' }}>
                                {absCount > 2 ? 'High Risk' : 'Low Risk'}
                              </span>
                            </td>
                            <td>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                onClick={() => handleOpenStudentModal(s)}
                              >
                                View ML Profile
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* School Escalations Tickets log */}
            <div className="card grid-col-4">
              <div className="card-header">
                <h2 className="card-title">
                  <Clock size={18} className="text-primary" />
                  Support Tickets Log
                </h2>
              </div>
              <div className="card-body">
                <div className="escalations-list">
                  {escalations.length === 0 ? (
                    <div className="logo-sub">No escalation tickets logged.</div>
                  ) : (
                    escalations.map((esc, i) => (
                      <div className="escalation-item" key={i}>
                        <div className="esc-header">
                          <span className={`esc-badge ${esc.type === 'Teacher Call' ? 'teacher' : 'mgmt'}`}>
                            {esc.type}
                          </span>
                          <span className="esc-time">
                            {new Date(esc.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="esc-msg">"{esc.message}"</div>
                        <div className="esc-footer">
                          For: <strong>{esc.userName}</strong> ({esc.userRole})
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RAG Knowledge Base CRUD Editor (Editable Policies & Syllabus) */}
            <div className="card grid-col-12" style={{ marginTop: '24px' }}>
              <div className="card-header">
                <h2 className="card-title">
                  <BookOpen size={20} className="text-primary" />
                  Knowledge Base Content Editor (RAG Settings Manager)
                </h2>
                <span className="tag-badge info">Control RAG Context</span>
              </div>

              <div className="card-body">
                <div className="risk-predictor-layout">
                  {/* Left Column: List documents */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="flex-between">
                      <span className="form-label">Total Seed Documents: {kbDocs.length}</span>
                      <button 
                        onClick={() => {
                          setIsEditingDoc(false);
                          setDocForm({ id: '', title: '', category: 'Policy', content: '' });
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        <Plus size={12} /> Add New Article
                      </button>
                    </div>

                    <div className="escalations-list" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                      {isLoadingKb ? (
                        <p className="logo-sub">Querying documents list...</p>
                      ) : (
                        kbDocs.map(doc => (
                          <div className="escalation-item" key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <div className="esc-header">
                                <span className="esc-badge mgmt">{doc.category}</span>
                              </div>
                              <strong style={{ fontSize: '13px', display: 'block', margin: '4px 0' }}>{doc.title}</strong>
                              <p className="logo-sub" style={{ fontSize: '11px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {doc.content}
                              </p>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button 
                                className="btn btn-secondary"
                                style={{ padding: '4px', borderRadius: '4px' }}
                                onClick={() => handleEditDocInit(doc)}
                                title="Edit Document"
                              >
                                <Edit size={12} />
                              </button>
                              <button 
                                className="btn btn-secondary"
                                style={{ padding: '4px', borderRadius: '4px', color: 'var(--color-danger)' }}
                                onClick={() => handleDeleteDoc(doc.id, doc.title)}
                                title="Delete Document"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Column: Add/Edit Form */}
                  <form onSubmit={handleSaveDoc} style={{ width: '380px', backgroundColor: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
                    <h3 className="form-label" style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--color-primary)' }}>
                      {isEditingDoc ? '✏️ Edit Article' : '➕ Create New Article'}
                    </h3>

                    <div className="form-group">
                      <label className="form-label">Article Title</label>
                      <input 
                        type="text"
                        className="form-input"
                        placeholder="e.g. Exam Grading Scale"
                        value={docForm.title}
                        onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select 
                        className="form-select"
                        value={docForm.category}
                        onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                      >
                        <option value="Policy">Academic Policy</option>
                        <option value="Syllabus">Subject Syllabus</option>
                        <option value="FAQ">FAQ & Calendars</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Article Text Content</label>
                      <textarea 
                        className="form-textarea"
                        placeholder="Enter full rules, policy descriptions, or curriculum details..."
                        value={docForm.content}
                        onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
                        style={{ minHeight: '120px' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                      {isEditingDoc && (
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => {
                            setIsEditingDoc(false);
                            setDocForm({ id: '', title: '', category: 'Policy', content: '' });
                          }}
                        >
                          Cancel
                        </button>
                      )}
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        {isEditingDoc ? 'Save Updates' : 'Add Document'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB 4: ML PLAYGROUND SANDBOX ==================== */}
        {activeTab === 'sandbox' && (
          <>
            {/* Multinomial Naive Bayes Intent Classifier */}
            <div className="card grid-col-6">
              <div className="card-header">
                <h2 className="card-title">
                  <Brain size={20} className="text-primary" />
                  Multinomial Naive Bayes Intent Classifier
                </h2>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Type a student or parent support query:</label>
                  <textarea 
                    className="form-textarea"
                    value={intentText}
                    onChange={(e) => {
                      setIntentText(e.target.value);
                      runIntentClassification(e.target.value);
                    }}
                    placeholder="Type here to classify NLP intent..."
                  />
                </div>
                
                {isIntentLoading ? (
                  <div className="flex-between">
                    <span className="logo-sub">Classifying intent...</span>
                    <RefreshCw size={16} className="animate-spin text-muted" />
                  </div>
                ) : intentResult ? (
                  <div>
                    <div className="flex-between" style={{ marginBottom: '14px' }}>
                      <span className="form-label">Predicted Intent:</span>
                      <strong className="status-indicator success">{intentResult.label}</strong>
                    </div>
                    <div className="flex-between" style={{ marginBottom: '14px' }}>
                      <span className="form-label">Classification Confidence:</span>
                      <span className="range-val">{Math.round(intentResult.confidence * 100)}%</span>
                    </div>

                    <div className="nb-chart">
                      {intentResult.allScores && Object.keys(intentResult.allScores).map(lbl => {
                        const score = intentResult.allScores[lbl];
                        const maxScore = Math.max(...Object.values(intentResult.allScores));
                        const expVal = Math.exp(score - maxScore);
                        const sumExp = Object.values(intentResult.allScores).reduce((acc, curr) => acc + Math.exp(curr - maxScore), 0);
                        const weightPct = Math.round((expVal / sumExp) * 100);

                        return (
                          <div className="nb-row" key={lbl}>
                            <div className="nb-row-header">
                              <span className="nb-label">{lbl.replace('_', ' ')}</span>
                              <span className="nb-score">{weightPct}%</span>
                            </div>
                            <div className="nb-bar-container">
                              <div 
                                className={`nb-bar ${lbl === intentResult.label ? 'highest' : ''}`}
                                style={{ width: `${weightPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="logo-sub">Start typing above to classify</p>
                )}
              </div>
            </div>

            {/* Sentiment Lexicon match */}
            <div className="card grid-col-6">
              <div className="card-header">
                <h2 className="card-title">
                  <Brain size={20} className="text-primary" />
                  Lexicon Sentiment Analyzer
                </h2>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Type parent/student message to evaluate emotion:</label>
                  <textarea 
                    className="form-textarea"
                    value={sentimentText}
                    onChange={(e) => setSentimentText(e.target.value)}
                    placeholder="Type to run sentiment lexicon matches..."
                  />
                </div>

                <div className={`sentiment-display ${sentimentResultLocal.label}`}>
                  <div>
                    <span className={`sentiment-badge ${sentimentResultLocal.label}`}>
                      {sentimentResultLocal.label}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      Lexicon Emotion Score: <strong>{sentimentResultLocal.score.toFixed(2)}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      Total Sentiment Keyword Matches: {sentimentResultLocal.matchCount}
                    </div>
                  </div>
                </div>

                <div className="form-label" style={{ marginBottom: '8px' }}>Visual Highlight Token Stream:</div>
                <div className="highlight-box">
                  {sentimentResultLocal.highlightedWords.length > 0 ? (
                    sentimentResultLocal.highlightedWords.map((item) => (
                      <span key={item.id} className={`token-word ${item.type}`}>
                        {item.word}
                      </span>
                    ))
                  ) : (
                    <span className="logo-sub">No words typed...</span>
                  )}
                </div>
              </div>
            </div>

            {/* Logistic Regression Simulator */}
            <div className="card grid-col-12">
              <div className="card-header">
                <h2 className="card-title">
                  <TrendingUp size={20} className="text-primary" />
                  Logistic Regression Risk Equation Simulator
                </h2>
              </div>
              <div className="card-body">
                <div className="risk-predictor-layout">
                  <div className="risk-inputs">
                    <div className="form-group">
                      <label className="form-label">Absences count</label>
                      <div className="range-slider">
                        <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          value={simAbsences}
                          onChange={(e) => setSimAbsences(parseInt(e.target.value))}
                        />
                        <span className="range-val">{simAbsences}</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Is adjacent to weekend (Mon/Fri)
                        <input 
                          type="checkbox" 
                          checked={simWeekend} 
                          onChange={(e) => setSimWeekend(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Normalized Grade Score</label>
                      <div className="range-slider">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={simGrade}
                          onChange={(e) => setSimGrade(parseInt(e.target.value))}
                        />
                        <span className="range-val">{simGrade}%</span>
                      </div>
                    </div>

                    <div className="math-explanation">
                      <div className="math-formula">
                        Equation: z = 0.55 &middot; Absences + 0.40 &middot; WeekendAdjacent - 1.2 &middot; (Grade/100) - 0.95
                      </div>
                      <div className="math-formula">
                        Probability P = 1 / (1 + e^-z) = 1 / (1 + e^-({localRisk.z}))
                      </div>
                      <div className="math-vars">
                        Calculated Logit Score (z): <strong>{localRisk.z}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="risk-visualizer">
                    <div className="gauge-container">
                      <svg className="gauge-svg" viewBox="0 0 100 100">
                        <circle className="gauge-track" cx="50" cy="50" r="40" />
                        <circle 
                          className={`gauge-fill ${localRisk.probability < 30 ? 'low' : (localRisk.probability < 70 ? 'medium' : 'high')}`}
                          cx="50" 
                          cy="50" 
                          r="40" 
                          strokeDasharray={`${(localRisk.probability * 251.2) / 100} 251.2`}
                        />
                      </svg>
                      <div className="gauge-text">
                        <div className="gauge-percent">{localRisk.probability}%</div>
                        <div className="gauge-label">Absence Risk</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB 5: SECURITY AUDITS ==================== */}
        {activeTab === 'security' && (
          <div className="card grid-col-12">
            <div className="card-header">
              <h2 className="card-title">
                <ShieldAlert size={20} className="text-danger" />
                Active Protection layer Security logs
              </h2>
            </div>
            <div className="card-body">
              <div className="erp-table-container">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Protection Audit Type</th>
                      <th>Details</th>
                      <th>Threat Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityLogs.map((log, i) => (
                      <tr key={i}>
                        <td>{log.timestamp}</td>
                        <td><strong>{log.type}</strong></td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{log.details}</td>
                        <td>
                          <span className={`status-indicator ${log.severity === 'High' ? 'danger' : (log.severity === 'Medium' ? 'warning' : 'success')}`}>
                            {log.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================== MODAL 1: STUDENT PROFILE ML DETAILS ==================== */}
      {selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <h2 className="card-title">
                <Brain size={18} /> Student ML Analytics Profile: {selectedStudent.name}
              </h2>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '12px' }}
                onClick={() => { setSelectedStudent(null); setStudentPrediction(null); }}
              >
                Close
              </button>
            </div>
            
            <div className="card-body">
              {isLoadingPrediction ? (
                <p className="logo-sub">Querying absence risk calculation...</p>
              ) : studentPrediction ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="grid-2col">
                    <div>
                      <span className="form-label">Roll ID:</span>
                      <strong>{studentPrediction.studentId}</strong>
                    </div>
                    <div>
                      <span className="form-label">Current Grade:</span>
                      <strong>{studentPrediction.averageGrade}%</strong>
                    </div>
                    <div>
                      <span className="form-label">Class:</span>
                      <strong>{studentPrediction.class}</strong>
                    </div>
                    <div>
                      <span className="form-label">Past Absences (Last 10 days):</span>
                      <strong>{studentPrediction.pastAbsences}</strong>
                    </div>
                  </div>

                  <div className="math-explanation" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <strong>Logistic Sigmoid Risk Indicator:</strong>
                      <p className="logo-sub" style={{ fontSize: '12px', marginTop: '4px' }}>
                        Calculated probability coefficient representing failure-of-attendance risk threshold:
                      </p>
                      <code style={{ fontSize: '10px', color: 'var(--color-primary)', display: 'block', marginTop: '6px' }}>
                        z = 0.55*Absences + 0.40*Weekend - 1.2*GradeScore - 0.95
                      </code>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="gauge-percent" style={{ fontSize: '32px', color: studentPrediction.absenceRisk > 60 ? 'var(--color-danger)' : (studentPrediction.absenceRisk > 30 ? 'var(--color-warning)' : 'var(--color-success)') }}>
                        {studentPrediction.absenceRisk}%
                      </div>
                      <span className="gauge-label" style={{ fontSize: '9px' }}>Risk Factor</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="logo-sub">No details available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: ATTENDANCE MARKER ==================== */}
      {isMarkingAttendance && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <h2 className="card-title">
                <UserCheck size={18} /> Teacher Marking Panel
              </h2>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '12px' }}
                onClick={() => setIsMarkingAttendance(false)}
              >
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleSubmitAttendance} className="card-body">
              <div className="form-group">
                <label className="form-label">Select Student</label>
                <select 
                  className="form-select"
                  value={attendanceForm.studentName}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, studentName: e.target.value })}
                >
                  {students.map(st => (
                    <option key={st.id} value={st.name}>{st.name} (Roll {st.id})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input 
                  type="date"
                  className="form-input"
                  value={attendanceForm.date}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Attendance Status</label>
                <select 
                  className="form-select"
                  value={attendanceForm.status}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value, reason: e.target.value === 'Present' ? '' : attendanceForm.reason })}
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              {attendanceForm.status === 'Absent' && (
                <div className="form-group">
                  <label className="form-label">Reason for Absence</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="e.g. Medical, Family Function"
                    value={attendanceForm.reason}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, reason: e.target.value })}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsMarkingAttendance(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>XYZ AI Pro ERP Portal System &bull; Designed & Maintained by Palak Verma, Machine Learning Intern</p>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Contact: +91 9795529326 | Email: palakverma461@gmail.com
        </p>
      </footer>
    </div>
  );

  function handleSaveApiKey() {
    localStorage.setItem('gemini_api_key', geminiApiKey);
    alert('API Key saved successfully!');
  }
}
