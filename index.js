/** @format */

require("dotenv").config();
const { GoogleGenAI, Type } = require("@google/genai");

const readline = require("readline-sync");

// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// sum of 2 num
const sum = ({ num1, num2 }) => {
  return num1 + num2;
};

// prime num
const prime = ({ num }) => {
  if (num < 2) {
    return false;
  }
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i == 0) return false;
  }
  return true;
};

// crypto
const crypto = async ({ coin }) => {
  const price = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin}`,
  );
  const data = await price.json();
  return data;
};

// muje ye pta chal jaye ki
// kon sa function call krna h =>  ye bataye ga LLM
// kya argument pass karni h => ye bhi LLM bataye ga

const sumDecleration = {
  name: "sum",
  description: "this function takes 2 number as input and gives its sum",
  parameters: {
    type: Type.OBJECT,
    properties: {
      num1: {
        type: Type.NUMBER,
        description: "it will be first number for addition ex: 10",
      },
      num2: {
        type: Type.NUMBER,
        description: "it will be second number for addition ex: 13",
      },
    },
    required: ["num1", "num2"],
  },
};

const primeDecleration = {
  name: "prime",
  description: "number is prime or not",
  parameters: {
    type: Type.OBJECT,
    properties: {
      num: {
        type: Type.NUMBER,
        description: "It will be the number to find it is prime or not ex: 13",
      },
    },
    required: ["num"],
  },
};

const cryptoDecleration = {
  name: "crypto",
  description: "get the current prise of any crypto Currency like solana",
  parameters: {
    type: Type.OBJECT,
    properties: {
      coin: {
        type: Type.STRING,
        description: "It will be the crypto Currency name like solana",
      },
    },
    required: ["coin"],
  },
};

const avaliableTools = {
  sum: sum,
  prime: prime,
  crypto: crypto,
};

// build the AI agent

const History = [];
async function runAgent(userProblem) {
  History.push({
    role: "user",
    parts: [{ text: userProblem }],
  });

  // baar baar call krne ke liye kya pata ki eek baar call krne se reslut na aaye maan lo user
  // ne puch liya ki 3 or 4 ka sum batao or crypto ka current price btato to baar baar call krna hoga

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Correct model spelling
      contents: History,
      config: {
        systemInstruction:
          "you are an AI Agent, you have access of 3 avaible tools like to find sum of 2 num , get crypto price of any coin and find number is prime or not use this tool whenever required to confirm user query if user ask general question you can answer id directly if you dont't need help og these 3 tool",
        tools: [
          {
            functionDeclarations: [
              sumDecleration,
              primeDecleration,
              cryptoDecleration,
            ],
          },
        ],
      },
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      //   console.log(call)
      const name = call.name;
      const args = call.args;

      const funCall = avaliableTools[name];
      const result = await funCall(args);

      // model
      History.push({
        role: "model",
        parts: [
          {
            functionCall: call,
          },
        ],
      });

      // result
      const functionResponse = {
        name: name,
        response: {
          result: result,
        },
      };

      // push in history
      History.push({
        role: "user",
        parts: [
          {
            functionResponse: functionResponse,
          },
        ],
      });
    } else {
      History.push({
        role: "model",
        parts: [{ text: response.text }],
      });
      console.log(response.text);
      break;
    }
  }
}
async function main() {
  // take the question form the terminal
  const userProblem = readline.question("Ask me anything -> ");
  await runAgent(userProblem);
  main();
}
main();
