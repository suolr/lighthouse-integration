import * as lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import * as fs from 'fs';
import * as path from 'path';

// Type pour les options de lighthouse
export interface LighthouseOptions {
  url: string;
  categories?: Array<'performance' | 'accessibility' | 'best-practices' | 'seo' | 'pwa'>;
  format?: 'html' | 'json' | 'pdf';
  outputPath?: string;
  onlyCategories?: boolean;
}

// Classe pour gérer les analyses Lighthouse
export class LighthouseHandler {
  
  /**
   * Exécute une analyse Lighthouse sur l'URL spécifiée
   * @param options Options pour l'analyse Lighthouse
   * @returns Résultat de l'analyse
   */
  public async runLighthouse(options: LighthouseOptions): Promise<any> {
    const { url, categories = ['performance', 'accessibility', 'best-practices', 'seo'], 
            format = 'json', outputPath, onlyCategories = false } = options;
    
    // Lancer Chrome
    const chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox']
    });
    
    try {
      // Configuration de lighthouse
      const lighthouseConfig: any = {
        port: chrome.port,
        output: format,
        onlyCategories: onlyCategories ? categories : undefined,
        logLevel: 'info'
      };
      
      // Exécuter l'analyse
      const result = await lighthouse(url, lighthouseConfig);
      
      // Gérer le résultat selon le format demandé
      if (outputPath && result.report) {
        const outputFile = path.join(outputPath, `lighthouse-${new Date().toISOString().replace(/:/g, '-')}.${format}`);
        fs.writeFileSync(outputFile, result.report);
      }
      
      // Retourner les résultats
      if (format === 'json') {
        return result.lhr;
      } else {
        return {
          success: true,
          format,
          ...(outputPath ? { filePath: outputPath } : {}),
          report: result.report
        };
      }
    } finally {
      // Toujours fermer Chrome
      await chrome.kill();
    }
  }
  
  /**
   * Extraire les métriques clés des résultats Lighthouse
   * @param results Résultats complets de Lighthouse
   * @returns Métriques clés
   */
  public extractKeyMetrics(results: any): Record<string, any> {
    if (!results || !results.audits) {
      return { error: 'Invalid Lighthouse results' };
    }
    
    // Extraire les métriques principales
    const metrics: Record<string, any> = {};
    
    // Performance
    if (results.categories?.performance) {
      metrics.performanceScore = Math.round(results.categories.performance.score * 100);
    }
    
    // Accessibility
    if (results.categories?.accessibility) {
      metrics.accessibilityScore = Math.round(results.categories.accessibility.score * 100);
    }
    
    // Best Practices
    if (results.categories?.['best-practices']) {
      metrics.bestPracticesScore = Math.round(results.categories['best-practices'].score * 100);
    }
    
    // SEO
    if (results.categories?.seo) {
      metrics.seoScore = Math.round(results.categories.seo.score * 100);
    }
    
    // Métriques spécifiques
    const keyAudits = [
      'first-contentful-paint',
      'largest-contentful-paint',
      'total-blocking-time',
      'cumulative-layout-shift',
      'speed-index',
      'interactive'
    ];
    
    for (const audit of keyAudits) {
      if (results.audits[audit]) {
        metrics[audit] = {
          score: results.audits[audit].score,
          value: results.audits[audit].numericValue,
          displayValue: results.audits[audit].displayValue
        };
      }
    }
    
    return metrics;
  }
}
