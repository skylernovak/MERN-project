const express = require('express');

const app = express();

app.get('/', (req, res) => res.send('API Running'));

const PORT = process.env.PORT || 5000; // a future feature will look for the environment variable PORT. For now we will use the local host port 5000

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));