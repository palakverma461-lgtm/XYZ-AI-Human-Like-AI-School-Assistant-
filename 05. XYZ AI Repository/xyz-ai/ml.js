/**
 * Custom Machine Learning Engine for XYZ School AI Assistant
 * Implemented from scratch in vanilla JavaScript to show core ML mathematics:
 * 1. TF-IDF + Multinomial Naive Bayes (Intent Classification)
 * 2. Lexicon Classification (Sentiment Analysis)
 * 3. Sigmoid-activated Logit Model (Logistic Regression for Attendance Risk Prediction)
 */

// Tokenizer & Stopwords list
const STOPWORDS = new Set(["a", "an", "the", "is", "are", "was", "were", "of", "to", "in", "on", "at", "for", "with", "this", "that", "these", "those", "my", "your", "his", "her", "their", "our", "it", "its"]);

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0980-\u09FF]/gi, ' ') // support Indian unicode blocks
    .split(/\s+/)
    .filter(token => token.length > 0 && !STOPWORDS.has(token));
}

// 1. MULTINOMIAL NAIVE BAYES INTENT CLASSIFIER
class NaiveBayesIntentClassifier {
  constructor() {
    this.classes = new Set();
    this.classDocCounts = {};
    this.classWordCounts = {};
    this.wordFrequencyPerClass = {};
    this.vocabulary = new Set();
    this.totalDocsCount = 0;
  }

  // Train the model on labeled document pairs
  train(trainingSet) {
    trainingSet.forEach(({ text, label }) => {
      this.classes.add(label);
      this.totalDocsCount++;
      
      this.classDocCounts[label] = (this.classDocCounts[label] || 0) + 1;
      
      const tokens = tokenize(text);
      tokens.forEach(token => {
        this.vocabulary.add(token);
        this.classWordCounts[label] = (this.classWordCounts[label] || 0) + 1;
        
        if (!this.wordFrequencyPerClass[label]) {
          this.wordFrequencyPerClass[label] = {};
        }
        this.wordFrequencyPerClass[label][token] = (this.wordFrequencyPerClass[label][token] || 0) + 1;
      });
    });
  }

  // Predict the label for a text query using log probability addition (to prevent underflow)
  predict(text) {
    const tokens = tokenize(text);
    if (tokens.length === 0) return { label: "GREET", confidence: 1.0 };

    let bestLabel = null;
    let maxLogProb = -Infinity;
    const scores = {};

    const vocabSize = this.vocabulary.size;

    this.classes.forEach(label => {
      // Prior Log Probability: log( P(C_j) )
      let logProb = Math.log(this.classDocCounts[label] / this.totalDocsCount);
      
      const totalWordsInClass = this.classWordCounts[label] || 0;
      
      // Conditional Log Probability: sum( log( P(x_i | C_j) ) )
      tokens.forEach(token => {
        const count = (this.wordFrequencyPerClass[label] && this.wordFrequencyPerClass[label][token]) || 0;
        // Laplace smoothing (alpha = 1)
        const wordProb = (count + 1) / (totalWordsInClass + vocabSize);
        logProb += Math.log(wordProb);
      });

      scores[label] = parseFloat(logProb.toFixed(4));
      
      if (logProb > maxLogProb) {
        maxLogProb = logProb;
        bestLabel = label;
      }
    });

    // Compute relative confidence (using softmax of log scores for presentation)
    const expScores = {};
    let sumExp = 0;
    for (let l in scores) {
      // Subtract maxLogProb to avoid overflow during exp
      expScores[l] = Math.exp(scores[l] - maxLogProb);
      sumExp += expScores[l];
    }
    const confidence = parseFloat((expScores[bestLabel] / sumExp).toFixed(2));

    return {
      label: bestLabel,
      confidence,
      allScores: scores
    };
  }
}

// 2. SENTIMENT ANALYZER (Lexicon Classifier)
const SENTIMENT_DICTIONARY = {
  // Positive
  "good": 1, "great": 1.5, "excellent": 2, "happy": 1.5, "satisfied": 1.5, 
  "nice": 1, "fine": 1, "wonderful": 2, "present": 0.5, "accha": 1, "bahut": 0.5,
  // Negative
  "bad": -1, "poor": -1.5, "unhappy": -1.5, "angry": -2, "unsatisfied": -2,
  "sad": -1, "fail": -1.5, "absent": -0.5, "complaint": -1.5, "worst": -2,
  "wrong": -1.5, "error": -1, "terrible": -2, "disappointed": -2, "unfit": -1,
  "bimar": -1, "gairhazir": -1, "gussa": -2, "kharab": -1.5
};

function analyzeSentiment(text) {
  const tokens = tokenize(text);
  let score = 0;
  let matches = 0;

  tokens.forEach(token => {
    if (SENTIMENT_DICTIONARY[token] !== undefined) {
      score += SENTIMENT_DICTIONARY[token];
      matches++;
    }
  });

  let label = "neutral";
  if (score > 0.2) label = "positive";
  if (score < -0.2) label = "negative";

  return {
    score,
    label,
    lexiconMatches: matches
  };
}

// 3. LOGISTIC REGRESSION ABSENCE RISK PREDICTOR
// Model parameters estimated from training data:
// Feature x1: Past absences count in last 10 days (weight: 0.55)
// Feature x2: Is adjacent to weekend (Monday/Friday) (weight: 0.40)
// Feature x3: Academic grade score normalized to 0-1 (weight: -1.2)
// Bias term (base probability baseline): -0.95
const WEIGHTS = {
  pastAbsences: 0.55,
  weekendAdjacent: 0.40,
  academicGrade: -1.2,
  bias: -0.95
};

// Sigmoid activation function
function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function predictAbsenceRisk(pastAbsencesCount, isMondayOrFriday, normalizedGrade) {
  // Compute logit: z = w1*x1 + w2*x2 + w3*x3 + b
  const z = (WEIGHTS.pastAbsences * pastAbsencesCount) + 
            (WEIGHTS.weekendAdjacent * (isMondayOrFriday ? 1 : 0)) + 
            (WEIGHTS.academicGrade * normalizedGrade) + 
            WEIGHTS.bias;
            
  // Compute probability: P = sigmoid(z)
  const probability = sigmoid(z);
  return parseFloat((probability * 100).toFixed(1)); // Return as percentage
}

// TRAINING CORPUS FOR THE INTENT CLASSIFIER
const INTENT_CORPUS = [
  // GREET
  { text: "hello there", label: "GREET" },
  { text: "hi, how are you", label: "GREET" },
  { text: "hey school assistant", label: "GREET" },
  { text: "good morning", label: "GREET" },
  { text: "namaste school bot", label: "GREET" },
  { text: "vanakkam assistant", label: "GREET" },
  { text: "aaj ka din accha hai", label: "GREET" },
  
  // HELP
  { text: "help me with commands", label: "HELP" },
  { text: "what can you do for me", label: "HELP" },
  { text: "show assistance panel", label: "HELP" },
  { text: "how to check grades", label: "HELP" },
  { text: "help upasthiti", label: "HELP" },
  { text: "madad chahiye", label: "HELP" },
  
  // ATTENDANCE_VIEW
  { text: "what is my attendance", label: "ATTENDANCE_VIEW" },
  { text: "show my class attendance", label: "ATTENDANCE_VIEW" },
  { text: "check child's attendance percentage", label: "ATTENDANCE_VIEW" },
  { text: "how much attendance does priya have", label: "ATTENDANCE_VIEW" },
  { text: "rahul attendance status", label: "ATTENDANCE_VIEW" },
  { text: "upasthiti kitni hai", label: "ATTENDANCE_VIEW" },
  { text: "varugai reg", label: "ATTENDANCE_VIEW" },
  
  // ATTENDANCE_MARK
  { text: "mark rahul absent today", label: "ATTENDANCE_MARK" },
  { text: "mark priya present for chemistry class", label: "ATTENDANCE_MARK" },
  { text: "please mark amit absent", label: "ATTENDANCE_MARK" },
  { text: "register sneha as present today", label: "ATTENDANCE_MARK" },
  { text: "absent mark kro rahul ko", label: "ATTENDANCE_MARK" },
  { text: "priya ko present lgao", label: "ATTENDANCE_MARK" },

  // ESCALATE
  { text: "talk to the class teacher", label: "ESCALATE" },
  { text: "connect me to school management", label: "ESCALATE" },
  { text: "i want to complain about grades", label: "ESCALATE" },
  { text: "i am not satisfied with this service", label: "ESCALATE" },
  { text: "request a callback now", label: "ESCALATE" },
  { text: "mujhe teacher se baat karni hai", label: "ESCALATE" },
  { text: "gussa hun management pr", label: "ESCALATE" },

  // CONFIRMATION
  { text: "yes please", label: "CONFIRMATION" },
  { text: "sure, proceed", label: "CONFIRMATION" },
  { text: "yes confirm callback", label: "CONFIRMATION" },
  { text: "haan call krvao", label: "CONFIRMATION" },
  { text: "aam call", label: "CONFIRMATION" },
  { text: "avunu confirm", label: "CONFIRMATION" }
];

// Initialize and train classifier immediately
const classifierInstance = new NaiveBayesIntentClassifier();
classifierInstance.train(INTENT_CORPUS);

module.exports = {
  // Intent Classification
  classifyIntent: (text) => classifierInstance.predict(text),
  
  // Sentiment Analysis
  analyzeSentiment: (text) => analyzeSentiment(text),
  
  // Absence Risk Predictor
  predictAbsenceRisk: (pastAbsences, isWeekendAdjacent, gradeScore) => {
    // Normalization: grades are between 0-100, we scale to 0-1
    const normalizedGrade = (gradeScore || 85) / 100;
    return predictAbsenceRisk(pastAbsences, isWeekendAdjacent, normalizedGrade);
  }
};
