const express = require('express');
const router = express.Router();
const { db } = require('../database');

// Получить все лекции с фильтрацией
router.get('/', (req, res) => {
    const { category } = req.query;
    let query = "SELECT * FROM lectures WHERE deletedAt IS NULL";
    let params = [];

    if (category) {
        query += " AND category = ?";
        params.push(category);
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, data: rows });
    });
});

// Поиск лекций
router.post('/search', (req, res) => {
    const { query } = req.body;
    const searchTerm = `%${query}%`;
    const sql = "SELECT * FROM lectures WHERE (title LIKE ? OR description LIKE ?) AND deletedAt IS NULL";
    
    db.all(sql, [searchTerm, searchTerm], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, data: rows });
    });
});

module.exports = router;
