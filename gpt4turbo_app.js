// 引入必需的模块
const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
require('dotenv').config(); // 加载环境变量

// 创建一个 Express 应用
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.static('public'));
app.use(express.json()); // 解析 JSON 请求体
// 使用 bodyParser 中间件来解析 JSON 格式的请求体
app.use(bodyParser.json());

// 定义根目录的 GET 路由
app.get('/', (req, res) => {
    res.send('Welcome to my OpenAI app!'); // 当访问根目录时，返回欢迎信息
});

// 定义一个 POST 路由来处理消息发送
app.post('/send-message', async (req, res) => {
    const userMessage = req.body.message; // 从请求体中获取用户消息
    if (!userMessage) {
        return res.status(400).send('No message provided');
    }

    const openaiApiKey = process.env.OPENAI_API_KEY; // 从环境变量获取 API 密钥

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4-turbo", // 使用的模型
                messages: [{role: "user", content: userMessage}]
            })
        });
        const data = await response.json(); // 解析响应数据为 JSON
        if (response.ok) {
            res.send({reply: data.choices[0].message.content}); // 发送处理后的回复
        } else {
            throw new Error(data.error.message || 'Failed to fetch response from OpenAI');
        }
    } catch (error) {
        console.error('Error calling OpenAI:', error);
        res.status(500).send({error: error.message || 'Error processing your request'});
    }
});

// 启动服务器，监听指定端口
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});