/** @format */

require("dotenv").config();
const { GoogleGenAI, Type } = require("@google/genai");

// to read the user input using the cli
const readline = require("readline-sync");

// to check that ki O.S kon sa h {window , mac  , linus}
const os  = require('os');
const plateform = os.platform();


// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Tool create karte h , jo kisi bhi terminal or shell command ko execute kr sakte h;
const { exec } = require("child_process");

// ye promish return krta h;
const { promisify } = require('util')
const asyncExecute = promisify(exec)

async function executeCommand({ command }) {
    try {
        // jo bhi command aaye gi vo aapne aap run ho gaye gi
        const { stdout, stderror } = await asyncExecute(command);

        if (stderror) {
            return `Error : ${stderror}`;
        }
        return `Success : ${stdout} || Task is done`;

    } catch (error) {
        return `Error : ${error}`;
    }
}


const executeCommandDeclaration = {
    name: "executeCommand",
    description: "Execute a signle terminal/shell command. A command can be to create a folder , file , write or a file , edit the file or delete the file",
    parameters: {
        type: Type.OBJECT,
        properties: {
            command: {
                type: Type.STRING,
                description: "It will be a single terminal command ex: mkdir calulator",
            },
        },
        required: ["command"],
    },

}


const avaliableTools = {
    executeCommand: executeCommand,
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
                systemInstruction:`you are an wedsite buider expert. you have to create the frontend of the website by analysing the
                                   user input you have access of tool which can run/execute any shell/terminal command
                                   current user Operating system is ${plateform} give command to the user according to its Operating system support.
                                   <-- what is your Job -->
                                   1. analysing the user query to see what type of website they want to build
                                   2. Give them command one by one , step by step
                                   3. Use avaliable tool executeCommand

                                   // now you can give them command in following below
                                   1. First create a folder , example: mkdir "calculator"
                                   2. Iside the folder , create index.html , example: touch "calculator/index.html"
                                   3. Then create system.css
                                   4. Then create script.js
                                   5. Then write a code in html file
                                   
                                   Youe have to provide the terminal or shell command to user , they will directly execute it
                                   `,
                tools: [
                    {
                        functionDeclarations: [executeCommandDeclaration],
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
