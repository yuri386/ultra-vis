/**
 * ULTRAWISE V2.0 - NOTES.JS
 * Функциональность для управления заметками
 */

// ==================== СОСТОЯНИЕ ====================

let notes = [];
let currentNote = null;
let currentFolder = 'all';
let tags = [];
let customFolders = [];

const STORAGE_KEY = 'ultrawise_notes';
const FOLDERS_KEY = 'ultrawise_folders';
const TAGS_KEY = 'ultrawise_tags';

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', async () => {
    loadNotesFromStorage();
    loadFoldersFromStorage();
    loadTagsFromStorage();
    
    // Элементы DOM
    const newNoteBtn = document.getElementById('newNoteBtn');
    const addFolderBtn = document.getElementById('addFolderBtn');
    const addTagBtn = document.getElementById('addTagBtn');
    const notesSearch = document.getElementById('notesSearch');
    const sortNotes = document.getElementById('sortNotes');
    
    // Обработчики кнопок
    if (newNoteBtn) {
        newNoteBtn.addEventListener('click', createNewNote);
    }
    
    if (addFolderBtn) {
        addFolderBtn.addEventListener('click', openFolderModal);
    }
    
    if (addTagBtn) {
        addTagBtn.addEventListener('click', openTagModal);
    }
    
    if (notesSearch) {
        notesSearch.addEventListener('input', filterNotes);
    }
    
    if (sortNotes) {
        sortNotes.addEventListener('change', (e) => {
            renderNotesList();
        });
    }
    
    // Модальные окна
    setupModals();
    
    // Редактор
    setupEditor();
    
    // Папки
    setupFolders();
    
    // Первая загрузка интерфейса
    renderFolders();
    renderTags();
    renderNotesList();
});

// ==================== РАБОТА С ХРАНИЛИЩЕМ ====================

function loadNotesFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    notes = stored ? JSON.parse(stored) : [];
}

function saveNotesToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function loadFoldersFromStorage() {
    const stored = localStorage.getItem(FOLDERS_KEY);
    customFolders = stored ? JSON.parse(stored) : [];
}

function saveFoldersToStorage() {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(customFolders));
}

function loadTagsFromStorage() {
    const stored = localStorage.getItem(TAGS_KEY);
    tags = stored ? JSON.parse(stored) : [
        { id: 1, name: 'Важное', color: '#ff6b6b' },
        { id: 2, name: 'Срочное', color: '#ffa07a' },
        { id: 3, name: 'Позже', color: '#4ecdc4' }
    ];
    saveTags();
}

function saveTags() {
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
}

// ==================== ПАПКИ ====================

function renderFolders() {
    const customFoldersDiv = document.getElementById('customFolders');
    
    customFoldersDiv.innerHTML = '';
    
    customFolders.forEach(folder => {
        const folderEl = document.createElement('div');
        folderEl.className = 'folder-item';
        folderEl.dataset.folder = folder.id;
        folderEl.innerHTML = `
            <span class="folder-icon">📂</span>
            <span>${folder.name}</span>
            <span class="note-count">${notes.filter(n => n.folderId === folder.id).length}</span>
            <button class="btn-icon" onclick="deleteFolder('${folder.id}')" title="Удалить" style="margin-left: auto; width: 20px; height: 20px; padding: 0; font-size: 14px;">×</button>
        `;
        folderEl.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn-icon')) {
                selectFolder(folder.id);
            }
        });
        customFoldersDiv.appendChild(folderEl);
    });
    
    // Обновляем количество заметок
    updateFolderCounts();
}

function updateFolderCounts() {
    document.querySelectorAll('.folder-item .note-count').forEach(el => {
        const folder = el.closest('.folder-item');
        const folderId = folder.dataset.folder;
        
        let count = 0;
        if (folderId === 'all') {
            count = notes.length;
        } else if (folderId === 'favorites') {
            count = notes.filter(n => n.favorite).length;
        } else if (folderId === 'shared') {
            count = notes.filter(n => n.shared).length;
        } else {
            count = notes.filter(n => n.folderId === folderId).length;
        }
        
        el.textContent = count;
    });
}

function selectFolder(folderId) {
    currentFolder = folderId;
    
    document.querySelectorAll('.folder-item').forEach(el => {
        el.classList.remove('active');
    });
    
    document.querySelector(`[data-folder="${folderId}"]`).classList.add('active');
    
    renderNotesList();
}

function setupFolders() {
    document.querySelectorAll('.folder-item').forEach(folder => {
        folder.addEventListener('click', function(e) {
            if (!e.target.classList.contains('btn-icon')) {
                selectFolder(this.dataset.folder);
            }
        });
    });
}

function deleteFolder(folderId) {
    if (confirm('Удалить папку? Заметки останутся в "Все заметки".')) {
        customFolders = customFolders.filter(f => f.id !== folderId);
        notes.forEach(n => {
            if (n.folderId === folderId) delete n.folderId;
        });
        saveFoldersToStorage();
        saveNotesToStorage();
        renderFolders();
        renderNotesList();
    }
}

// ==================== МЕТКИ ====================

function renderTags() {
    const tagsList = document.getElementById('tagsList');
    tagsList.innerHTML = '';
    
    tags.forEach(tag => {
        const tagEl = document.createElement('div');
        tagEl.className = 'tag-item';
        tagEl.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            border-radius: 6px;
            background: ${tag.color}20;
            color: ${tag.color};
            font-size: 12px;
            cursor: pointer;
        `;
        tagEl.innerHTML = `
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${tag.color};"></span>
            <span>${tag.name}</span>
        `;
        tagEl.addEventListener('click', () => {
            const search = document.getElementById('notesSearch');
            search.value = tag.name;
            filterNotes();
        });
        tagsList.appendChild(tagEl);
    });
}

// ==================== МОДАЛЬНЫЕ ОКНА ====================

function setupModals() {
    // Папка
    const folderModal = document.getElementById('folderModal');
    const saveFolderBtn = document.getElementById('saveFolderBtn');
    const cancelFolderBtn = document.getElementById('cancelFolderBtn');
    const folderInput = document.getElementById('folderName');
    
    if (saveFolderBtn) {
        saveFolderBtn.addEventListener('click', () => {
            const name = folderInput.value.trim();
            if (name) {
                const folder = {
                    id: Date.now().toString(),
                    name
                };
                customFolders.push(folder);
                saveFoldersToStorage();
                renderFolders();
                folderModal.classList.remove('active');
                folderInput.value = '';
            }
        });
    }
    
    if (cancelFolderBtn) {
        cancelFolderBtn.addEventListener('click', () => {
            folderModal.classList.remove('active');
        });
    }
    
    // Метка
    const tagModal = document.getElementById('tagModal');
    const saveTagBtn = document.getElementById('saveTagBtn');
    const cancelTagBtn = document.getElementById('cancelTagBtn');
    const tagInput = document.getElementById('tagName');
    const colorOptions = document.querySelectorAll('.color-option');
    
    let selectedColor = '#ff6b6b';
    
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            colorOptions.forEach(o => o.style.border = 'none');
            option.style.border = '3px solid white';
            selectedColor = option.dataset.color;
        });
    });
    
    if (saveTagBtn) {
        saveTagBtn.addEventListener('click', () => {
            const name = tagInput.value.trim();
            if (name) {
                const tag = {
                    id: Date.now(),
                    name,
                    color: selectedColor
                };
                tags.push(tag);
                saveTags();
                renderTags();
                tagModal.classList.remove('active');
                tagInput.value = '';
            }
        });
    }
    
    if (cancelTagBtn) {
        cancelTagBtn.addEventListener('click', () => {
            tagModal.classList.remove('active');
        });
    }
}

function openFolderModal() {
    document.getElementById('folderModal').classList.add('active');
}

function openTagModal() {
    document.getElementById('tagModal').classList.add('active');
}

// ==================== ЗАМЕТКИ ====================

function createNewNote() {
    const note = {
        id: Date.now().toString(),
        title: 'Новая заметка',
        content: '',
        createdAt: new Date().toLocaleString('ru-RU'),
        modifiedAt: new Date().toLocaleString('ru-RU'),
        favorite: false,
        shared: false,
        tags: [],
        folderId: currentFolder !== 'all' && currentFolder !== 'favorites' && currentFolder !== 'shared' ? currentFolder : null
    };
    
    notes.push(note);
    saveNotesToStorage();
    currentNote = note;
    
    renderNotesList();
    editNote(note);
    updateFolderCounts();
}

function editNote(note) {
    currentNote = note;
    
    // Показываем редактор, скрываем emptyState
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('noteEditor').style.display = 'flex';
    
    // Заполняем поля
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').innerHTML = note.content;
    document.getElementById('noteCreated').textContent = note.createdAt;
    document.getElementById('noteModified').textContent = note.modifiedAt;
    document.getElementById('charCount').textContent = note.content.length;
    
    // Обновляем метки заметки
    const noteTagsList = document.getElementById('noteTagsList');
    noteTagsList.innerHTML = '';
    note.tags.forEach(tagId => {
        const tag = tags.find(t => t.id === tagId);
        if (tag) {
            const tagEl = document.createElement('span');
            tagEl.style.cssText = `
                padding: 4px 8px;
                border-radius: 4px;
                background: ${tag.color}30;
                color: ${tag.color};
                font-size: 12px;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            `;
            tagEl.innerHTML = `
                ${tag.name}
                <button style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; font-size: 14px;" onclick="removeTagFromNote(${tagId})">×</button>
            `;
            noteTagsList.appendChild(tagEl);
        }
    });
    
    // Кнопки
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.textContent = note.favorite ? '⭐' : '☆';
        favoriteBtn.addEventListener('click', () => {
            note.favorite = !note.favorite;
            favoriteBtn.textContent = note.favorite ? '⭐' : '☆';
            saveNotesToStorage();
            updateFolderCounts();
            renderNotesList();
        });
    }
    
    const deleteNoteBtn = document.getElementById('deleteNoteBtn');
    if (deleteNoteBtn) {
        deleteNoteBtn.onclick = () => {
            if (confirm('Удалить заметку?')) {
                notes = notes.filter(n => n.id !== note.id);
                saveNotesToStorage();
                currentNote = null;
                document.getElementById('emptyState').style.display = 'flex';
                document.getElementById('noteEditor').style.display = 'none';
                renderNotesList();
                updateFolderCounts();
            }
        };
    }
}

function setupEditor() {
    const noteTitle = document.getElementById('noteTitle');
    const noteContent = document.getElementById('noteContent');
    const addNoteTagBtn = document.getElementById('addNoteTagBtn');
    
    if (noteTitle) {
        noteTitle.addEventListener('change', () => {
            if (currentNote) {
                currentNote.title = noteTitle.value;
                currentNote.modifiedAt = new Date().toLocaleString('ru-RU');
                saveNotesToStorage();
                renderNotesList();
            }
        });
    }
    
    if (noteContent) {
        noteContent.addEventListener('input', () => {
            if (currentNote) {
                currentNote.content = noteContent.innerHTML;
                currentNote.modifiedAt = new Date().toLocaleString('ru-RU');
                document.getElementById('charCount').textContent = noteContent.textContent.length;
                saveNotesToStorage();
            }
        });
    }
    
    // Форматирование
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.dataset.format;
            const selection = window.getSelection().toString();
            
            if (format === 'bold') {
                document.execCommand('bold');
            } else if (format === 'italic') {
                document.execCommand('italic');
            } else if (format === 'underline') {
                document.execCommand('underline');
            } else if (format === 'h1') {
                document.execCommand('formatBlock', false, 'h1');
            } else if (format === 'h2') {
                document.execCommand('formatBlock', false, 'h2');
            } else if (format === 'h3') {
                document.execCommand('formatBlock', false, 'h3');
            } else if (format === 'ul') {
                document.execCommand('insertUnorderedList');
            } else if (format === 'ol') {
                document.execCommand('insertOrderedList');
            } else if (format === 'code') {
                document.execCommand('formatBlock', false, 'pre');
            } else if (format === 'quote') {
                document.execCommand('formatBlock', false, 'blockquote');
            } else if (format === 'checkbox') {
                document.execCommand('insertHTML', false, '☐ ');
            }
            
            noteContent.focus();
        });
    });
    
    // Метки
    if (addNoteTagBtn) {
        addNoteTagBtn.addEventListener('click', () => {
            if (!currentNote) return;
            
            // Создаём меню выбора меток
            const tagMenu = document.createElement('div');
            tagMenu.style.cssText = `
                position: absolute;
                background: var(--bg-light);
                border: 1px solid var(--border);
                border-radius: 8px;
                padding: 8px;
                z-index: 2000;
                min-width: 150px;
            `;
            
            tags.forEach(tag => {
                const tagOption = document.createElement('div');
                tagOption.style.cssText = `
                    padding: 8px;
                    cursor: pointer;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `;
                tagOption.innerHTML = `
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${tag.color};"></span>
                    ${tag.name}
                `;
                tagOption.addEventListener('click', () => {
                    if (!currentNote.tags.includes(tag.id)) {
                        currentNote.tags.push(tag.id);
                        saveNotesToStorage();
                        editNote(currentNote);
                    }
                    tagMenu.remove();
                });
                tagMenu.appendChild(tagOption);
            });
            
            document.body.appendChild(tagMenu);
            setTimeout(() => tagMenu.remove(), 3000);
        });
    }
}

function removeTagFromNote(tagId) {
    if (currentNote) {
        currentNote.tags = currentNote.tags.filter(t => t !== tagId);
        saveNotesToStorage();
        editNote(currentNote);
    }
}

function renderNotesList() {
    const notesList = document.getElementById('notesList');
    const sortValue = document.getElementById('sortNotes')?.value || 'date';
    
    notesList.innerHTML = '';
    
    // Фильтруем заметки по папке
    let filtered = notes;
    
    if (currentFolder === 'favorites') {
        filtered = notes.filter(n => n.favorite);
    } else if (currentFolder === 'shared') {
        filtered = notes.filter(n => n.shared);
    } else if (currentFolder !== 'all') {
        filtered = notes.filter(n => n.folderId === currentFolder);
    }
    
    // Сортируем
    if (sortValue === 'title') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortValue === 'modified') {
        filtered.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
    } else {
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    if (filtered.length === 0) {
        notesList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Нет заметок</p>';
        return;
    }
    
    filtered.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        if (currentNote?.id === note.id) noteCard.style.background = 'rgba(102, 126, 234, 0.1)';
        
        const excerpt = note.content.replace(/<[^>]*>/g, '').substring(0, 50);
        
        noteCard.innerHTML = `
            <div class="note-title">${note.title}</div>
            <div class="note-excerpt">${excerpt || '(пусто)'}</div>
        `;
        
        noteCard.addEventListener('click', () => {
            editNote(note);
            document.querySelectorAll('.note-card').forEach(c => c.style.background = '');
            noteCard.style.background = 'rgba(102, 126, 234, 0.1)';
        });
        
        notesList.appendChild(noteCard);
    });
}

function filterNotes() {
    const search = document.getElementById('notesSearch').value.toLowerCase();
    
    if (!search) {
        renderNotesList();
        return;
    }
    
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = '';
    
    const filtered = notes.filter(note => 
        note.title.toLowerCase().includes(search) ||
        note.content.toLowerCase().includes(search) ||
        note.tags.some(tagId => {
            const tag = tags.find(t => t.id === tagId);
            return tag && tag.name.toLowerCase().includes(search);
        })
    );
    
    if (filtered.length === 0) {
        notesList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Заметок не найдено</p>';
        return;
    }
    
    filtered.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        if (currentNote?.id === note.id) noteCard.style.background = 'rgba(102, 126, 234, 0.1)';
        
        const excerpt = note.content.replace(/<[^>]*>/g, '').substring(0, 50);
        
        noteCard.innerHTML = `
            <div class="note-title">${note.title}</div>
            <div class="note-excerpt">${excerpt || '(пусто)'}</div>
        `;
        
        noteCard.addEventListener('click', () => {
            editNote(note);
            document.querySelectorAll('.note-card').forEach(c => c.style.background = '');
            noteCard.style.background = 'rgba(102, 126, 234, 0.1)';
        });
        
        notesList.appendChild(noteCard);
    });
}
