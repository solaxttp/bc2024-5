const express = require("express");
const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const program = new Command();

// Параметри командного рядка
program
  .requiredOption('-h, --host <host>', 'Server Address')
  .requiredOption('-p, --port <port>', 'Server Port')
  .requiredOption('-c, --cache <cache>', 'Cache directory path');
program.parse(process.argv);
const options = program.opts();

// Перевірка шляху до кешу
const cacheDirectory = path.resolve(options.cache);
if (!fs.existsSync(cacheDirectory)) {
  console.error('Directory cache path is invalid');
  process.exit(1);
}

// Шлях до файлу з нотатками
const notesFilePath = path.join(cacheDirectory, 'notes.json');

// Функція для збереження нотаток у файл
function saveNotesToFile() {
  fs.writeFileSync(notesFilePath, JSON.stringify(notes, null, 2));
}

// Функція для завантаження нотаток з файлу
function loadNotesFromFile() {
  if (fs.existsSync(notesFilePath)) {
    const data = fs.readFileSync(notesFilePath);
    return JSON.parse(data);
  }
  return [];
}

let notes = loadNotesFromFile();

// Ініціалізація Express.js
const app = express();
app.use(express.json()); // Для парсингу JSON
app.use(express.urlencoded({ extended: true })); // Для парсингу даних з форм

// Головний маршрут
app.get('/', (req, res) => {
  res.send("Hello world!");
});

// Запуск сервера
const server = app.listen(options.port, options.host, () => {
  console.log(`Server started at http://${options.host}:${options.port}`);
});

server.on('error', (err) => {
  console.error("server error: ", err);
});

// Отримання нотатки за її ім'ям
app.get('/notes/:name', (req, res) => {
  const name = req.params.name;
  const note = notes.find(note => note.name === name);
  if (!note) {
    console.log(`Note not found: ${name}`);
    return res.status(404).send("Note not found!");
  }
  res.send(note.text);
});

// Створення нової нотатки
app.post('/notes/write', (req, res) => {
  const name = req.body.note_name;
  const text = req.body.note;
  if (!name) {
    return res.status(400).send("Name parameter is required.");
  }
  console.log(`Received request to create note with name: ${name}`);
  const existingNote = notes.find(note => note.name === name);
  if (existingNote) {
    return res.status(400).send("Note already exists!");
  }
  const newNote = {
    name: name,
    text: text || "No text provided"
  };
  notes.push(newNote);
  saveNotesToFile();
  console.log(notes);
  return res.status(201).send(newNote);
});

// Отримання всіх нотаток
app.get('/notes', (req, res) => {
  res.status(200).send(notes);
});

// Оновлення тексту нотатки
app.put("/notes/:name", (req, res) => {
  const newText = req.body.text;
  const name = req.params.name;
  const note = notes.find(note => note.name === name);
  if (!note) {
    return res.status(404).send(`Note ${name} not found!`);
  }
  note.text = newText;
  saveNotesToFile();
  res.status(201).send(`Note ${name} updated successfully!`);
});

// Видалення нотатки
app.delete('/delete/:name', (req, res) => {
  const name = req.params.name;
  const noteIndex = notes.findIndex(note => note.name === name);
  if (noteIndex === -1) {
    return res.status(404).send(`Note ${name} not found!`);
  }
  try {
    notes.splice(noteIndex, 1);
    saveNotesToFile();
    res.send(`Note ${name} deleted successfully!`);
  } catch (err) {
    console.log(`Error deleting note ${name}: `, err);
    res.status(404).send("Note not found!");
  }
});

// Шлях для завантаження HTML форми
app.get("/UploadForm.html", (req, res) => {
  res.sendFile(path.join(__dirname, "UploadForm.html"));
});