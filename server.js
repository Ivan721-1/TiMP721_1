require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
};

sql.connect(dbConfig, err => {
    if (err) console.log(err);
});

// Middleware для проверки токенов
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Роуты для регистрации
app.post('/register', (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const query = `INSERT INTO Users (email, password, role) VALUES ('${email}', '${hashedPassword}', 'user')`;
    sql.query(query, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Ошибка регистрации');
        }
        res.send('Регистрация успешна');
    });
});

// Роуты для входа
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = `SELECT * FROM Users WHERE email = '${email}'`;
    sql.query(query, (err, result) => {
        if (err || result.recordset.length === 0) {
            console.log(err);
            return res.status(401).send('Ошибка входа');
        }
        const user = result.recordset[0];
        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).send('Ошибка входа');
        }
        const accessToken = jwt.sign({ email: user.email, role: user.role }, process.env.JWT_SECRET);
        res.json({ accessToken });
    });
});

// Роуты для получения статей
app.get('/articles', (req, res) => {
    const query = 'SELECT * FROM Articles';
    sql.query(query, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Ошибка получения статей');
        }
        res.json(result.recordset);
    });
});

// Роуты для получения статьи по ID
app.get('/article/:id', (req, res) => {
    const { id } = req.params;
    const query = `SELECT * FROM Articles WHERE id = ${id}`;
    sql.query(query, (err, result) => {
        if (err || result.recordset.length === 0) {
            console.log(err);
            return res.status(404).send('Статья не найдена');
        }
        res.json(result.recordset[0]);
    });
});

// Роуты для поиска статей
app.get('/search', (req, res) => {
    const { query } = req.query;
    const searchQuery = `SELECT * FROM Articles WHERE title LIKE '%${query}%' OR description LIKE '%${query}%'`;
    sql.query(searchQuery, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Ошибка поиска');
        }
        res.json(result.recordset);
    });
});

// Роуты для закладок
app.post('/bookmarks', authenticateToken, (req, res) => {
    const { articleId } = req.body;
    const query = `INSERT INTO Bookmarks (user_email, article_id) VALUES ('${req.user.email}', ${articleId})`;
    sql.query(query, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Ошибка добавления в закладки');
        }
        res.send('Добавлено в закладки');
    });
});

app.get('/bookmarks', authenticateToken, (req, res) => {
    const query = `SELECT Articles.* FROM Articles JOIN Bookmarks ON Articles.id = Bookmarks.article_id WHERE Bookmarks.user_email = '${req.user.email}'`;
    sql.query(query, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Ошибка получения закладок');
        }
        res.json(result.recordset);
    });
});

// Роуты для получения данных пользователя
app.get('/user', authenticateToken, (req, res) => {
    const query = `SELECT email, role FROM Users WHERE email = '${req.user.email}'`;
    sql.query(query, (err, result) => {
        if (err || result.recordset.length === 0) {
            console.log(err);
            return res.status(404).send('Пользователь не найден');
        }
        res.json(result.recordset[0]);
    });
});

// Роуты для администрирования
app.post('/articles', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { title, description, content, pdf_link } = req.body;
    const query = `INSERT INTO Articles (title, description, content, pdf_link) VALUES ('${title}', '${description}', '${content}', '${pdf_link}')`;
    sql.query(query, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Ошибка добавления статьи');
        }
        res.send('Статья добавлена');
    });
});

app.get('/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const query = 'SELECT * FROM Users';
    sql.query(query, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Ошибка получения пользователей');
        }
        res.json(result.recordset);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
