
const http = require('http');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'formValues.txt');

const server = http.createServer((req, res) => {

    if (req.url === '/') {
        fs.readFile(filePath, 'utf8', (err, data) => {
            const messages = err && err.code === 'ENOENT'
                ? []
                : err
                    ? null
                    : data.split('\n').filter(Boolean);

            if (messages === null) {
                res.statusCode = 500;
                return res.end('Error reading messages');
            }

            const messageList = messages.map(message => `
                <li>${escapeHtml(message)}</li>
            `).join('');

            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });

            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Messages</title>
                </head>
                <body>
                    <h2>Saved Messages</h2>
                    <ul>${messageList}</ul>

                    <h2>Add a New Message</h2>
                    <form action="/message" method="POST">
                        <label>Message:</label>
                        <input
                            type="text"
                            name="message"
                            required
                        >
                        <button type="submit">Submit</button>
                    </form>
                </body>
                </html>
            `);
        });
    }

   
    else if (req.url === '/message') {

        const dataChunks = [];

        req.on('data', chunk => {
            dataChunks.push(chunk);
        });

        req.on('end', () => {
            const combinedBuffer = Buffer.concat(dataChunks);
            const formData = combinedBuffer.toString('utf8');
            const formValues = new URLSearchParams(formData);
            const message = formValues.get('message')?.trim();

            if (!message) {
                res.writeHead(303, { Location: '/' });
                return res.end();
            }
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err && err.code !== 'ENOENT') {
                    res.statusCode = 500;
                    return res.end('Error reading file');
                }

                const oldMessages = data
                    ? data.split('\n').filter(Boolean)
                    : [];

                const allMessages = [message, ...oldMessages];

                fs.writeFile(
                    filePath,
                    allMessages.join('\n') + '\n',
                    'utf8',
                    writeErr => {
                        if (writeErr) {
                            res.statusCode = 500;
                            return res.end('Error saving message');
                        }

                        res.writeHead(303, {
                            Location: '/'
                        });
                        res.end();
                    }
                );
            });
        });
    }

    else {
        res.statusCode = 404;
        res.end('Page Not Found');
    }
});

// Escape user input before displaying it as HTML
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
