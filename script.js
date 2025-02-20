let allQuestions = [];
let currentIndex = 0;
let userAnswers = []; // To store the user's selected answer for each question

document.getElementById('uploadForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  
  // Get the number of questions the user wants to attempt
  const qCountInput = document.getElementById('questionCount').value;
  const desiredQuestionCount = parseInt(qCountInput) || 0;
  
  const response = await fetch('/upload', {
    method: 'POST',
    body: formData
  });
  const data = await response.json();
  allQuestions = data.questions;
  
  // Shuffle the questions
  allQuestions = shuffleArray(allQuestions);
  
  // Limit the questions to the number the user wants (if fewer available, use them all)
  if (desiredQuestionCount > 0) {
    allQuestions = allQuestions.slice(0, Math.min(desiredQuestionCount, allQuestions.length));
  }
  
  // Initialize userAnswers for only the selected questions
  userAnswers = new Array(allQuestions.length).fill(null);
  
  // Hide upload form and show quiz section
  document.getElementById('uploadForm').style.display = 'none';
  document.getElementById('quizSection').style.display = 'block';
  currentIndex = 0;
  displayQuestion();
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
  
  // Display the current question
  const q = allQuestions[currentIndex];
  const questionDiv = document.createElement('div');
  questionDiv.className = 'question';
  questionDiv.innerHTML = `<p>${currentIndex + 1}. ${q.question}</p>`;
  
  // Create and display options for the question
  q.options.forEach(option => {
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option';
    optionDiv.innerText = `${option.letter}) ${option.text}`;
    
    // Restore user's previous selection if available
    if (userAnswers[currentIndex] !== null) {
      optionDiv.style.pointerEvents = 'none';
      const saved = userAnswers[currentIndex];
      if (option.letter === saved) {
        optionDiv.classList.add(option.isCorrect ? 'correct' : 'wrong');
      }
      if (option.letter === getCorrectOption(q) && saved !== getCorrectOption(q)) {
        optionDiv.classList.add('correct');
      }
    } else {
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

// Show submit button on last question if answered
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

// Reset button to allow a new PDF upload (resetting the app)
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
  // Add blur class to main container
  mainContainer.classList.add('blurred');
});

closeModal.addEventListener('click', () => {
  notesModal.style.display = 'none';
  // Remove blur class
  mainContainer.classList.remove('blurred');
});

// Close modal when clicking outside the modal content
window.addEventListener('click', (event) => {
  if (event.target == notesModal) {
    notesModal.style.display = 'none';
    mainContainer.classList.remove('blurred');
  }
});

document.getElementById('uploadForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const fileInput = document.querySelector('input[name="mcqPdf"]');
  const file = fileInput.files[0];
  
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = async function() {
    // reader.result is a base64 string like "data:application/pdf;base64,JVBERi0xLjQKJ..."
    // Remove the data URL prefix.
    const base64Data = reader.result.split(',')[1];
    
    // (Optional) If you want to limit the number of questions, get that value:
    const desiredCount = document.getElementById('questionCount').value;
    
    // Build your request body.
    // You can include additional fields if needed.
    const requestBody = {
      fileData: base64Data,
      questionCount: desiredCount
    };
    
    // Send the file to the Netlify function.
    try {
      const response = await fetch('/.netlify/functions/upload', {
        method: 'POST',
        body: base64Data, // For simplicity, we're just sending the raw base64 string.
        headers: {
          'Content-Type': 'application/pdf'
        }
      });
      
      const result = await response.json();
      console.log('PDF Text:', result.text);
      // Continue with your parsing and quiz display logic...
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };
  
  reader.readAsDataURL(file);
});

