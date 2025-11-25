const fetch = require('node-fetch'); // Make sure node-fetch is installed: npm install node-fetch@2

async function listGeminiModels() {
    // IMPORTANT: Use your actual API key here.
    const apiKey = "AIzaSyAxChDly-jvemdkFKxC4-ujQCYdNs3gigw";
    const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        console.log("Fetching available models from:", listModelsUrl);
        const response = await fetch(listModelsUrl);
        const data = await response.json();

        if (!response.ok) {
            console.error("Error listing models:", data);
            return;
        }

        console.log("\n✅ Available Gemini Models that support 'generateContent':");
        data.models.forEach(model => {
            // Filter for models that support text generation (generateContent)
            if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes('generateContent')) {
                console.log(`- Name: ${model.name}`);
                console.log(`  (Display Name: ${model.displayName || 'N/A'})\n`);
            }
        });

    } catch (error) {
        console.error("Request Error:", error);
    }
}

listGeminiModels();