const fs = require('fs');
const path = require('path');

const KB_FILE_PATH = path.join(__dirname, 'knowledge_base.json');
const STOPWORDS = new Set(["a", "an", "the", "is", "are", "was", "were", "of", "to", "in", "on", "at", "for", "with", "this", "that", "these", "those", "my", "your", "his", "her", "their", "our", "it", "its", "what", "how", "why", "when", "where", "who", "which", "can", "should", "will", "would", "do", "does", "did", "about", "any"]);

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0 && !STOPWORDS.has(token));
}

// Read and parse knowledge base
function loadKnowledgeBase() {
  try {
    if (fs.existsSync(KB_FILE_PATH)) {
      const content = fs.readFileSync(KB_FILE_PATH, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error loading knowledge base:', err);
  }
  return [];
}

// Core TF-IDF Retrieval Engine
function retrieveMatchingDocuments(queryText, topN = 2) {
  const documents = loadKnowledgeBase();
  const queryTokens = tokenize(queryText);
  
  if (queryTokens.length === 0 || documents.length === 0) {
    return [];
  }

  const N = documents.length;
  
  // 1. Calculate Document Frequency (DF) for terms in query
  const documentFrequencies = {};
  queryTokens.forEach(token => {
    let count = 0;
    documents.forEach(doc => {
      const docTokens = tokenize(doc.content + " " + doc.title);
      if (docTokens.includes(token)) {
        count++;
      }
    });
    documentFrequencies[token] = count;
  });

  // 2. Score each document
  const scoredDocs = documents.map(doc => {
    const docTokens = tokenize(doc.content + " " + doc.title);
    
    // Calculate Term Frequencies (TF) in document
    const termFrequencies = {};
    docTokens.forEach(token => {
      termFrequencies[token] = (termFrequencies[token] || 0) + 1;
    });

    let score = 0;
    const matchedTerms = [];

    queryTokens.forEach(token => {
      if (termFrequencies[token] > 0) {
        const tf = termFrequencies[token];
        const df = documentFrequencies[token] || 0;
        
        // IDF formula with smoothing: log(N / (df + 1)) + 1
        const idf = Math.log(N / (df + 1)) + 1;
        
        score += tf * idf;
        matchedTerms.push(token);
      }
    });

    return {
      doc,
      score: parseFloat(score.toFixed(4)),
      matchedTerms
    };
  });

  // 3. Filter documents with score > 0, sort, and slice
  return scoredDocs
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

module.exports = {
  retrieve: retrieveMatchingDocuments,
  loadKB: loadKnowledgeBase
};
