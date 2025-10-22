// src/components/ai/AIDesignAssistant.tsx
import React, { useState } from 'react';

interface Suggestion {
  id: number;
  text: string;
}

const AIDesignAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // TODO: integrate with ClaudeCode or other AI service
      // For now, generate dummy suggestions based on the prompt
      const dummy: Suggestion[] = [
        { id: 1, text: `Try exploring alternative layouts for: ${prompt}` },
        { id: 2, text: `Consider using contrast and spacing to emphasise elements for: ${prompt}` },
      ];
      setSuggestions(dummy);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h2 className="text-xl font-bold mb-2">AI Design Assistant</h2>
      <p className="mb-2 text-sm text-gray-600">
        Enter a description of what you're trying to create and get AI-powered suggestions.
      </p>
      <div className="flex mb-4">
        <input
          type="text"
          className="flex-1 border p-2 mr-2 rounded"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your design concept..."
        />
        <button
          onClick={handleGenerate}
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={loading || prompt.trim() === ''}
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>
      {suggestions.length > 0 && (
        <ul className="list-disc pl-5 space-y-1">
          {suggestions.map((s) => (
            <li key={s.id}>{s.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AIDesignAssistant;
