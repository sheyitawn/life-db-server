const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();

app.use(bodyParser.json());

const DATA_FILE = './data.json';

// Read data
app.get('/data', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(JSON.parse(data));
    });
});

// Write data
app.post('/data', (req, res) => {
    const newData = req.body;
    fs.writeFile(DATA_FILE, JSON.stringify(newData, null, 2), (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Data saved!' });
    });
});

app.listen(3001, () => console.log('Server running on port 3001'));
