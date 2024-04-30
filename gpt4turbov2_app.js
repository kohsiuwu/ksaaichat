require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const fs = require('fs');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(express.static('public'));

// Function to read DOCX files
async function readDocxFile(filePath) {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    } catch (error) {
        console.error("Error reading DOCX file:", error);
        return null;
    }
}

// Function to read PDF files
async function readPdfFile(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    } catch (error) {
        console.error("Error reading PDF file:", error);
        return null;
    }
}

// Function to read plain text files
function readTextFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.error("Error reading text file:", error);
        return null;
    }
}

// Function to read DOC files using antiword
function readDocFile(filePath) {
    return new Promise((resolve, reject) => {
        exec(`antiword "${filePath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error("Error reading DOC file:", error);
                return reject(error);
            }
            resolve(stdout);
        });
    });
}

// Route to handle POST request
app.post('/send-message', async (req, res) => {
    const userMessage = req.body.message;
    const fileType = req.body.fileType; // Expect 'docx', 'pdf', 'txt', 'doc'
    const filePath = req.body.filePath;

    if (!userMessage || !fileType || !filePath) {
        return res.status(400).send('Missing data in request');
    }

    let documentText;
    switch (fileType.toLowerCase()) {
        case 'docx':
            documentText = await readDocxFile(filePath);
            break;
        case 'pdf':
            documentText = await readPdfFile(filePath);
            break;
        case 'txt':
            documentText = readTextFile(filePath);
            break;
        case 'doc':
            documentText = await readDocFile(filePath);
            break;
        default:
            return res.status(400).send('Unsupported file type');
    }

    if (!documentText) {
        return res.status(500).send('Failed to load document');
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4-turbo", // Adjust the model as necessary
                messages: [
                    { role: "system", content: documentText },
                    { role: "user", content: userMessage }
                ]
            })
        });
        const data = await response.json();
        if (response.ok) {
            res.send({reply: data.choices[0].message.content});
        } else {
            throw new Error(data.error.message || 'Failed to fetch response from OpenAI');
        }
    } catch (error) {
        console.error('Error calling OpenAI:', error);
        res.status(500).send({error: error.message});
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
