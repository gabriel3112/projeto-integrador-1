-- Script DDL para criação do Banco de Dados LETRIX e tabela de resultados

CREATE DATABASE IF NOT EXISTS LETRIX;
USE LETRIX;

CREATE TABLE IF NOT EXISTS resultados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_paciente VARCHAR(100) NOT NULL,
    jogo VARCHAR(50) NOT NULL,
    pontuacao INT NOT NULL,
    duracao_segundos INT,
    data_sessao DATETIME DEFAULT CURRENT_TIMESTAMP
);
