import type { Subject } from "@/lib/types";

export const subjectCatalog: Subject[] = [
  { id: "SB-MATH", code: "MATH", name: "Mathematics", description: "Core mathematics curriculum", category: "Core", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-MN-LANG", code: "MNLANG", name: "Mongolian Language", description: "National language study", category: "Core", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-MN-LIT", code: "MNLIT", name: "Mongolian Literature", description: "Literature and composition", category: "Core", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-EN", code: "ENG", name: "English", description: "English language and communication", category: "Language", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-RU", code: "RUS", name: "Russian", description: "Russian language basics", category: "Language", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-HIST", code: "HIST", name: "History", description: "Historical study and inquiry", category: "Social Science", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-SOC", code: "SOC", name: "Social Studies", description: "Society, culture, and civics", category: "Social Science", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-GEO", code: "GEO", name: "Geography", description: "Physical and human geography", category: "Social Science", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-PHY", code: "PHY", name: "Physics", description: "Physics concepts and lab work", category: "Science", gradeLevels: "Grade 8-12", teacherId: null },
  { id: "SB-CHEM", code: "CHEM", name: "Chemistry", description: "Matter, reactions, and lab skills", category: "Science", gradeLevels: "Grade 8-12", teacherId: null },
  { id: "SB-BIO", code: "BIO", name: "Biology", description: "Life science and ecosystems", category: "Science", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-CS", code: "CS", name: "Computer Science", description: "Programming and digital literacy", category: "Technology", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-PE", code: "PE", name: "Physical Education", description: "Physical health and movement", category: "Wellbeing", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-ART", code: "ART", name: "Art", description: "Creative visual expression", category: "Arts", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-MUSIC", code: "MUSIC", name: "Music", description: "Music theory and performance", category: "Arts", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-TECH", code: "TECH", name: "Technology", description: "Applied technology and design", category: "Technology", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-HEALTH", code: "HEALTH", name: "Health", description: "Personal and community health", category: "Wellbeing", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-CIVIC", code: "CIVIC", name: "Civic Education", description: "Citizenship and civic responsibility", category: "Social Science", gradeLevels: "Grade 7-12", teacherId: null }
];

export const subjectOptions = subjectCatalog.map((subject) => subject.name);
