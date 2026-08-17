# Standalone Applied AI School Assistant (XYZ AI) & ERP Ecosystem

---

## 👩‍💻 Developer & Intern Credentials
- **Name**: Palak Verma
- **Role**: Machine Learning Intern
- **Contact No.**: +91 9795529326
- **Email**: [palakverma461@gmail.com](mailto:palakverma461@gmail.com)
- **GitHub**: [github.com/palakverma461](https://github.com/palakverma461)
- **LinkedIn**: [linkedin.com/in/palak-verma-910a48357](https://www.linkedin.com/in/palak-verma-910a48357)
- **Project Scope**: Custom Machine Learning Integration, Express APIs & Interactive React ML ERP Dashboard.

---

Welcome to the **School ERP Ecosystem & XYZ AI School Assistant** workspace. This repository contains a standalone, fully-functional School ERP ecosystem featuring role-based portals for Students, Parents, Teachers, and Principals, fully integrated with a central, human-like AI assistant (**XYZ AI**), along with a brand new, interactive **React ML Dashboard**!

---

## 🚀 Quick Start Guide

To launch and run the entire ecosystem locally:

1. **Navigate to the AI Backend Repository**:
   ```bash
   cd "05. XYZ AI Repository/xyz-ai"
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Start the Server**:
   ```bash
   node server.js
   ```
4. **Access the Application**:
   Open your browser and navigate to:
   👉 **`http://localhost:3000/`**

> [!TIP]
> Use the **"Split-Screen ERP Mode"** tab on the homepage. It launches all 4 portals (Student, Parent, Teacher, Principal) side-by-side in real-time, allowing you to mark attendance as a teacher and instantly watch the parent's metrics and principal's analytics update!

---

## 📁 Repository Structure

The workspace is organized into five repository folders representing a standard school ERP ecosystem:

```
School ERP Ecosystem
│
├── 01. Student Repository
│   └── student-portal          # Portal for students (Indigo Theme)
│
├── 02. Parent Repository
│   └── parent-portal           # Portal for parents (Emerald Theme)
│
├── 03. Management Repository
│   └── management-portal       # Portal for Principal / Admin (Amber Theme)
│
├── 04. Staff Repository
│   └── staff-portal            # Portal for Teachers (Rose Theme)
│
└── 05. XYZ AI Repository
    └── xyz-ai                  # Orchestration backend & shared assets
        ├── db.js               # Mock database & attendance manager
        ├── security.js         # Security, permissions & sanitizer
        ├── nlp.js              # 11-Language offline NLP matching engine
        ├── server.js           # Express API server & asset routers
        ├── verify.js           # Automated validation suite
        └── public/
            ├── index.html      # Central ERP Ecosystem Landing Hub
            ├── style.css       # Main Hub visual styling
            └── shared/         # Shared AI Assistant Widget Assets
                ├── xyz-ai-widget.js  # Widget logic (Speech, Avatar, API)
                └── xyz-ai-widget.css  # Widget styles & animations
```

---

## 🤖 XYZ AI Assistant Core Capabilities

### 1. Unified Modular Widget
The AI Assistant is built as a single, modular widget. It is injected into each portal by importing two shared files:
```html
<link rel="stylesheet" href="/shared/xyz-ai-widget.css">
<script src="/shared/xyz-ai-widget.js" defer></script>
```
The script reads the host page's metadata (e.g. `<body data-user-role="student">`) and configures its accent theme, role permissions, and conversational persona.

### 2. Conversational Personas & Use Cases
*   **Student Persona (Friendly & Supportive Academic Assistant)**: Helps Rahul Sharma review his attendance (`91.2%`) or homework.
*   **Parent Persona (Caring & Patient Parent Support Assistant)**: Helps Mrs. Sharma monitor Rahul's calendar records and academic reports.
*   **Teacher Persona (Professional Teaching Assistant)**: Assists Mr. Kumar in marking attendance (e.g. saying *"Mark Rahul absent today"* updates the database).
*   **Principal Persona (Professional Management Assistant)**: Provides Dr. Shastri with school-wide analytics and trend stats.

### 3. Voice & Interactive SVG Avatar
*   **Speech-to-Text (STT)**: Voice queries using the browser's Web Speech API (`webkitSpeechRecognition`) in multiple languages.
*   **Text-to-Speech (TTS)**: Reads replies aloud with native accent synthesis.
*   **Interactive SVG Avatar Face**: A virtual assistant face. It blinks, looks around, and **lip-syncs dynamically** (animates between phoneme mouth shapes during speech playback).
*   **Synthesized Sound Effects**: chimes and clicks generated on-the-fly using the Web Audio API, requiring zero static audio files.

### 4. Language Support
Supports **11 languages** with voice recognition, speech synthesis, and text replies:
*   English, Hindi (हिन्दी), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), Bengali (বাংলা), Gujarati (ગુજરાતી), Punjabi (ਪੰਜਾਬੀ), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), and Urdu (اردو).

### 5. Dual-Mode AI Engine
*   **Gemini API Mode**: Paste your Google Gemini API key into the dashboard. All portals immediately switch to live generative conversations using model `gemini-1.5-flash` with system prompts.
*   **Local NLP Fallback Mode**: If no key is set, the widget runs on an advanced, offline, rule-based NLP engine. It parses attendance inquiries, processes roster updates, and manages escalations in all 11 languages out-of-the-box.

---

## 🔒 Security & Safety (Application Layer)

As required, authorization is implemented strictly at the **application/tool layer** inside `security.js` and `server.js` rather than relying only on the LLM instructions.

*   **Role Enforcement**:
    *   If a Student attempts to mark attendance or view school-wide analytics, the request is rejected by the backend router before hitting the LLM.
    *   Students/Parents can only query data matching their verified database ID context.
*   **Prompt Injection Protection**: Regular expression scans block requests containing phrases like *"ignore previous"* or *"reveal instructions"*.
*   **Credential Leak Prevention**: Outgoing responses are scrubbed for API keys, passwords, and sensitive keys, replacing them with generic placeholders like `[REDACTED_CONFIG]`.
*   **System Prompt Protection**: Checks block responses containing instructions or parameters.

---

## 🧪 Automated Testing

We have built a test suite to verify the ecosystem's integrity. To run it:
```bash
node verify.js
```
This tests:
1. Retrieval of student profiles by parent and ID.
2. Real-time recalculation of attendance averages.
3. Strict enforcement of role-based permissions (e.g. students blocked from analytics).
4. Validation of safety filters against prompt injections.
5. Verification of the 11-language local translation processor.

---

## ⚛️ React ML ERP Dashboard (Interactive Sandbox)
A premium, interactive React dashboard has been created to highlight the ecosystem's Machine Learning and ERP capabilities.

### 🚀 How to Run the React App
1. **Navigate to the React Repository**:
   ```bash
   cd ml-react-dashboard
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Start the Vite Dev Server**:
   ```bash
   npm run dev
   ```
4. **Access the Dashboard**:
   Open: 👉 **`http://localhost:5173/`**
   *(Ensure the Node backend server is running on port 3000 concurrently, as the React app proxies API calls to it)*

### 🤖 Machine Learning Architectures Implemented
The React Dashboard and Express Backend showcase three core custom Machine Learning models:
1. **Multinomial Naive Bayes Intent Classifier**:
   - Classifies user inputs into NLP intents (`GREET`, `HELP`, `ATTENDANCE_VIEW`, `ATTENDANCE_MARK`, `ESCALATE`, `CONFIRMATION`).
   - Implements Laplace smoothing ($\alpha = 1$) and maps probabilities using log-probability addition to prevent numeric underflow.
2. **Lexicon Sentiment Analyzer**:
   - Scores textual expressions dynamically (positive, negative, neutral) by parsing individual tokens against a precompiled language dictionary of positive/negative weights.
   - Triggers proactive support callbacks if a student/parent expresses frustration.
3. **Logistic Regression Attendance Risk Predictor**:
   - Computes absence likelihood for student profiles using a sigmoid-activated logit model:
     $$z = w_1 \cdot \text{pastAbsences} + w_2 \cdot \text{weekendAdjacent} + w_3 \cdot \text{normalizedGrade} + \text{bias}$$
     $$P = \text{sigmoid}(z) = \frac{1}{1 + e^{-z}}$$
   - Model parameters: $w_1 = 0.55$, $w_2 = 0.40$, $w_3 = -1.2$, $\text{bias} = -0.95$.
4. **Retrieval-Augmented Generation (RAG) Engine**:
   - Implements a local TF-IDF document retriever to query the school guidelines database (`knowledge_base.json`) in real-time.
   - Calculates term frequency ($\text{TF}_{d, t}$) and inverse document frequency ($\text{IDF}_t$) to score documents:
     $$\text{Score}_d = \sum_{t \in \text{query}} \text{TF}_{d, t} \cdot \left(\ln\left(\frac{N}{\text{DF}_t + 1}\right) + 1\right)$$
   - Retrieved context is injected into generative instructions (for Gemini) or appended as a verified source block (for local NLP fallback).
   - Features a Knowledge Base Manager allowing Faculty to modify syllabus or school rules on-the-fly, instantly rewriting the JSON index.
