const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 8080;

// 设置静态文件目录
app.use(express.static('public'));
app.use(bodyParser.json());

app.post('/send-message', async (req, res) => {
    const userMessage = req.body.message;
    if (!userMessage) {
        return res.status(400).send('No message provided');
    }

    const openaiApiKey = process.env.OPENAI_API_KEY; // 使用环境变量中的 API 密钥

    if (!openaiApiKey) {
        console.error('OpenAI API key is not set in environment variables');
        return res.status(500).send('Server configuration error');
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [{role: "user", content: userMessage}]
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
        res.status(500).send({error: error.message || 'Error processing your request'});
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});