const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Serve static files from the public folder
app.use(express.static('public'));

app.post('/upload', upload.single('mcqPdf'), async (req, res) => {
  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(dataBuffer);
    // Parse the text to extract MCQs using a custom function.
    const questions = parseMCQs(data.text);
    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);
    res.json({ questions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error processing PDF' });
  }
});

// Example parser: Assumes questions start with "Q:" and options start with "A)", "B)", etc.
// Correct options are marked with an asterisk (*) before the option letter.
function parseMCQs(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const questions = [];
  let currentQuestion = null;

  lines.forEach(line => {
    if (line.startsWith('Q:')) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      currentQuestion = { question: line.substring(2).trim(), options: [] };
    } else if (currentQuestion && (/^[ABCD]\)/.test(line) || line.startsWith('*'))) {
      // Option line; if it starts with '*' it's the correct answer.
      let isCorrect = false;
      if (line.startsWith('*')) {
        isCorrect = true;
        line = line.substring(1);
      }
      // Expecting format: "A) option text"
      const optionLetter = line.charAt(0);
      const optionText = line.substring(2).trim();
      currentQuestion.options.push({ letter: optionLetter, text: optionText, isCorrect });
    }
  });
  if (currentQuestion) {
    questions.push(currentQuestion);
  }
  return questions;
}

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
