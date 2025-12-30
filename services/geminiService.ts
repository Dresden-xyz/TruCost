
import { GoogleGenAI, Type, Modality } from "@google/genai";

export const geminiService = {
  /**
   * Use Search Grounding to find product details.
   */
  async searchPriceInfo(query: string, currency: string = 'USD') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find the current typical price for "${query}" in ${currency}. Also list 3-5 specific model matches if applicable. 
      For each match, provide the Name, Price, and a brief description. 
      Format each product strictly as: PRODUCT: [name] | PRICE: [price] | DESC: [description]`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => chunk.web).filter(Boolean) || [];
    const results: any[] = [];
    const responseText = response.text || "";
    const lines = responseText.split('\n');
    for (const line of lines) {
      if (line.includes('PRODUCT:') && line.includes('PRICE:')) {
        try {
          const parts = line.split('|');
          const namePart = parts.find(p => p.includes('PRODUCT:'))?.replace('PRODUCT:', '').trim();
          const pricePart = parts.find(p => p.includes('PRICE:'))?.replace('PRICE:', '').replace(/[^0-9.]/g, '').trim();
          const descPart = parts.find(p => p.includes('DESC:'))?.replace('DESC:', '').trim();
          
          if (namePart && pricePart) {
            results.push({
              name: namePart,
              price: parseFloat(pricePart),
              description: descPart || '',
              imageUrl: `https://picsum.photos/seed/${encodeURIComponent(namePart)}/200/200`
            });
          }
        } catch (e) {
        }
      }
    }

    return { results, links, rawText: responseText };
  },

  async findStoresNearby(item: string, lat: number, lng: number) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find stores where I can buy ${item} nearby.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        }
      },
    });

    return {
      text: response.text,
      links: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => chunk.maps).filter(Boolean) || []
    };
  },

  async editProductImage(base64Image: string, prompt: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      }
    });

    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  },

  async animateProduct(base64Image: string, prompt: string = "Show this product being used elegantly") {
    if (!(await (window as any).aistudio.hasSelectedApiKey())) {
      await (window as any).aistudio.openSelectKey();
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: {
          imageBytes: cleanBase64,
          mimeType: 'image/jpeg',
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '9:16'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      if (error?.message?.includes("Requested entity was not found.")) {
        await (window as any).aistudio.openSelectKey();
      }
      throw error;
    }
  },

  /**
   * Generates a timeline visualization video for a goal.
   */
  async generateGoalTimelineVideo(goalName: string) {
    if (!(await (window as any).aistudio.hasSelectedApiKey())) {
      await (window as any).aistudio.openSelectKey();
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `A cinematic 3D animation of a minimalist timeline or progress bar filling up steadily with a bright glowing neon light. The color scheme is professional royal blue and mint green. At the end of the path, a glowing symbol representing "${goalName}" appears. Smooth motion graphics, clean background.`;

    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      if (error?.message?.includes("Requested entity was not found.")) {
        await (window as any).aistudio.openSelectKey();
      }
      throw error;
    }
  }
};
