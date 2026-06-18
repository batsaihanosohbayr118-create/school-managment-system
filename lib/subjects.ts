import type { Subject } from "@/lib/types";

export const subjectCatalog: Subject[] = [
  { id: "SB-MATH", name: "Mathematics", category: "Core", gradeLevels: "Grade 7-12" },
  { id: "SB-MN-LANG", name: "Mongolian Language", category: "Core", gradeLevels: "Grade 7-12" },
  { id: "SB-MN-LIT", name: "Mongolian Literature", category: "Core", gradeLevels: "Grade 7-12" },
  { id: "SB-EN", name: "English", category: "Language", gradeLevels: "Grade 7-12" },
  { id: "SB-RU", name: "Russian", category: "Language", gradeLevels: "Grade 7-12" },
  { id: "SB-HIST", name: "History", category: "Social Science", gradeLevels: "Grade 7-12" },
  { id: "SB-SOC", name: "Social Studies", category: "Social Science", gradeLevels: "Grade 7-12" },
  { id: "SB-GEO", name: "Geography", category: "Social Science", gradeLevels: "Grade 7-12" },
  { id: "SB-PHY", name: "Physics", category: "Science", gradeLevels: "Grade 8-12" },
  { id: "SB-CHEM", name: "Chemistry", category: "Science", gradeLevels: "Grade 8-12" },
  { id: "SB-BIO", name: "Biology", category: "Science", gradeLevels: "Grade 7-12" },
  { id: "SB-CS", name: "Computer Science", category: "Technology", gradeLevels: "Grade 7-12" },
  { id: "SB-PE", name: "Physical Education", category: "Wellbeing", gradeLevels: "Grade 7-12" },
  { id: "SB-ART", name: "Art", category: "Arts", gradeLevels: "Grade 7-12" },
  { id: "SB-MUSIC", name: "Music", category: "Arts", gradeLevels: "Grade 7-12" },
  { id: "SB-TECH", name: "Technology", category: "Technology", gradeLevels: "Grade 7-12" },
  { id: "SB-HEALTH", name: "Health", category: "Wellbeing", gradeLevels: "Grade 7-12" },
  { id: "SB-CIVIC", name: "Civic Education", category: "Social Science", gradeLevels: "Grade 7-12" }
];

export const subjectOptions = subjectCatalog.map((subject) => subject.name);
