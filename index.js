/** @format */

require("dotenv").config();
const Groq = require("groq-sdk");

// to read the user input using the cli
const readline = require("readline-sync");

// to check that ki O.S kon sa h {window , mac  , linus}
const os = require("os");
const plateform = os.platform();

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Tool create karte h , jo kisi bhi terminal or shell command ko execute kr sakte h;
const { exec } = require("child_process");

// ye promish return krta h;
const { promisify } = require("util");
const asyncExecute = promisify(exec);
const fs = require("fs");
const path = require("path");

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
  type: "function",
  function: {
    name: "executeCommand",
    description:
      "Execute a single terminal/shell command, perfect for creating directories or installing packages.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description:
            "It will be a single terminal command ex: mkdir calculator",
        },
      },
      required: ["command"],
    },
  },
};

async function writeFile({ filePath, content }) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, "utf-8");
    return `Success: Wrote to file ${filePath}`;
  } catch (error) {
    return `Error: ${error}`;
  }
}

const writeFileDeclaration = {
  type: "function",
  function: {
    name: "writeFile",
    description:
      "Write code or content directy to a file on disk. Use this tool specifically when you want to add or create files with code inside.",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the file, e.g., 'calculator/index.html'",
        },
        content: {
          type: "string",
          description: "The full content or source code to write to the file.",
        },
      },
      required: ["filePath", "content"],
    },
  },
};

const avaliableTools = {
  executeCommand: executeCommand,
  writeFile: writeFile,
};

// build the AI agent

const History = [
  {
    role: "system",
    content: `You are an expert frontend website builder AI with full access to a tool called executeCommand that can run terminal/shell commands automatically.

                    Your job is to fully automate website creation based on user input.

                    Current OS: ${plateform}

                    ---

                    ## YOUR RESPONSIBILITIES:

                    1. Analyze the user query to understand what type of website they want (e.g., portfolio, calculator, landing page, dashboard, etc.)

                    2. Automatically:

                    * Use executeCommand to create a project folder
                    * Use writeFile to create multiple files at once exactly how you generated them (index.html, style.css, script.js, etc.)

                    3. DO NOT use complex inline echo commands or try to write file contents using executeCommand. Only use writeFile when writing code explicitly.

                    4. Commands must be OS-compatible (${plateform})

                    ---

                    ## EXECUTION FLOW:

                    Step 1: Create folder
                    Step 2: Create files
                    Step 3: Write code into files
                    Step 4: (Optional) Open project in browser or run live server

                    ---

                    ## OUTPUT RULES:

                    * Always execute commands step-by-step
                    * Do not explain too much
                    * Focus on automation
                    * Code must be clean and working
                    * UI should look modern (use good styling)

                    ---

                    ## EXAMPLE USER INPUT:

                    "Create a calculator website"

                    ---

                    ## EXPECTED BEHAVIOR:

                    * Create folder "calculator"
                    * Create index.html, style.css, script.js
                    * Write full working code automatically
                    * No manual steps required

                    ---

                    Your goal: ZERO manual work for the user.
                    Everything should be created and ready to run.

                                   `,
  },
];

async function runAgent(userProblem) {
  History.push({
    role: "user",
    content: userProblem,
  });

  // baar baar call krne ke liye kya pata ki eek baar call krne se reslut na aaye maan lo user
  // ne puch liya ki 3 or 4 ka sum batao or crypto ka current price btato to baar baar call krna hoga

  while (true) {
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: History,
        tools: [executeCommandDeclaration, writeFileDeclaration],
        tool_choice: "auto",
      });

      const message = response.choices[0].message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        History.push(message);

        for (const toolCall of message.tool_calls) {
          const name = toolCall.function.name;
          let args;
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            History.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: name,
              content:
                "JSON Parse Error on tool arguments. Please try again with simple arguments without complex escaping.",
            });
            continue;
          }

          const funCall = avaliableTools[name];
          const result = await funCall(args);

          History.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: name,
            content: result,
          });
        }
      } else {
        History.push({
          role: "assistant",
          content: message.content,
        });
        console.log(message.content);
        break;
      }
    } catch (e) {
      if (
        e.error &&
        e.error.error &&
        e.error.error.code === "tool_use_failed"
      ) {
        console.log(
          "Error: Groq failed to parse the tool call. Adjusting context...",
        );
        History.push({
          role: "user",
          content:
            "The previous tool call failed due to escaping issues. Please do NOT write large HTML code using single command line scripts. Provide instructions to me instead.",
        });
      } else {
        console.log("An API error occurred: ", e.message);
        break;
      }
    }
  }
}
async function main() {
  console.log("i am Glider : let's create a website");

  // take the question form the terminal
  const userProblem = readline.question("Ask me anything -> ");
  await runAgent(userProblem);
  main();
}
main();
