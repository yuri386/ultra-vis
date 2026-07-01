/**
 * ROUTES/ADMIN.JS - Администраторский функционал
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database');

// ==================== ЛЕКЦИИ ====================

// GET - Все лекции (для админа)
router.get('/lectures', (req, res) => {
    db.all('SELECT * FROM lectures ORDER BY createdAt DESC', (err, lectures) => {
        if (err) return res.status(500).json({ success: false, error: 'Ошибка БД' });
        res.json({ success: true, lectures: lectures || [] });
    });
});

// POST - Создать лекцию
router.post('/lectures', (req, res) => {
    const { title, description, content, category, level, author, duration, thumbnail } = req.body;

    if (!title || !description || !category || !level || !author) {
        return res.status(400).json({ success: false, error: 'Заполните все обязательные поля' });
    }

    db.run(
        `INSERT INTO lectures (title, description, content, category, level, author, duration, thumbnail, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [title, description, content || '', category, level, author, duration || 0, thumbnail || ''],
        function(err) {
            if (err) {
                console.error('Ошибка при добавлении лекции:', err);
                return res.status(500).json({ success: false, error: 'Ошибка при добавлении' });
            }
            res.status(201).json({ 
                success: true, 
                message: 'Лекция добавлена',
                lectureId: this.lastID
            });
        }
    );
});

// PUT - Обновить лекцию
router.put('/lectures/:id', (req, res) => {
    const { title, description, content, category, level, author, duration, thumbnail } = req.body;
    const lectureId = req.params.id;

    if (!title || !category || !level) {
        return res.status(400).json({ success: false, error: 'Заполните обязательные поля' });
    }

    db.run(
        `UPDATE lectures SET title = ?, description = ?, content = ?, category = ?, level = ?, author = ?, duration = ?, thumbnail = ? 
         WHERE id = ?`,
        [title, description, content, category, level, author, duration, thumbnail, lectureId],
        function(err) {
            if (err) return res.status(500).json({ success: false, error: 'Ошибка при обновлении' });
            res.json({ success: true, message: 'Лекция обновлена' });
        }
    );
});

// DELETE - Удалить лекцию
router.delete('/lectures/:id', (req, res) => {
    db.run('DELETE FROM lectures WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, error: 'Ошибка при удалении' });
        res.json({ success: true, message: 'Лекция удалена' });
    });
});

// ==================== КОЛЛЕДЖИ ====================

// GET - Все колледжи (для админа)
router.get('/colleges', (req, res) => {
    db.all('SELECT * FROM colleges ORDER BY createdAt DESC', (err, colleges) => {
        if (err) return res.status(500).json({ success: false, error: 'Ошибка БД' });
        res.json({ success: true, colleges: colleges || [] });
    });
});

// POST - Создать колледж
router.post('/colleges', (req, res) => {
    const { name, type, city, address, website, phone, email, description, rating, featured } = req.body;

    if (!name || !type || !city) {
        return res.status(400).json({ success: false, error: 'Заполните обязательные поля' });
    }

    db.run(
        `INSERT INTO colleges (name, type, city, address, website, phone, email, description, rating, featured, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [name, type, city, address || '', website || '', phone || '', email || '', description || '', rating || 0, featured ? 1 : 0],
        function(err) {
            if (err) {
                console.error('Ошибка при добавлении колледжа:', err);
                return res.status(500).json({ success: false, error: 'Ошибка при добавлении' });
            }
            res.status(201).json({ 
                success: true, 
                message: 'Колледж добавлен',
                collegeId: this.lastID
            });
        }
    );
});

// PUT - Обновить колледж
router.put('/colleges/:id', (req, res) => {
    const { name, type, city, address, website, phone, email, description, rating, featured } = req.body;
    const collegeId = req.params.id;

    if (!name || !type || !city) {
        return res.status(400).json({ success: false, error: 'Заполните обязательные поля' });
    }

    db.run(
        `UPDATE colleges SET name = ?, type = ?, city = ?, address = ?, website = ?, phone = ?, email = ?, description = ?, rating = ?, featured = ? 
         WHERE id = ?`,
        [name, type, city, address, website, phone, email, description, rating, featured ? 1 : 0, collegeId],
        function(err) {
            if (err) return res.status(500).json({ success: false, error: 'Ошибка при обновлении' });
            res.json({ success: true, message: 'Колледж обновлён' });
        }
    );
});

// DELETE - Удалить колледж
router.delete('/colleges/:id', (req, res) => {
    db.run('DELETE FROM colleges WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, error: 'Ошибка при удалении' });
        res.json({ success: true, message: 'Колледж удалён' });
    });
});

// ==================== СТАТИСТИКА ====================

// GET - Статистика
router.get('/stats', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM users', (err, users) => {
        if (err) return res.status(500).json({ success: false, error: 'Ошибка БД' });
        
        db.get('SELECT COUNT(*) as count FROM lectures', (err, lectures) => {
            if (err) return res.status(500).json({ success: false, error: 'Ошибка БД' });
            
            db.get('SELECT COUNT(*) as count FROM colleges', (err, colleges) => {
                if (err) return res.status(500).json({ success: false, error: 'Ошибка БД' });
                
                res.json({
                    success: true,
                    stats: {
                        totalUsers: users?.count || 0,
                        totalLectures: lectures?.count || 0,
                        totalColleges: colleges?.count || 0
                    }
                });
            });
        });
    });
});

module.exports = router;
