import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const extensionDir = path.join(root, "dist");
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9300 + Math.floor(Math.random() * 500);
const profileDir = await mkdtemp(path.join(os.tmpdir(), "chattree-smoke-"));
const headed = process.env.SMOKE_HEADLESS === "0";
const smokeUrl = process.env.SMOKE_URL || "https://chatgpt.com/";
const debugLogs = [];

const chromeArgs = [
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--window-size=1200,900",
  "--window-position=-2400,-2400",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  `--disable-extensions-except=${extensionDir}`,
  `--load-extension=${extensionDir}`,
  "--enable-logging=stderr",
  "about:blank"
];

if (!headed) {
  chromeArgs.unshift("--headless=new");
}

const chrome = spawn(chromePath, chromeArgs, { stdio: ["ignore", "pipe", "pipe"] });
chrome.stderr.on("data", (chunk) => {
  debugLogs.push(String(chunk).trim());
  if (debugLogs.length > 20) {
    debugLogs.shift();
  }
});

try {
  await waitForChrome(port);
  const target = await createTarget(port, smokeUrl);
  const client = await connectCdp(target.webSocketDebuggerUrl);
  const runtimeEvents = [];

  await client.send("Runtime.enable");
  client.on("Runtime.exceptionThrown", (event) => runtimeEvents.push(event.exceptionDetails?.text ?? "Runtime exception"));
  client.on("Runtime.consoleAPICalled", (event) =>
    runtimeEvents.push(event.args?.map((arg) => arg.value ?? arg.description ?? "").join(" ") ?? "console")
  );
  await client.send("Page.enable");
  await wait(Number(process.env.SMOKE_WAIT_MS ?? 4500));
  await maybeAcceptGoogleConsent(client);

  const injectionResult = await evaluate(client, () => {
    const host = document.querySelector("#chattree-root");
    return {
      url: location.href,
      title: document.title,
      injected: Boolean(host?.shadowRoot),
      text: host?.shadowRoot?.textContent?.slice(0, 500) ?? ""
    };
  });

  if (!injectionResult.injected) {
    const targets = await listTargets(port);
    throw new Error(
      `ChatTree sidebar was not injected. Page title: ${injectionResult.title}. Targets: ${targets
        .map((item) => `${item.type}:${item.url}`)
        .join(" | ")}. Runtime: ${runtimeEvents.join(" || ")}. Chrome logs: ${debugLogs.join(" || ")}`
    );
  }

  await evaluate(client, () => {
    const main = document.querySelector("main") ?? document.body.appendChild(document.createElement("main"));
    const add = (element) => main.appendChild(element);
    const text = (element, value) => {
      element.textContent = value;
      return element;
    };

    if (location.hostname === "claude.ai") {
      const userOne = text(document.createElement("div"), "Help me read this paper introduction.");
      userOne.setAttribute("data-testid", "user-message");
      const assistant = text(document.createElement("div"), "This paper walkthrough explains the introduction.");
      assistant.setAttribute("data-testid", "assistant-message");
      const userTwo = text(document.createElement("div"), "What does fewer mean in English?");
      userTwo.setAttribute("data-testid", "user-message");
      add(userOne);
      add(assistant);
      add(userTwo);
      return;
    }

    if (location.hostname === "gemini.google.com") {
      add(text(document.createElement("user-query"), "Help me read this paper introduction."));
      add(text(document.createElement("model-response"), "This paper walkthrough explains the introduction."));
      add(text(document.createElement("user-query"), "What does fewer mean in English?"));
      return;
    }

    const userOne = document.createElement("article");
    userOne.dataset.messageId = "smoke-user-1";
    userOne.dataset.messageAuthorRole = "user";
    userOne.appendChild(text(document.createElement("div"), "Help me read this paper introduction."));
    const assistant = document.createElement("article");
    assistant.dataset.messageId = "smoke-assistant-1";
    assistant.dataset.messageAuthorRole = "assistant";
    assistant.appendChild(text(document.createElement("div"), "This paper walkthrough explains the introduction."));
    const userTwo = document.createElement("article");
    userTwo.dataset.messageId = "smoke-user-2";
    userTwo.dataset.messageAuthorRole = "user";
    userTwo.appendChild(text(document.createElement("div"), "What does fewer mean in English?"));
    add(userOne);
    add(assistant);
    add(userTwo);
  });
  await wait(1000);

  const sidebarResult = await evaluate(client, () => {
    const text = document.querySelector("#chattree-root")?.shadowRoot?.textContent ?? "";
    return {
      hasTree: text.includes("Tree"),
      hasNotes: text.includes("Notes"),
      hasSettings: text.includes("Settings"),
      hasInjectedMessage: text.includes("Help me read") || text.includes("What does fewer")
    };
  });

  if (!sidebarResult.hasTree || !sidebarResult.hasNotes || !sidebarResult.hasSettings) {
    throw new Error(`Sidebar tabs missing: ${JSON.stringify(sidebarResult)}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        page: injectionResult.url,
        injected: injectionResult.injected,
        tabs: {
          tree: sidebarResult.hasTree,
          notes: sidebarResult.hasNotes,
          settings: sidebarResult.hasSettings
        },
        parsedSmokeMessages: sidebarResult.hasInjectedMessage
      },
      null,
      2
    )
  );
} finally {
  chrome.kill();
  await waitForExit(chrome);
  await removeProfile(profileDir);
}

async function waitForChrome(debugPort) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) {
        return;
      }
    } catch {
      await wait(250);
    }
  }
  throw new Error("Chrome DevTools endpoint did not become ready.");
}

async function createTarget(debugPort, url) {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT"
  });
  if (!response.ok) {
    throw new Error(`Could not create Chrome target: ${response.status}`);
  }
  return response.json();
}

async function listTargets(debugPort) {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
  if (!response.ok) {
    return [];
  }
  return response.json();
}

function connectCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const callbacks = new Map();
  const eventHandlers = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && callbacks.has(message.id)) {
      const { resolve, reject } = callbacks.get(message.id);
      callbacks.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
    } else if (message.method && eventHandlers.has(message.method)) {
      for (const handler of eventHandlers.get(message.method)) {
        handler(message.params);
      }
    }
  });

  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => {
      resolve({
        on(method, handler) {
          eventHandlers.set(method, [...(eventHandlers.get(method) ?? []), handler]);
        },
        send(method, params = {}) {
          const requestId = ++id;
          socket.send(JSON.stringify({ id: requestId, method, params }));
          return new Promise((requestResolve, requestReject) => {
            callbacks.set(requestId, { resolve: requestResolve, reject: requestReject });
          });
        }
      });
    });
    socket.addEventListener("error", reject);
  });
}

async function evaluate(client, fn) {
  const result = await client.send("Runtime.evaluate", {
    expression: `(${fn.toString()})()`,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text);
  }
  return result.result.value;
}

async function maybeAcceptGoogleConsent(client) {
  const state = await evaluate(client, () => ({
    hostname: location.hostname,
    buttons: [...document.querySelectorAll("button")].map((button) => button.textContent?.trim() ?? "")
  }));

  if (state.hostname !== "consent.google.com") {
    return;
  }

  const clicked = await evaluate(client, () => {
    const labels = [/accept all/i, /i agree/i, /agree/i, /全部接受/, /同意/, /接受/];
    const button = [...document.querySelectorAll("button")].find((candidate) => {
      const text = candidate.textContent?.trim() ?? "";
      return labels.some((label) => label.test(text));
    });
    button?.click();
    return Boolean(button);
  });

  if (clicked) {
    await wait(6500);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForExit(process) {
  if (process.exitCode !== null || process.killed) {
    return wait(500);
  }
  return new Promise((resolve) => {
    process.once("exit", resolve);
    setTimeout(resolve, 3000);
  });
}

async function removeProfile(profilePath) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rm(profilePath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (error?.code !== "EBUSY" && error?.code !== "EPERM") {
        throw error;
      }
      await wait(500);
    }
  }
}
