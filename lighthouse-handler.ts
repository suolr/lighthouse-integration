import * as chromeLauncher from 'chrome-launcher';
import * as fs from 'fs';
import * as path from 'path';

// Importation de lighthouse avec des vérifications de type
import lighthouse from 'lighthouse';

// Type pour les options de lighthouse
export interface LighthouseOptions {
  url: string;
  categories?: Array<'performance' | 'accessibility' | 'best-practices' | 'seo' | 'pwa'>;
  format?: 'html' | 'json' | 'pdf';
  outputPath?: string;
  onlyCategories?: boolean;
}

// Type pour les résultats lighthouse
interface LighthouseResult {
  lhr?: any;
  report?: string;
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
      
      // Exécuter l'analyse avec un type plus spécifique
      const result = await lighthouse(url, lighthouseConfig) as LighthouseResult;
      
      // Vérifier que le résultat est défini avant d'y accéder
      if (result && outputPath && result.report) {
        const outputFile = path.join(outputPath, `lighthouse-${new Date().toISOString().replace(/:/g, '-')}.${format}`);
        
        // Vérifier le type de report et le convertir en string si nécessaire
        const reportContent = typeof result.report === 'string' 
          ? result.report 
          : Array.isArray(result.report) 
            ? result.report.join('') 
            : JSON.stringify(result.report);
            
        fs.writeFileSync(outputFile, reportContent);
      }
      
      // Retourner les résultats avec des vérifications de nullité
      if (format === 'json' && result && result.lhr) {
        return result.lhr;
      } else if (result) {
        return {
          success: true,
          format,
          ...(outputPath ? { filePath: outputPath } : {}),
          report: result.report || ''
        };
      } else {
        return { success: false, error: "Failed to run Lighthouse" };
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
