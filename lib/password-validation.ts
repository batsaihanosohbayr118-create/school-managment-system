export type PasswordCheck = {
  isValid: boolean;
  score: number; // 0-4
  errors: string[];
};

const MIN_LENGTH = 12;

/**
 * Validates password strength. Used on every signup/reset — and required
 * (non-negotiable) whenever the selected role is "admin".
 */
export function validatePasswordStrength(password: string): PasswordCheck {
  const errors: string[] = [];

  if (!password || password.length < MIN_LENGTH) {
    errors.push(`Дор хаяж ${MIN_LENGTH} тэмдэгт байх ёстой`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Жижиг үсэг (a-z) агуулаагүй байна");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Том үсэг (A-Z) агуулаагүй байна");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Тоо (0-9) агуулаагүй байна");
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=~`[\]/\\;']/.test(password)) {
    errors.push("Тусгай тэмдэгт (!@#$% гэх мэт) агуулаагүй байна");
  }

  // simple common-password / sequential guard
  const lower = password.toLowerCase();
  const weakList = ["password", "12345678", "qwerty", "admin", "letmein", "educore"];
  if (weakList.some((weak) => lower.includes(weak))) {
    errors.push("Хэт түгээмэл/таамаглахад амархан нууц үг ашиглаж болохгүй");
  }

  const score = Math.max(0, 4 - errors.length);

  return {
    isValid: errors.length === 0,
    score,
    errors
  };
}

export function passwordStrengthLabel(score: number) {
  if (score <= 1) return { label: "Сул", color: "#dc2626" };
  if (score === 2) return { label: "Дунд", color: "#d97706" };
  if (score === 3) return { label: "Сайн", color: "#65a30d" };
  return { label: "Хүчтэй", color: "#16a34a" };
}