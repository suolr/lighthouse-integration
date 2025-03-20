# Installer Chrome pour Puppeteer et Lighthouse
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Créer le répertoire de l'application
WORKDIR /app

# Copier les fichiers de configuration et les scripts
COPY package*.json ./
COPY tsconfig.json ./

# Installer les dépendances
RUN npm install

# Copier le code source
COPY . .

# Compiler le TypeScript
RUN npm run build

# Créer le répertoire pour les rapports
RUN mkdir -p reports

# Exposer le port si nécessaire
# EXPOSE 3000

# Démarrer l'application
CMD ["node", "dist/index.js"]
