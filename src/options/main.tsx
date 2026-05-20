import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { KeyRound, Lock, Save } from "lucide-react";
import "../styles/tailwind.css";
import { encryptString } from "../shared/crypto";
import { DEFAULT_SETTINGS, type AppSettings, type LlmProvider } from "../shared/schema";
import { getSettings, saveSettings } from "../shared/storage";

function OptionsApp() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [status, setStatus] = useState("Loading settings...");

  useEffect(() => {
    getSettings()
      .then((loaded) => {
        setSettings(loaded);
        setStatus("Settings loaded.");
      })
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : String(error)));
  }, []);

  const activeProvider = settings.activeProvider;
  const activeConfig = settings.providers[activeProvider];

  const updateProvider = (provider: LlmProvider) => {
    setSettings((current) => ({ ...current, activeProvider: provider }));
    setApiKeyDraft("");
  };

  const updateModel = (model: string) => {
    setSettings((current) => ({
      ...current,
      providers: {
        ...current.providers,
        [current.activeProvider]: {
          ...current.providers[current.activeProvider],
          model
        }
      }
    }));
  };

  const save = async () => {
    const nextSettings = { ...settings };

    if (apiKeyDraft.trim()) {
      nextSettings.providers[activeProvider] = {
        ...nextSettings.providers[activeProvider],
        encryptedApiKey: await encryptString(apiKeyDraft.trim())
      };
    }

    await saveSettings(nextSettings);
    setSettings(nextSettings);
    setApiKeyDraft("");
    setStatus("Saved locally. ChatTree never uses chrome.storage.sync.");
  };

  return (
    <main className="min-h-screen bg-chattree-panel px-6 py-8 text-chattree-ink">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-chattree-accent">
            <Lock size={16} />
            <span>Local configuration</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-normal">ChatTree Options</h1>
          <p className="mt-2 text-sm leading-6 text-chattree-muted">
            Add your own OpenAI or Anthropic key. The key is encrypted with a local AES-GCM wrapping key and stored in chrome.storage.local.
          </p>
        </header>

        <section className="rounded-md border border-chattree-line bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold" htmlFor="provider">
            LLM provider
          </label>
          <select
            id="provider"
            className="mb-4 w-full rounded-md border border-chattree-line px-3 py-2 outline-none focus:border-chattree-accent"
            value={activeProvider}
            onChange={(event) => updateProvider(event.target.value as LlmProvider)}
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>

          <label className="mb-2 block text-sm font-semibold" htmlFor="model">
            Model
          </label>
          <input
            id="model"
            className="mb-4 w-full rounded-md border border-chattree-line px-3 py-2 outline-none focus:border-chattree-accent"
            value={activeConfig.model}
            onChange={(event) => updateModel(event.target.value)}
          />

          <label className="mb-2 flex items-center gap-2 text-sm font-semibold" htmlFor="api-key">
            <KeyRound size={16} />
            <span>API key</span>
          </label>
          <input
            id="api-key"
            type="password"
            className="mb-2 w-full rounded-md border border-chattree-line px-3 py-2 outline-none focus:border-chattree-accent"
            value={apiKeyDraft}
            placeholder={activeConfig.encryptedApiKey ? "Key saved. Enter a new key to replace it." : "Paste API key"}
            onChange={(event) => setApiKeyDraft(event.target.value)}
          />
          <p className="mb-4 text-xs leading-5 text-chattree-muted">
            Conversation data stays in IndexedDB. Only settings and encrypted key material use chrome.storage.local.
          </p>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-chattree-accent px-4 py-2 text-sm font-semibold text-white"
            onClick={() => void save()}
          >
            <Save size={16} />
            Save settings
          </button>
        </section>

        <p className="mt-4 text-sm text-chattree-muted">{status}</p>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
);
