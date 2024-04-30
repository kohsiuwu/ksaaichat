require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const fs = require('fs');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { exec } = require("child_process");
const path = require('path');

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

// Function to read DOC files using Antiword
function readDocFile(filePath) {
    return new Promise((resolve, reject) => {
        exec(`antiword "${filePath}"`, (error, stdout) => {
            if (error) {
                console.error("Error reading DOC file:", error);
                return reject(error);
            }
            resolve(stdout);
        });
    });
}

// Function to read JSON files
function readJsonFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading JSON file:", error);
        return null;
    }
}

// Generic function to read any file based on extension
async function readFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.docx':
            return await readDocxFile(filePath);
        case '.pdf':
            return await readPdfFile(filePath);
        case '.txt':
            return readTextFile(filePath);
        case '.doc':
            return await readDocFile(filePath);
        case '.json':
            return JSON.stringify(await readJsonFile(filePath));
        default:
            return null;
    }
}

// Route to handle POST request
app.post('/read-file', async (req, res) => {
    const { filePath } = req.body;
    if (!filePath) {
        return res.status(400).send('No file path provided');
    }

    const fullFilePath = path.join(__dirname, 'data', filePath);
    const content = await readFile(fullFilePath);

    if (content) {
        res.send({ content });
    } else {
        res.status(500).send('Failed to read file or unsupported file type');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
