const fs = require('fs');
const file = 'src/components/IA/IAConfigPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replacement 1: loadAll
content = content.replace(
  /const c = dataC\.config as IAConfig;\s*setConfig\(c\);\s*setProvider\(c\.provider \|\| 'lmstudio'\);\s*setEndpoint\(c\.endpoint \|\| ''\);\s*setApiKey\(c\.api_key \|\| ''\);\s*setModelDefault\(c\.model_default \|\| ''\);\s*setMaxTokens\(c\.max_tokens \|\| 8192\);\s*setTemperatura\(c\.temperatura \|\| 0\.7\);\s*setSystemPrompt\(c\.system_prompt \|\| ''\);/g,
  `const c = dataC.config as IAConfig;
        setConfig(c);
        
        const activeProv = c.provider || 'lmstudio';
        setProvider(activeProv);
        
        if (c.provider_settings && c.provider_settings[activeProv]) {
          const settings = c.provider_settings[activeProv];
          setEndpoint(settings.endpoint || c.endpoint || '');
          setApiKey(settings.api_key || c.api_key || '');
          setModelDefault(settings.model_default || c.model_default || '');
        } else {
          setEndpoint(c.endpoint || '');
          setApiKey(c.api_key || '');
          setModelDefault(c.model_default || '');
        }

        setMaxTokens(c.max_tokens || 8192);
        setTemperatura(c.temperatura || 0.7);
        setSystemPrompt(c.system_prompt || '');`
);

// Replacement 2: handleProviderSwitch
content = content.replace(
  /useEffect\(\(\) => \{\s*loadAll\(\);\s*\}, \[loadAll\]\);/g,
  `useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleProviderSwitch = (newProvider: 'lmstudio' | 'llamacpp') => {
    setProvider(newProvider);
    if (config?.provider_settings?.[newProvider]) {
      const settings = config.provider_settings[newProvider];
      setEndpoint(settings.endpoint || '');
      setApiKey(settings.api_key || '');
      setModelDefault(settings.model_default || '');
    } else {
      setEndpoint('');
      setApiKey('');
      setModelDefault('');
    }
  };`
);

// Replacement 3: handleSaveConfig
content = content.replace(
  /body: JSON\.stringify\(\{\s*provider,\s*endpoint: endpoint\.trim\(\),\s*api_key: apiKey\.trim\(\),\s*model_default: modelDefault\.trim\(\),\s*max_tokens: maxTokens,\s*temperatura,\s*system_prompt: systemPrompt\.trim\(\),\s*\}\),/g,
  `body: ***REMOVED***
          provider,
          endpoint: endpoint.trim(),
          api_key: apiKey.trim(),
          model_default: modelDefault.trim(),
          provider_settings: {
            ...config?.provider_settings,
            [provider]: {
              endpoint: endpoint.trim(),
              api_key: apiKey.trim(),
              model_default: modelDefault.trim()
            }
          },
          max_tokens: maxTokens,
          temperatura,
          system_prompt: systemPrompt.trim(),
        }),`
);

// Replacement 4: UI buttons
content = content.replace(
  /onClick=\{\(\) => setProvider\('lmstudio'\)\}/g,
  `onClick={() => handleProviderSwitch('lmstudio')}`
);
content = content.replace(
  /onClick=\{\(\) => setProvider\('llamacpp'\)\}/g,
  `onClick={() => handleProviderSwitch('llamacpp')}`
);

// Replacement 5: Add IsRemote Toggle for Server
content = content.replace(
  /<label className="block text-sm font-medium text-gray-700 mb-1">Binário \(Path\)<\/label>/g,
  `<div className="flex items-center gap-2 mb-4 col-span-1 md:col-span-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <input
                    type="checkbox"
                    id="is_remote"
                    checked={serverConfig?.is_remote || false}
                    onChange={(e) => handleSaveServerConfig({ is_remote: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_remote" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Executar remotamente (Linux LlamaCpp na nuvem)
                  </label>
                  <span className="text-xs text-gray-500 ml-2">Monitora via ping ao invés de rodar via spawn.</span>
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Binário (Path)</label>`
);

fs.writeFileSync(file, content);
console.log('Done');
