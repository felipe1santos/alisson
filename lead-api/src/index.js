'use strict';
const { carregarConfig } = require('./config');
const { abrirBanco } = require('./db');
const { criarServidor } = require('./servidor');

const config = carregarConfig(process.env);
const db = abrirBanco(config.dbPath);
const app = criarServidor(config, db);

app.listen(config.porta, () => {
  console.log(`lead-api ouvindo na porta ${config.porta}`);
});
