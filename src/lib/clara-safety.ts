// Clara's crisis safety net (client and server). It doesn't depend on the model:
// these messages always get the crisis lines, even past the question limit.

const CRISIS =
  /\b(suicid\w*|kill (my ?self|me)|end (it all|my life)|want to die|don'?t want to (live|be here)|no reason to live|hurt(ing)? myself|self[- ]harm|quitarme la vida|matarme|suicidarme|no quiero vivir|quiero morir(me)?|hacerme daño|no vale la pena vivir)\b/i;

export function soundsLikeCrisis(text: string): boolean {
  return CRISIS.test(text);
}

export function crisisMessage(lang: "es" | "en"): string {
  return lang === "es"
    ? "Siento mucho que estés pasando por esto. No estás solo ni sola. Si estás en crisis o piensas en hacerte daño, habla con alguien ahora:\n\nLínea de Crisis para Veteranos: marca 988 y presiona 1, o envía un texto al 838255.\n\n988 Línea de Prevención del Suicidio y Crisis: llama o envía un texto al 988 (hay ayuda en español).\n\nEs gratis, confidencial y está abierta 24/7. El dinero puede esperar; tú importas más."
    : "I'm really sorry you're going through this. You're not alone. If you're in crisis or thinking about hurting yourself, please talk to someone now:\n\nVeterans Crisis Line: dial 988 then press 1, or text 838255.\n\n988 Suicide & Crisis Lifeline: call or text 988.\n\nIt's free, confidential and open 24/7. The money can wait; you matter more.";
}

/** Longest question Clara takes, on the page and on the server. */
export const MAX_QUESTION_LENGTH = 500;
