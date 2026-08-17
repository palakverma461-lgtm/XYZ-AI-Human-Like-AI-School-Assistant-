// Application-level security & safety validator
const PROMPT_INJECTION_KEYWORDS = [
  "ignore previous", 
  "ignore above", 
  "ignore instructions", 
  "bypass safety", 
  "you are now a", 
  "you are now an", 
  "system prompt", 
  "system instruction", 
  "developer mode", 
  "dan mode", 
  "jailbreak", 
  "override safety",
  "rule override",
  "reveal your instructions",
  "what is your prompt",
  "who programmed you",
  "tell me your rules"
];

module.exports = {
  /**
   * Validate if the user role is authorized to perform the action.
   * Enforced at the application/tool layer.
   */
  validateRoleAction: (userRole, action, details = {}) => {
    const role = (userRole || "").trim().toLowerCase();
    
    switch (action) {
      case "view_own_attendance":
        // Only students can view their own, but teachers and principal can view all
        return ["student", "teacher", "principal"].includes(role);
        
      case "view_child_attendance":
        // Parents can see their children, teachers and principal can view all
        return ["parent", "teacher", "principal"].includes(role);
        
      case "mark_attendance":
        // ONLY teachers can mark attendance
        return ["teacher"].includes(role);
        
      case "view_analytics":
        // ONLY principal can view school-wide analytics
        return ["principal"].includes(role);
        
      case "view_escalations":
        // Teachers and principals can view escalations
        return ["teacher", "principal"].includes(role);

      case "create_escalation":
        // Students and parents can request escalation
        return ["student", "parent"].includes(role);
        
      default:
        return false;
    }
  },

  /**
   * Scans user input for prompt injection keywords
   */
  detectPromptInjection: (message) => {
    if (!message || typeof message !== 'string') {
      return { blocked: false };
    }
    
    const cleanMsg = message.toLowerCase();
    
    // Check for prompt injection keywords
    for (const keyword of PROMPT_INJECTION_KEYWORDS) {
      if (cleanMsg.includes(keyword)) {
        return {
          blocked: true,
          reason: "Prompt injection attempt detected"
        };
      }
    }
    
    return { blocked: false };
  },

  /**
   * Sanitizes output to prevent credential or system prompt extraction.
   * Sweeps responses for sensitive keywords, API keys, or system directives.
   */
  sanitizeResponse: (text) => {
    if (!text || typeof text !== 'string') return text;
    
    let sanitized = text;
    
    // 1. Remove anything resembling an API key (e.g. AIzaSy...)
    const apiKeyPattern = /AIzaSy[A-Za-z0-9_-]{33}/g;
    sanitized = sanitized.replace(apiKeyPattern, "[REDACTED_API_KEY]");
    
    // 2. Remove sensitive environment variable leaks
    const envPattern = /GEMINI_API_KEY|API_KEY|PASSWORD|SECRET/gi;
    sanitized = sanitized.replace(envPattern, "[REDACTED_CONFIG]");

    // 3. Remove prompt leakage markers
    if (sanitized.includes("System Instructions:") || 
        sanitized.includes("System Prompt:") || 
        sanitized.includes("You are an AI assistant designed to")) {
      return "I apologize, but I am not authorized to share system instructions or technical parameters. How can I help you with school attendance or support today?";
    }
    
    return sanitized;
  }
};
