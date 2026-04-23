export interface Voice {
  id: string;
  name: string;
  gender: string;
  accent: string;
  description: string;
  color: string;
}

export const VOICES: Voice[] = [
  {
    id: "c69964a6-ab8b-4f8a-9465-ec0925096ec8",
    name: "Paul",
    gender: "Male",
    accent: "US English",
    description: "Warm and friendly",
    color: "#fa500f",
  },
  {
    id: "e3596645-b1af-469e-b857-f18ddedc7652",
    name: "Oliver",
    gender: "Male",
    accent: "British English",
    description: "Articulate and refined",
    color: "#4d8aff",
  },
  {
    id: "a3e41ea8-020b-44c0-8d8b-f6cc03524e31",
    name: "Jane",
    gender: "Female",
    accent: "British English",
    description: "Expressive and witty",
    color: "#ff6b9d",
  },
];

export const DEFAULT_VOICE = VOICES[2];
