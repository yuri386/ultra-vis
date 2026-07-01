/**
 * ULTRAWISE v2.0 - ROUTES/COLLEGES.JS
 * API для работы с колледжами и вузами
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database');

/**
 * GET /api/colleges
 * Получить все колледжи с фильтрацией
 */
router.get('/', (req, res) => {
    try {
        const { type, city, search } = req.query;
        
        let query = 'SELECT * FROM colleges WHERE 1=1';
        const params = [];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        if (city) {
            query += ' AND city = ?';
            params.push(city);
        }

        if (search) {
            query += ' AND (name LIKE ? OR city LIKE ? OR address LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY name';

        db.all(query, params, (err, colleges) => {
            if (err) {
                console.error('❌ Ошибка получения колледжей:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка при получении колледжей'
                });
            }

            res.json(colleges || []);
        });
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера'
        });
    }
});

/**
 * GET /api/colleges/:id
 * Получить колледж по ID
 */
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;

        db.get('SELECT * FROM colleges WHERE id = ?', [id], (err, college) => {
            if (err) {
                console.error('❌ Ошибка:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка при получении данных'
                });
            }

            if (!college) {
                return res.status(404).json({
                    success: false,
                    error: 'Колледж не найден'
                });
            }

            res.json({
                success: true,
                data: college
            });
        });
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера'
        });
    }
});

/**
 * GET /api/colleges/types/list
 * Получить все типы колледжей
 */
router.get('/types/list', (req, res) => {
    try {
        db.all('SELECT DISTINCT type FROM colleges ORDER BY type', (err, types) => {
            if (err) {
                console.error('❌ Ошибка:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка при получении типов'
                });
            }

            res.json({
                success: true,
                data: types ? types.map(t => t.type) : []
            });
        });
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера'
        });
    }
});

/**
 * GET /api/colleges/cities/list
 * Получить все города
 */
router.get('/cities/list', (req, res) => {
    try {
        db.all('SELECT DISTINCT city FROM colleges ORDER BY city', (err, cities) => {
            if (err) {
                console.error('❌ Ошибка:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка при получении городов'
                });
            }

            res.json({
                success: true,
                data: cities ? cities.map(c => c.city) : []
            });
        });
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера'
        });
    }
});

module.exports = router;
