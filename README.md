# Lighthouse Integration for Puppeteer MCP

A Model Context Protocol server that extends Puppeteer MCP with Google Lighthouse capabilities. This server enables LLMs to perform web performance audits, accessibility checks, and generate detailed reports while preserving all existing Puppeteer functionality.

## Components

### Tools

#### Existing Puppeteer Tools

- puppeteer_navigate

  - Navigate to any URL in the browser

  - Input: url (string)

- puppeteer_screenshot

  - Capture screenshots of the entire page or specific elements

  - Inputs:

    - name (string, required): Name for the screenshot

    - selector (string, optional): CSS selector for element to screenshot

    - width (number, optional, default: 800): Screenshot width

    - height (number, optional, default: 600): Screenshot height

- puppeteer_click, puppeteer_hover, puppeteer_fill, puppeteer_select, puppeteer_evaluate

  - Standard Puppeteer interaction tools

#### New Lighthouse Tools

- lighthouse_analyze

  - Perform complete Lighthouse audit on a website

  - Inputs:

    - url (string, required): URL to analyze

    - categories (array, optional): Categories to analyze ['performance', 'accessibility', 'best-practices', 'seo', 'pwa']

    - format (string, optional): Output format ('html', 'json', 'pdf')

    - outputPath (string, optional): Path to save the report

    - onlyMetrics (boolean, optional): Return only key metrics instead of full report

- lighthouse_get_metrics

  - Get key performance metrics for a website

  - Inputs:

    - url (string, required): URL to analyze

    - categories (array, optional): Categories to analyze

## Key Features

- Complete Web Performance Analysis - Evaluate websites across multiple performance metrics

- Accessibility Audits - Test for WCAG compliance and accessibility best practices

- Best Practices Checks - Ensure websites follow modern web development standards

- SEO Analysis - Assess search engine optimization factors

- PWA Validation - Test Progressive Web App capabilities

- Full Puppeteer Compatibility - Maintains all existing Puppeteer functionality

## Configuration to use Lighthouse Integration

### Docker

```json
{
  "mcpServers": {
    "lighthouse": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "--init", "-e", "DOCKER_CONTAINER=true", "mcp/lighthouse-integration"]
    }
  }
}
```

### NPX

```json
{
  "mcpServers": {
    "lighthouse": {
      "command": "npx",
      "args": ["-y", "@suolr/lighthouse-integration"]
    }
  }
}
```

## Build

Docker build:

```bash
docker build -t mcp/lighthouse-integration .
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
