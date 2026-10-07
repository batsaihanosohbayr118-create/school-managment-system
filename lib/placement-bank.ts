import type { AnswerLetter, CefrLevel } from "@shared/placement";

export type BankQuestion = {
  id: string;
  level: CefrLevel;
  question: string;
  options: [string, string, string, string];
  answer: AnswerLetter;
};

/**
 * The starter English placement test, five questions per CEFR level.
 * Seeded into `placement_questions` only while that table is empty; after
 * that the English teacher owns the questions and edits them from the app.
 *
 * Server-only on purpose: it carries the answer key, and anything under
 * shared/ is bundled into the phone app.
 */
export const placementBank: BankQuestion[] = [
  { id: "PQ-A1-1", level: "A1", question: "She ___ a student.", options: ["is", "are", "am", "be"], answer: "A" },
  { id: "PQ-A1-2", level: "A1", question: "I have two ___.", options: ["cat", "cats", "a cat", "cates"], answer: "B" },
  { id: "PQ-A1-3", level: "A1", question: "What ___ your name?", options: ["is", "are", "do", "does"], answer: "A" },
  { id: "PQ-A1-4", level: "A1", question: "They ___ football every Sunday.", options: ["plays", "playing", "play", "played"], answer: "C" },
  { id: "PQ-A1-5", level: "A1", question: "Choose the opposite of \"big\".", options: ["tall", "small", "long", "old"], answer: "B" },

  { id: "PQ-A2-1", level: "A2", question: "I ___ to the cinema last night.", options: ["go", "went", "gone", "going"], answer: "B" },
  { id: "PQ-A2-2", level: "A2", question: "There isn't ___ milk in the fridge.", options: ["some", "any", "many", "a"], answer: "B" },
  { id: "PQ-A2-3", level: "A2", question: "She is ___ than her brother.", options: ["tall", "more tall", "taller", "tallest"], answer: "C" },
  { id: "PQ-A2-4", level: "A2", question: "We ___ dinner when the phone rang.", options: ["had", "were having", "have", "are having"], answer: "B" },
  { id: "PQ-A2-5", level: "A2", question: "How ___ apples do you want?", options: ["much", "many", "more", "lot"], answer: "B" },

  { id: "PQ-B1-1", level: "B1", question: "If it rains tomorrow, we ___ at home.", options: ["stay", "will stay", "would stay", "stayed"], answer: "B" },
  { id: "PQ-B1-2", level: "B1", question: "I have lived here ___ 2015.", options: ["for", "since", "from", "during"], answer: "B" },
  { id: "PQ-B1-3", level: "B1", question: "This book ___ by millions of people.", options: ["has read", "has been read", "is reading", "reads"], answer: "B" },
  { id: "PQ-B1-4", level: "B1", question: "You ___ wear a seatbelt. It's the law.", options: ["must", "might", "could", "would"], answer: "A" },
  { id: "PQ-B1-5", level: "B1", question: "She asked me where I ___.", options: ["live", "lived", "am living", "will live"], answer: "B" },

  { id: "PQ-B2-1", level: "B2", question: "If I ___ more time, I would learn Japanese.", options: ["have", "had", "will have", "would have"], answer: "B" },
  { id: "PQ-B2-2", level: "B2", question: "By the time we arrived, the film ___.", options: ["already started", "has already started", "had already started", "was already starting"], answer: "C" },
  { id: "PQ-B2-3", level: "B2", question: "He denied ___ the window.", options: ["to break", "breaking", "break", "broke"], answer: "B" },
  { id: "PQ-B2-4", level: "B2", question: "I'd rather you ___ smoke in here.", options: ["don't", "didn't", "won't", "not"], answer: "B" },
  { id: "PQ-B2-5", level: "B2", question: "Choose the word closest in meaning to \"reluctant\".", options: ["eager", "unwilling", "careful", "angry"], answer: "B" },

  { id: "PQ-C1-1", level: "C1", question: "Hardly ___ the station when the train left.", options: ["I had reached", "had I reached", "I reached", "did I reached"], answer: "B" },
  { id: "PQ-C1-2", level: "C1", question: "Had I known about the problem, I ___ something.", options: ["would do", "will have done", "would have done", "had done"], answer: "C" },
  { id: "PQ-C1-3", level: "C1", question: "The proposal was rejected, ___ was hardly surprising.", options: ["that", "what", "which", "it"], answer: "C" },
  { id: "PQ-C1-4", level: "C1", question: "Choose the word closest in meaning to \"meticulous\".", options: ["careless", "very careful", "quick", "generous"], answer: "B" },
  { id: "PQ-C1-5", level: "C1", question: "Not only ___ late, but he also forgot the tickets.", options: ["he was", "was he", "he is", "did he"], answer: "B" }
];
