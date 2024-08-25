import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

async function run() {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = "Write the zen of python";

    const result = await model.generateContent(prompt);
    const text = result.response.text;
    console.log(text);
}

run();