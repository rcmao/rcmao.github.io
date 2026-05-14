export const AQUARIUM_BUBBLE_LINES = [
  "The water's perfect today.",
  "Bubbles coming up!",
  "I had two fish flakes this morning.",
  "Hey… you came to see me?",
  "Don't scare me with the mouse!",
  "I like this corner of the desk.",
  "Keep that coffee cup away from me.",
  "The sunlight feels nice today.",
  "Watch the bubbles float away!",
  "Thinking about life… or fish life.",
  "Your laptop looks bright today.",
  "Someone touched my tank lid today.",
  "Glub glub, bubble time!",
  "Your coffee smells nice.",
  "Hi! Just saying hello~",
] as const;

export function pickRandomAquariumLine(): string {
  const i = Math.floor(Math.random() * AQUARIUM_BUBBLE_LINES.length);
  return AQUARIUM_BUBBLE_LINES[i] ?? AQUARIUM_BUBBLE_LINES[0]!;
}
