const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

// 创建HTTP服务器，负责网页访问
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        fs.readFile('index.html', (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404);
        res.end('404');
    }
});

const wss = new WebSocket.Server({ server });

// === 与 Python 建立持久连接 ===
const PYTHON_SERVER_URL = 'ws://127.0.0.1:9000';
let pythonSocket = null;

function connectToPython() {
    pythonSocket = new WebSocket(PYTHON_SERVER_URL);

    pythonSocket.on('open', () => console.log('已连接到 Python WebSocket 服务'));
    pythonSocket.on('close', () => {
        console.log('Python 连接关闭，尝试重连...');
        setTimeout(connectToPython, 3000);
    });
    pythonSocket.on('error', (err) => console.error('Python连接错误:', err));
}

// 启动时立即连接
connectToPython();

// === Node WebSocket服务 ===
wss.on('connection', (ws) => {
    console.log('有网页客户端连接');

    ws.send(JSON.stringify({ message: '已连接到 Node.js 转发服务！' }));

    ws.on('message', (message) => {
        console.log('浏览器发来:', message.toString());

        if (pythonSocket && pythonSocket.readyState === WebSocket.OPEN) {//对python进行转发
            pythonSocket.send(message.toString());
        }   

        wss.clients.forEach(client => {//对其他所有客户端进行消息转发
            if (client.readyState === WebSocket.OPEN && client !== ws) {
                client.send(message.toString());
            }
        });
    });

    // 3️当Python返回消息时，转发给网页
    pythonSocket?.on('message', (pyMsg) => {
        ws.send(pyMsg.toString());
    });

    ws.on('close', () => console.log('网页断开连接'));
});

const PORT = 9000;
server.listen(PORT, () => console.log(`node.js 转发服务运行在 http://localhost:${PORT}`));
