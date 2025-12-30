#!/bin/bash

# Define o nome do arquivo de saída
OUTPUT_FILE="mobile_code_full.txt"

# ----------------------------------------------------
# 1. Limpa ou Cria o arquivo de saída
# ----------------------------------------------------
echo "Iniciando a coleta de código-fonte React Native..."
echo "--------------------------------------------------" > "$OUTPUT_FILE"
echo "Código-Fonte do Projeto Mobile (React Native)" >> "$OUTPUT_FILE"
echo "Gerado em: $(date)" >> "$OUTPUT_FILE"
echo "--------------------------------------------------" >> "$OUTPUT_FILE"

# ----------------------------------------------------
# 2. Coleta Arquivos .ENV (Segurança: Estes arquivos contêm segredos!)
# ----------------------------------------------------
echo -e "\n\n<<< ARQUIVOS DE AMBIENTE (.ENV) >>>" >> "$OUTPUT_FILE"
echo "==================================================" >> "$OUTPUT_FILE"
echo "ATENÇÃO: ESTES ARQUIVOS CONTÊM SEGREDOS!" >> "$OUTPUT_FILE"
echo "==================================================" >> "$OUTPUT_FILE"

find . -maxdepth 1 -type f -name ".env*" | while read -r file; do
    echo -e "\n##################################################" >> "$OUTPUT_FILE"
    echo "# ROTA: $file" >> "$OUTPUT_FILE"
    echo "##################################################" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo -e "\n" >> "$OUTPUT_FILE"
done

# ----------------------------------------------------
# 3. Coleta Arquivos de Configuração e Entrada na Raiz
# ----------------------------------------------------
echo -e "\n\n<<< CONFIGURAÇÕES E ENTRY POINTS (RAIZ) >>>" >> "$OUTPUT_FILE"

# Procura arquivos importantes na raiz
find . -maxdepth 1 -type f \( \
    -name "App.tsx" -o \
    -name "App.js" -o \
    -name "index.js" -o \
    -name "package.json" -o \
    -name "app.json" -o \
    -name "tsconfig.json" -o \
    -name "babel.config.js" -o \
    -name "metro.config.js" -o \
    -name "react-native.config.js" \
\) | sort | while read -r file; do
    echo -e "\n\n##################################################" >> "$OUTPUT_FILE"
    echo "# ROTA: $file" >> "$OUTPUT_FILE"
    echo "##################################################" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
done

# ----------------------------------------------------
# 4. Coleta Código-Fonte (Pastas do Projeto)
# ----------------------------------------------------
echo -e "\n\n<<< CÓDIGO-FONTE (ESTRUTURA COMPLETA) >>>" >> "$OUTPUT_FILE"

# LISTA DE PASTAS BASEADA NO SEU PRINT
# Adicionei: assets, components, constants, contexts, hooks, scripts, services, utils
# Mantive 'src' caso você crie no futuro.
TARGET_DIRS="app src assets components constants contexts hooks scripts services utils"

# O comando find abaixo procura nessas pastas. 
# O "2>/dev/null" serve para não dar erro se alguma pasta (como src) não existir.
find $TARGET_DIRS -type f 2>/dev/null \( \
    -name "*.tsx" -o \
    -name "*.ts" -o \
    -name "*.jsx" -o \
    -name "*.js" -o \
    -name "*.json" -o \
    -name "*.svg" \
\) | grep -v "node_modules" | grep -v "dist" | grep -v ".test." | grep -v ".spec." | sort | while read -r file; do
    
    # Verifica se é arquivo de texto (evita pegar imagens PNG/JPG dentro de assets)
    if file "$file" | grep -q "text"; then
        echo -e "\n\n##################################################" >> "$OUTPUT_FILE"
        echo "# ROTA: $file" >> "$OUTPUT_FILE"
        echo "##################################################" >> "$OUTPUT_FILE"
        cat "$file" >> "$OUTPUT_FILE"
    fi
done

echo -e "\n\n--------------------------------------------------" >> "$OUTPUT_FILE"
echo "Coleta concluída!" >> "$OUTPUT_FILE"
echo "Conteúdo salvo em: $OUTPUT_FILE"
echo "--------------------------------------------------"