export interface ParsedJob {
  id: string;
  threadId?: string;
  subject: string;
  date: string;
  company: string | null;
  role: string | null;
  cgCutoff: string | null;
  branches: string[] | null;
  stipend: string | null;
  backlogs: string | null;
  deadline: string | null;
  deadlineUpdated?: boolean;
  rawBody: string;
  messages?: {
    messageId: string;
    subject: string;
    date: string;
    body: string;
    htmlBody?: string;
    snippet?: string;
  }[];
  classification?: {
    bucket: 'A' | 'B';
    type: 'Placement' | 'Internship' | 'Hackathon' | 'Workshop' | 'Seminar' | 'Notice' | 'Other';
    reclassify?: boolean;
  };
}

export function parseEmail(email: any): ParsedJob {
  const isThread = email.messages && Array.isArray(email.messages) && email.messages.length > 0;
  const firstMessage = isThread ? email.messages[0] : email;
  
  const body = firstMessage.body || '';
  const subject = firstMessage.subject || email.subject || '';
  const date = firstMessage.date || email.date || '';
  
  const extractMatch = (text: string, regex: RegExp) => {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };

  // Step A: Regex extraction on the FIRST message
  let company = extractMatch(body, /Company Name:\s*([^\n]+)/i) || extractMatch(body, /Company:\s*([^\n]+)/i);
  let role = extractMatch(body, /Job Title:\s*([^\n]+)/i) || extractMatch(body, /Role:\s*([^\n]+)/i) || extractMatch(body, /Profile:\s*([^\n]+)/i);
  let cgCutoff = extractMatch(body, /CGPA Criteria:\s*([^\n]+)/i) || extractMatch(body, /CGPA[\s:]+([0-9\.]+)/i);
  let stipend = extractMatch(body, /CTC\/Stipend:\s*([^\n]+)/i) || extractMatch(body, /CTC:\s*([^\n]+)/i) || extractMatch(body, /Stipend:\s*([^\n]+)/i);
  let backlogs = extractMatch(body, /Backlogs?:\s*([^\n]+)/i);
  
  let deadline = extractMatch(body, /by\s+([\d]{1,2}\/[\d]{1,2}\/[\d]{2,4}[^\n]+)/i);
  if (!deadline) {
    deadline = extractMatch(body, /(?:deadline|last date)[\s:>=-]+([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4}[^\n]*)/i);
  }

  let branches: string[] | null = null;
  const branchesMatch = extractMatch(body, /Branches:\s*([^\n]+)/i);
  if (branchesMatch) {
    branches = branchesMatch.split(',').map((b: string) => b.trim().replace(/\s*\(.*?\)/, ''));
  }

  // Step B: Heuristic fallback (If regex fails, try to glean from subject or basic patterns)
  if (!company) {
    const hiringMatch = subject.match(/hiring\s+for\s+([a-z0-9\s]+)/i) || subject.match(/^([a-z0-9\s]+)\s+-\s+/i);
    if (hiringMatch) company = hiringMatch[1].trim();
  }

  // Check follow-ups for deadline updates
  let deadlineUpdated = false;
  if (isThread && email.messages.length > 1) {
    for (let i = 1; i < email.messages.length; i++) {
      const followupBody = email.messages[i].body || '';
      const newDeadline = extractMatch(followupBody, /(?:extended to|new deadline|rescheduled to|postponed to)[\s:>=-]*([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4}[^\n]*)/i) ||
                          extractMatch(followupBody, /deadline.*?extended to\s+([\d]{1,2}\/[\d]{1,2}\/[\d]{2,4}[^\n]*)/i);
      if (newDeadline) {
        deadline = newDeadline;
        deadlineUpdated = true;
      }
    }
  }

  // Step C: Classification
  // Use all text (original + followups) for classification keywords to be safe
  const allTextBody = isThread ? email.messages.map((m: any) => m.body).join(' ') : body;
  const allTextSubject = isThread ? email.messages.map((m: any) => m.subject).join(' ') : subject;
  const fullText = (allTextSubject + ' ' + allTextBody).toLowerCase();
  
  const bucketA_placement = ["hiring", "recruitment", "full-time", "placement drive", "job offer", "ctc", "package", "role:", "position:", "on-campus", "off-campus", "ppo"];
  const bucketA_internship = ["internship", "intern", "stipend", "summer internship", "winter internship", "6-month", "2-month"];
  const bucketB_keywords = ["hackathon", "workshop", "seminar", "webinar", "competition", "fest", "notice", "circular", "reminder", "announcement", "event", "quiz", "contest", "deadline extended", "postponed", "rescheduled"];

  let matchedA = false;
  let typeA: 'Placement' | 'Internship' | null = null;
  if (bucketA_placement.some(kw => fullText.includes(kw))) {
    matchedA = true;
    typeA = 'Placement';
  } else if (bucketA_internship.some(kw => fullText.includes(kw))) {
    matchedA = true;
    typeA = 'Internship';
  }

  let matchedB = false;
  let typeB: 'Hackathon' | 'Workshop' | 'Seminar' | 'Notice' | 'Other' = 'Other';
  
  if (bucketB_keywords.some(kw => fullText.includes(kw))) {
    matchedB = true;
    if (fullText.includes("hackathon") || fullText.includes("competition") || fullText.includes("quiz") || fullText.includes("contest")) typeB = 'Hackathon';
    else if (fullText.includes("seminar")) typeB = 'Seminar';
    else if (fullText.includes("workshop") || fullText.includes("webinar")) typeB = 'Workshop';
    else if (fullText.includes("notice") || fullText.includes("circular") || fullText.includes("announcement") || fullText.includes("reminder") || fullText.includes("deadline extended") || fullText.includes("postponed") || fullText.includes("rescheduled") || fullText.includes("event") || fullText.includes("fest")) typeB = 'Notice';
  }

  let classification: ParsedJob['classification'];
  if (matchedB || !matchedA) {
    classification = { bucket: 'B', type: typeB };
  } else {
    classification = { bucket: 'A', type: typeA! };
  }

  return {
    id: email.id,
    threadId: isThread ? email.id : undefined,
    subject: subject,
    date: date,
    rawBody: body,
    messages: isThread ? email.messages : undefined,
    company,
    role,
    cgCutoff,
    stipend,
    backlogs,
    deadline,
    deadlineUpdated,
    branches,
    classification
  };
}
