// Importação das dependências necessárias para o servidor
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

// Criação da instância do aplicativo Express e definição da porta
const app = express();
const port = 3000;

// Rota principal para servir o arquivo HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Função assíncrona para obter a posição de um produto na pesquisa da Amazon
async function getPositionOnAmazon(keyword, asin) {
  const maxPages = 5;

  // Iteração através das páginas de resultados da pesquisa
  for (let page = 1; page <= maxPages; page++) {
    const url = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}&page=${page}`;

    console.log(`Fetching data from: ${url}`);

    try {
      // Requisição HTTP utilizando o Axios, incluindo um cabeçalho de agente de usuário simulado
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/webkit-version (KHTML, like Gecko) Silk/browser-version like Chrome/chrome-version Safari/webkit-version',
        },
      });

      console.log(`Received response for page ${page}: ${response.status}`);

      // Utilização do Cheerio para analisar o HTML da página
      const $ = cheerio.load(response.data);

      // Chamada à função auxiliar para encontrar a posição do produto pelo ASIN
      const position = findPositionByAsin($, asin);

      // Se a posição for encontrada, retorna imediatamente
      if (position !== -1) {
        return position;
      }
    } catch (error) {
      console.error(`Error processing page ${page}: ${error.message}`);
      // Lança uma exceção personalizada para ser capturada no bloco catch externo
      throw new Error(`Failed to process page ${page}`);
    }
  }

  // Retorna -1 se a posição não for encontrada em nenhuma página
  return -1;
}

// Função auxiliar para encontrar a posição de um produto pelo ASIN
function findPositionByAsin($, targetAsin) {
  let position = -1;

  // Iteração através dos elementos de resultado na página
  $('.s-result-item').each((index, element) => {
    const productAsin = $(element).data('asin');
    // Se o ASIN do produto coincidir com o ASIN de destino, define a posição e encerra o loop
    if (productAsin === targetAsin) {
      position = index + 1;
      return false;
    }
  });

  return position;
}

// Rota para manipular a solicitação de pesquisa
app.get('/search/:keyword/:asin', async (req, res) => {
  try {
    // Obtém os parâmetros da solicitação
    const { keyword, asin } = req.params;
    
    // Chama a função assíncrona para obter a posição do produto
    const position = await getPositionOnAmazon(keyword, asin);
    
    // Retorna a posição como resposta JSON
    res.json({ position });
  } catch (error) {
    console.error(`Search request failed: ${error.message}`);
    // Retorna um erro interno do servidor com uma mensagem amigável ao cliente
    res.status(500).json({ error: 'Failed to process the search request.' });
  }
});

// Inicia o servidor na porta especificada
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
