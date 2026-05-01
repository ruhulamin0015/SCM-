import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getDemandForecast(productName: string, historicalData: any[]) {
  try {
    const prompt = `Act as a supply chain demand forecasting specialist. 
    Analyze the following historical stock changes for the product "${productName}" and predict the demand for the next 3 months.
    
    Data: ${JSON.stringify(historicalData)}
    
    Return the response as a JSON array of objects, one for each month, with the following schema:
    - month: string (e.g., "May 2026")
    - predictedDemand: number
    - confidence: number (0.0 to 1.0)
    - insights: string (brief explanation of the forecast)`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              month: { type: Type.STRING },
              predictedDemand: { type: Type.NUMBER },
              confidence: { type: Type.NUMBER },
              insights: { type: Type.STRING }
            },
            required: ["month", "predictedDemand", "confidence"]
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Forecasting Error:", error);
    return null;
  }
}

export async function analyzeDocument(documentText: string, historicalPrices: any[]) {
  try {
    const prompt = `Act as a Supply Chain Audit Specialist. 
    I have extracted text from a recent document (invoice, quote, or price list) and I want you to compare the prices found in it with our historical records.
    
    Document Text: 
    ${documentText}
    
    Historical Price Records:
    ${JSON.stringify(historicalPrices)}
    
    Please provide:
    1. A list of items found in the document with their extracted prices vs historical prices.
    2. A percentage change for each item.
    3. A clear final summary of whether we are paying more or less, and any recommended actions (e.g., "Negotiate with Supplier X as prices for Y have risen 15%").
    
    Return the response as a JSON object:
    {
      "comparisons": [
        { "itemName": string, "extractedPrice": number, "historicalPrice": number, "changePercent": number, "status": "higher" | "lower" | "stable" }
      ],
      "summary": string,
      "recommendation": string
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            comparisons: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  itemName: { type: Type.STRING },
                  extractedPrice: { type: Type.NUMBER },
                  historicalPrice: { type: Type.NUMBER },
                  changePercent: { type: Type.NUMBER },
                  status: { type: Type.STRING }
                },
                required: ["itemName", "extractedPrice", "historicalPrice", "changePercent", "status"]
              }
            },
            summary: { type: Type.STRING },
            recommendation: { type: Type.STRING }
          },
          required: ["comparisons", "summary", "recommendation"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Document Analysis Error:", error);
    return null;
  }
}

export async function getSmartAlerts(inventory: any[]) {
  try {
    const prompt = `Analyze this inventory and highlight critical issues (low stock, expiring units, surplus).
    
    Inventory: ${JSON.stringify(inventory)}
    
    Return a JSON array of alert objects:
    - type: "warning" | "error" | "info"
    - message: string
    - productId: string`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              message: { type: Type.STRING },
              productId: { type: Type.STRING }
            },
            required: ["type", "message"]
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Alerts Error:", error);
    return [];
  }
}
