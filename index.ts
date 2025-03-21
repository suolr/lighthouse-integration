#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/server/index.js";
import * as puppeteer from "puppeteer";
import { LighthouseHandler, LighthouseOptions } from "./lighthouse-handler.js";

const TOOL_PREFIX = "puppeteer";
const LIGHTHOUSE_PREFIX = "lighthouse";

let browser: puppeteer.Browser | null = null;
let pages: Map<string, puppeteer.Page> = new Map();
let pageId = 0;

// Créer l'instance du gestionnaire Lighthouse
const lighthouseHandler = new LighthouseHandler();

// Ouvrir le navigateur
async function openBrowser() {
  if (browser) {
    try {
      await browser.close();
    } catch (e) {
      console.error("Error closing browser:", e);
    }
  }
  
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  
  pages = new Map();
  pageId = 0;
}

// Obtenir la page actuelle ou en créer une nouvelle
async function getCurrentPage() {
  if (!browser) {
    await openBrowser();
  }
  
  const currentPageId = `page_${pageId}`;
  if (!pages.has(currentPageId)) {
    const page = await browser!.newPage();
    pages.set(currentPageId, page);
  }
  
  return pages.get(currentPageId)!;
}

// Outils Puppeteer
const tools: Record<string, (args: any) => Promise<any>> = {
  // Outils Puppeteer existants
  [`${TOOL_PREFIX}_navigate`]: async (args: any) => {
    const page = await getCurrentPage();
    await page.goto(args.url, { waitUntil: "networkidle0" });
    return `Navigated to ${args.url}`;
  },
  
  [`${TOOL_PREFIX}_screenshot`]: async (args: any) => {
    const page = await getCurrentPage();
    const width = args.width || 800;
    const height = args.height || 600;
    await page.setViewport({ width, height });
    
    if (args.selector) {
      const element = await page.$(args.selector);
      if (!element) {
        throw new Error(`Element with selector "${args.selector}" not found`);
      }
      
      const screenshot = await element.screenshot();
      return {
        output: `Screenshot '${args.name}' taken of element ${args.selector}`,
        output_image: screenshot.toString("base64"),
      };
    } else {
      const screenshot = await page.screenshot();
      return {
        output: `Screenshot '${args.name}' taken at ${width}x${height}`,
        output_image: screenshot.toString("base64"),
      };
    }
  },
  
  [`${TOOL_PREFIX}_click`]: async (args: any) => {
    const page = await getCurrentPage();
    try {
      await page.click(args.selector);
      return `Clicked ${args.selector}`;
    } catch (e: any) {
      throw new Error(`Failed to click ${args.selector}: ${e.message}`);
    }
  },
  
  [`${TOOL_PREFIX}_fill`]: async (args: any) => {
    const page = await getCurrentPage();
    await page.type(args.selector, args.value);
    return `Filled ${args.selector} with ${args.value}`;
  },
  
  [`${TOOL_PREFIX}_select`]: async (args: any) => {
    const page = await getCurrentPage();
    await page.select(args.selector, args.value);
    return `Selected ${args.value} in ${args.selector}`;
  },
  
  [`${TOOL_PREFIX}_hover`]: async (args: any) => {
    const page = await getCurrentPage();
    await page.hover(args.selector);
    return `Hovered over ${args.selector}`;
  },
  
  [`${TOOL_PREFIX}_evaluate`]: async (args: any) => {
    const page = await getCurrentPage();
    const logEntries: string[] = [];
    
    page.on("console", (msg) => {
      logEntries.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    const result = await page.evaluate(args.script);
    return {
      "Execution result:": result,
      "Console output:": logEntries.join("\n"),
    };
  },
  
  // Nouveaux outils Lighthouse
  [`${LIGHTHOUSE_PREFIX}_analyze`]: async (args: any) => {
    try {
      const options: LighthouseOptions = {
        url: args.url,
        categories: args.categories || ['performance', 'accessibility', 'best-practices', 'seo'],
        format: args.format || 'json',
        outputPath: args.outputPath || './reports'
      };
      
      const results = await lighthouseHandler.runLighthouse(options);
      
      if (args.onlyMetrics) {
        const metrics = lighthouseHandler.extractKeyMetrics(results);
        return {
          success: true,
          metrics
        };
      }
      
      return results;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  [`${LIGHTHOUSE_PREFIX}_get_metrics`]: async (args: any) => {
    try {
      const options: LighthouseOptions = {
        url: args.url,
        categories: args.categories || ['performance'],
        onlyCategories: true
      };
      
      const results = await lighthouseHandler.runLighthouse(options);
      const metrics = lighthouseHandler.extractKeyMetrics(results);
      
      return {
        success: true,
        metrics
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Descriptions des outils
const toolDescriptions = [
  {
    name: `${TOOL_PREFIX}_navigate`,
    description: "Navigate to a URL",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" },
      },
      required: ["url"],
    },
  },
  {
    name: `${TOOL_PREFIX}_screenshot`,
    description: "Take a screenshot of the current page or a specific element",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the screenshot" },
        selector: {
          type: "string",
          description: "CSS selector for element to screenshot",
        },
        width: { type: "number", description: "Width in pixels (default: 800)" },
        height: { type: "number", description: "Height in pixels (default: 600)" },
      },
      required: ["name"],
    },
  },
  {
    name: `${TOOL_PREFIX}_click`,
    description: "Click an element on the page",
    parameters: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for element to click",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: `${TOOL_PREFIX}_fill`,
    description: "Fill out an input field",
    parameters: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for input field" },
        value: { type: "string", description: "Value to fill" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: `${TOOL_PREFIX}_select`,
    description: "Select an element on the page with Select tag",
    parameters: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for element to select",
        },
        value: { type: "string", description: "Value to select" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: `${TOOL_PREFIX}_hover`,
    description: "Hover an element on the page",
    parameters: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector for element to hover",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: `${TOOL_PREFIX}_evaluate`,
    description: "Execute JavaScript in the browser console",
    parameters: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript code to execute" },
      },
      required: ["script"],
    },
  },
  // Descriptions des outils Lighthouse
  {
    name: `${LIGHTHOUSE_PREFIX}_analyze`,
    description: "Analyze a website using Google Lighthouse",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to analyze" },
        categories: { 
          type: "array", 
          items: { type: "string", enum: ["performance", "accessibility", "best-practices", "seo", "pwa"] },
          description: "Categories to analyze" 
        },
        format: { 
          type: "string", 
          enum: ["html", "json", "pdf"],
          description: "Output format" 
        },
        outputPath: { type: "string", description: "Path to save the report" },
        onlyMetrics: { type: "boolean", description: "Return only key metrics instead of full report" }
      },
      required: ["url"],
    },
  },
  {
    name: `${LIGHTHOUSE_PREFIX}_get_metrics`,
    description: "Get key performance metrics for a website using Lighthouse",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to analyze" },
        categories: { 
          type: "array", 
          items: { type: "string", enum: ["performance", "accessibility", "best-practices", "seo", "pwa"] },
          description: "Categories to analyze" 
        }
      },
      required: ["url"],
    },
  }
];

// Initialiser le serveur
async function main() {
  try {
    console.error("Starting Lighthouse Integration MCP Server...");
    await openBrowser();
    
    // Créer le transport
    const transport = new StdioServerTransport();
    
    // Créer le serveur
    // Utilisez la méthode de création de serveur qui fonctionne avec votre version de MCP
    const server = new Server(transport);
    console.error("Server created");
    
    // Enregistrer les gestionnaires en utilisant la méthode handle qui existe dans votre version
    server.handle(ListToolsRequestSchema, () => {
      console.error("Tools requested");
      return {
        tools: toolDescriptions,
      };
    });
    
    server.handle(ListResourcesRequestSchema, () => {
      console.error("Resources requested");
      return {
        resources: [],
      };
    });
    
    server.handle(ReadResourceRequestSchema, async () => {
      console.error("Resource read requested");
      return {
        content: "",
      };
    });
    
    server.handle(CallToolRequestSchema, async (request: { name: string; parameters: any }) => {
      console.error(`Tool call requested: ${request.name}`);
      const tool = request.name;
      
      if (!(tool in tools)) {
        console.error(`Tool ${tool} not found`);
        return {
          error: `Tool ${tool} not found`,
        };
      }
      
      try {
        console.error(`Executing tool ${tool}`);
        const result = await tools[tool](request.parameters);
        console.error(`Tool ${tool} executed successfully`);
        return { result };
      } catch (e: any) {
        console.error(`Error executing tool ${tool}: ${e.message}`);
        return {
          error: e.message,
        };
      }
    });
    
    // Démarrer le serveur en utilisant la méthode qui existe dans votre version
    console.error("Starting server...");
    await server.start();
    console.error("Server started successfully");
    
    // Garder le processus actif
    process.on("SIGINT", async () => {
      console.error("SIGINT received, closing browser...");
      if (browser) {
        await browser.close();
      }
      process.exit(0);
    });
  } catch (e) {
    console.error("Error starting server:", e);
    process.exit(1);
  }
}

// Lancer le serveur
main();
