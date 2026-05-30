export interface ParsedJob {
  id: string;
  subject: string;
  date: string;
  company: string | null;
  role: string | null;
  cgCutoff: string | null;
  branches: string[] | null;
  stipend: string | null;
  backlogs: string | null;
  deadline: string | null;
  rawBody: string;
}

export function parseEmail(email: any): ParsedJob {
  const body = email.body || '';
  
  const extractMatch = (regex: RegExp) => {
    const match = body.match(regex);
    return match ? match[1].trim() : null;
  };

  // Step A: Regex extraction
  let company = extractMatch(/Company Name:\s*([^\n]+)/i) || extractMatch(/Company:\s*([^\n]+)/i);
  let role = extractMatch(/Job Title:\s*([^\n]+)/i) || extractMatch(/Role:\s*([^\n]+)/i) || extractMatch(/Profile:\s*([^\n]+)/i);
  let cgCutoff = extractMatch(/CGPA Criteria:\s*([^\n]+)/i) || extractMatch(/CGPA[\s:]+([0-9\.]+)/i);
  let stipend = extractMatch(/CTC\/Stipend:\s*([^\n]+)/i) || extractMatch(/CTC:\s*([^\n]+)/i) || extractMatch(/Stipend:\s*([^\n]+)/i);
  let backlogs = extractMatch(/Backlogs?:\s*([^\n]+)/i);
  
  let deadline = extractMatch(/by\s+([\d]{1,2}\/[\d]{1,2}\/[\d]{2,4}[^\n]+)/i);
  if (!deadline) {
    deadline = extractMatch(/(?:deadline|last date)[\s:>=-]+([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4}[^\n]*)/i);
  }

  let branches: string[] | null = null;
  const branchesMatch = extractMatch(/Branches:\s*([^\n]+)/i);
  if (branchesMatch) {
    branches = branchesMatch.split(',').map((b: string) => b.trim().replace(/\s*\(.*?\)/, ''));
  }

  // Step B: Heuristic fallback (If regex fails, try to glean from subject or basic patterns)
  if (!company) {
    const hiringMatch = email.subject.match(/hiring\s+for\s+([a-z0-9\s]+)/i) || email.subject.match(/^([a-z0-9\s]+)\s+-\s+/i);
    if (hiringMatch) company = hiringMatch[1].trim();
  }

  return {
    id: email.id,
    subject: email.subject,
    date: email.date,
    rawBody: body,
    company,
    role,
    cgCutoff,
    stipend,
    backlogs,
    deadline,
    branches
  };
}
