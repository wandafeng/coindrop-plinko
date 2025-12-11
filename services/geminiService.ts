import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getLuckCommentary = async (caught: number, missed: number, totalScore: number) => {
  try {
    const prompt = `
      You are an energetic, fast-talking sports commentator covering a competitive "Money Catching" event.
      
      Here are the player's stats for this session:
      - Net Profit (Score): $${totalScore}
      - Items Caught: ${caught}
      - Good Items Missed: ${missed}

      Analyze their performance.
      - If they have a high catch count but low score, mock them for catching too many "Bombs" or bad deals.
      - If they have a high score, praise their precision and greed.
      - If they missed a lot, tease them about "letting money slip through their fingers".
      - Keep it short (under 2 sentences).
      - Do not include markdown formatting or quotes.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The commentator is out for a coffee break.";
  }
};