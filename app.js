require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static('public'));
app.use(express.json());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Welcome to my OpenAI app!');
});

async function readFileContent(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.txt':
            return fs.promises.readFile(filePath, 'utf8');
        case '.pdf':
            const dataBuffer = await fs.promises.readFile(filePath);
            return pdfParse(dataBuffer).then(data => data.text);
        case '.docx':
            return mammoth.extractRawText({ path: filePath }).then(result => result.value);
        case '.doc':
            return new Promise((resolve, reject) => {
                exec(`antiword '${filePath}'`, (error, stdout) => {
                    if (error) reject(error);
                    else resolve(stdout);
                });
            });
        default:
            return null;
    }
}

async function processFiles(directoryPath) {
    const files = await fs.promises.readdir(directoryPath);
    const responses = [];
    for (let file of files) {
        const fullFilePath = path.join(directoryPath, file);
        const content = await readFileContent(fullFilePath);
        if (content) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "gpt-4-turbo",
                    messages: [{ role: "user", content }]
                })
            });
            const data = await response.json();
            if (response.ok) {
                responses.push({ file, reply: data.choices[0].message.content });
            } else {
                responses.push({ file, error: data.error.message || 'API request failed' });
            }
        } else {
            responses.push({ file, error: "Unsupported file type or empty content" });
        }
    }
    return responses;
}

app.post('/read-files-and-chat', async (req, res) => {
    const directoryPath = path.join(__dirname, 'data');
    try {
        const responses = await processFiles(directoryPath);
        res.send(responses);
    } catch (error) {
        console.error('Error processing files:', error);
        res.status(500).send({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
