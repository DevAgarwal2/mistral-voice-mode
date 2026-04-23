import { Mistral } from "@mistralai/mistralai";

if (!process.env.MISTRAL_API_KEY) {
  throw new Error("MISTRAL_API_KEY is not set");
}

export const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});
