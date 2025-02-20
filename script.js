let allQuestions = [];
let currentIndex = 0;
let userAnswers = []; // To store the user's selected answer for each question

// Combined upload form event listener
document.getElementById('uploadForm').addEventListener('submit', function(e) {
  e.preventDefault();

  // Get the number of questions the user wants to attempt
  const qCountInput = document.getElementById('questionCount').value;
  const desiredQuestionCount = parseInt(qCountInput) || 0;

  // Get the PDF file from the input
  const fileInput = document.querySelector('input[name="mcqPdf"]');
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  
  reader.onload = async function() {
    // reader.result is a data URL like "data:application/pdf;base64,..."
    // Extract the base64 string by splitting at the comma
    const base64Data = reader.result.split(',')[1];
    
    try {
      // Send the base64 string to the Netlify Function
      const response = await fetch('/.netlify/functions/upload', {
        method: 'POST',
        body: base64Data,
        headers: {
          'Content-Type': 'application/pdf'
        }
      });
      
      const result = await response.json();
      
      // Check for questions in the result; if not, try parsing text using a custom function.
      if (result.questions) {
        allQuestions = result.questions;
      } else if (result.text) {
        // If you have a function parseMCQs() to convert text to questions, use it here.
        allQuestions = parseMCQs(result.text);
      } else {
        console.error("No questions found in response");
        return;
      }
      
      // Shuffle the questions
      allQuestions = shuffleArray(allQuestions);
      
      // Limit the questions based on the user's input (if provided)
      if (desiredQuestionCount > 0) {
        allQuestions = allQuestions.slice(0, Math.min(desiredQuestionCount, allQuestions.length));
      }
      
      // Initialize userAnswers for the selected questions
      userAnswers = new Array(allQuestions.length).fill(null);
      
      // Hide the upload form and show the quiz section
      document.getElementById('uploadForm').style.display = 'none';
      document.getElementById('quizSection').style.display = 'block';
      currentIndex = 0;
      displayQuestion();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };
  
  reader.readAsDataURL(file);
});

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function displayQuestion() {
  const container = document.getElementById('questionContainer');
  container.innerHTML = '';

  // Get the current question
  const q = allQuestions[currentIndex];
  const questionDiv = document.createElement('div');
  questionDiv.className = 'question';
  questionDiv.innerHTML = `<p>${currentIndex + 1}. ${q.question}</p>`;
  
  // Create and display options for the question
  q.options.forEach(option => {
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option';
    optionDiv.innerText = `${option.letter}) ${option.text}`;
    
    // If the user has already answered this question, disable clicking and show the saved selection
    if (userAnswers[currentIndex] !== null) {
      optionDiv.style.pointerEvents = 'none';
      const saved = userAnswers[currentIndex];
      if (option.letter === saved) {
        optionDiv.classList.add(option.isCorrect ? 'correct' : 'wrong');
      }
      // Also highlight the correct answer if the saved answer is incorrect
      if (option.letter === getCorrectOption(q) && saved !== getCorrectOption(q)) {
        optionDiv.classList.add('correct');
      }
    } else {
      // Allow user to select an answer
      optionDiv.addEventListener('click', () => {
        userAnswers[currentIndex] = option.letter;
        const siblings = optionDiv.parentElement.querySelectorAll('.option');
        siblings.forEach(sib => sib.style.pointerEvents = 'none');
        
        if (option.isCorrect) {
          optionDiv.classList.add('correct');
        } else {
          optionDiv.classList.add('wrong');
          siblings.forEach(sib => {
            if (sib.innerText.startsWith(getCorrectOption(q))) {
              sib.classList.add('correct');
            }
          });
        }
        checkSubmitVisibility();
      });
    }
    questionDiv.appendChild(optionDiv);
  });
  
  container.appendChild(questionDiv);
  
  // Update navigation button states
  document.getElementById('prevButton').disabled = (currentIndex === 0);
  document.getElementById('nextButton').disabled = (currentIndex === allQuestions.length - 1);
  checkSubmitVisibility();
}

function getCorrectOption(q) {
  for (let option of q.options) {
    if (option.isCorrect) return option.letter;
  }
  return '';
}

// Navigation buttons
document.getElementById('prevButton').addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    displayQuestion();
  }
});

document.getElementById('nextButton').addEventListener('click', () => {
  if (currentIndex < allQuestions.length - 1) {
    currentIndex++;
    displayQuestion();
  }
});

// Show submit button if on the last question and it's answered
function checkSubmitVisibility() {
  const submitBtn = document.getElementById('submitButton');
  if (currentIndex === allQuestions.length - 1 && userAnswers[currentIndex] !== null) {
    submitBtn.style.display = 'block';
  } else {
    submitBtn.style.display = 'none';
  }
}

document.getElementById('submitButton').addEventListener('click', () => {
  calculateScore();
});

function calculateScore() {
  let score = 0;
  for (let i = 0; i < allQuestions.length; i++) {
    if (userAnswers[i] === getCorrectOption(allQuestions[i])) {
      score++;
    }
  }
  showResult(score, allQuestions.length);
}

function showResult(score, total) {
  document.getElementById('quizSection').style.display = 'none';
  const resultSection = document.getElementById('resultSection');
  resultSection.style.display = 'block';

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progressPercentage = score / total;
  const offset = circumference * (1 - progressPercentage);
  
  const progressCircle = document.querySelector('.progress-ring__progress');
  progressCircle.style.strokeDasharray = circumference;
  progressCircle.style.strokeDashoffset = offset;
  
  document.getElementById('scoreText').textContent = `${score}/${total}`;
}

// Reset button functionality
document.getElementById('resetButton').addEventListener('click', () => {
  allQuestions = [];
  currentIndex = 0;
  userAnswers = [];
  document.getElementById('quizSection').style.display = 'none';
  document.getElementById('resultSection').style.display = 'none';
  document.getElementById('uploadForm').style.display = 'block';
});

// Modal functionality for Important Notes
const notesButton = document.getElementById('notesButton');
const notesModal = document.getElementById('notesModal');
const closeModal = document.querySelector('.modal .close');
const mainContainer = document.getElementById('mainContainer');

notesButton.addEventListener('click', () => {
  notesModal.style.display = 'block';
  mainContainer.classList.add('blurred');
});

closeModal.addEventListener('click', () => {
  notesModal.style.display = 'none';
  mainContainer.classList.remove('blurred');
});

window.addEventListener('click', (event) => {
  if (event.target == notesModal) {
    notesModal.style.display = 'none';
    mainContainer.classList.remove('blurred');
  }
});

// Optional: If you have a custom parser function to convert extracted text into questions,
// define it here:
function parseMCQs(text) {
  // Example simple parser:
  const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
  const questions = [];
  let currentQuestion = null;
  lines.forEach(line => {
    if (line.startsWith('Q:')) {
      if (currentQuestion) questions.push(currentQuestion);
      currentQuestion = { question: line.substring(2).trim(), options: [] };
    } else if (currentQuestion) {
      // Assume options are formatted with a leading letter and parenthesis,
      // and correct option marked with an asterisk.
      let isCorrect = false;
      if (line.startsWith('*')) {
        isCorrect = true;
        line = line.substring(1).trim();
      }
      const letter = line.charAt(0);
      const textOption = line.substring(2).trim();
      currentQuestion.options.push({ letter, text: textOption, isCorrect });
    }
  });
  if (currentQuestion) questions.push(currentQuestion);
  return questions;
}
