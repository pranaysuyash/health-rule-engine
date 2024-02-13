// Function to fetch JSON data from data.json
async function fetchCalculations() {
  try {
    const response = await fetch('data.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching calculations:', error);
  }
}

// Populate the dropdown after fetching the data
window.onload = async function () {
  const calculations = await fetchCalculations();
  populateDropdown(calculations);
};

function populateDropdown(calculations) {
  const dropdown = document.getElementById('calculationDropdown');
  calculations.forEach((calculation) => {
    const option = document.createElement('option');
    option.value = calculation.calculation_id;
    option.textContent = calculation.calculation_id;
    dropdown.appendChild(option);
  });
}

let currentCalculation = null; // Global variable to store the current calculation

function displayCalculationName() {
  const dropdown = document.getElementById('calculationDropdown');
  const selectedId = dropdown.value;
  fetchCalculations().then((calculations) => {
    currentCalculation = calculations.find(
      (calculation) => calculation.calculation_id === selectedId
    );
    if (currentCalculation) {
      const nameDisplay = document.getElementById('selectedCalculationName');
      nameDisplay.textContent = currentCalculation.calculation_name.en;

      displayQuestions(
        currentCalculation.calculation_blueprint.input_definition
      );
      displayCalculationDescription(currentCalculation.calculation_description);
    }
  });
}

function displayCalculationDescription(description) {
  const descriptionContainer = document.getElementById(
    'calculationDescriptionContainer'
  );
  descriptionContainer.innerHTML = description.en; // Assuming the description is in English and formatted as HTML
}

function displayQuestions(inputDefinition) {
  const questionsContainer = document.getElementById('questionsContainer');
  questionsContainer.innerHTML = ''; // Clear existing questions

  inputDefinition.forEach((question) => {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';

    const label = document.createElement('label');
    label.textContent = question.label.en;
    label.htmlFor = question.id;

    let input;
    if (question.input_type.allowed_answers) {
      // Dropdown for questions with predefined allowed answers
      input = document.createElement('select');
      input.id = question.id;
      question.input_type.allowed_answers.forEach((answer) => {
        const option = document.createElement('option');
        option.value = answer.value;
        option.textContent = answer.label.en;
        input.appendChild(option);
      });
    } else if (question.input_type.range) {
      // Slider or number input for range-based questions
      input = document.createElement('input');
      input.type = 'range'; // or 'number'
      input.id = question.id;
      input.min = question.input_type.range.min.value;
      input.max = question.input_type.range.max.value;
      // Additional attributes like step can be added based on requirements
    } else {
      // Regular input for other types
      input = document.createElement('input');
      input.id = question.id;
      input.type = question.input_type.type || 'text'; // Default to text if type is not specified
    }

    questionDiv.appendChild(label);
    questionDiv.appendChild(input);
    questionsContainer.appendChild(questionDiv);
  });
}

function displayOutputs(outputDefinition) {
  const outputsContainer = document.getElementById('outputsContainer');
  outputsContainer.innerHTML = ''; // Clear existing outputs

  outputDefinition.forEach((output) => {
    const outputDiv = document.createElement('div');
    outputDiv.className = 'output';

    const label = document.createElement('label');
    label.textContent = output.label.en;

    const value = document.createElement('span');
    value.id = 'output_' + output.subresult_id;
    value.textContent = '...'; // Placeholder for output value

    outputDiv.appendChild(label);
    outputDiv.appendChild(value);
    outputsContainer.appendChild(outputDiv);
  });
}

// Validate date string
function isValidDate(dateString) {
  // Check empty
  if (!dateString) {
    return false;
  }

  // Validate format
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  // Try creating date
  const parts = dateString.split('/');
  const date = new Date(parts[2], parts[1] - 1, parts[0]);

  return !isNaN(date.getDate());
}

function processOutputs(calculationId, userAnswers) {
  let results = {};
  console.log('user answers:', userAnswers);
  if (calculationId === 'acro') {
    results = scoreAcroQoL(userAnswers);
  } else if (calculationId === 'pss_4') {
    console.log('user answer from processoutput', userAnswers);

    results = scorePSS4(userAnswers);
    console.log('resultsfrom process:', results);
  } else if (calculationId === 'age_calc') {
    console.log('in processoutputs');
    // const date = userAnswers.date_of_birth;

    // if (!isValidDate(date)) {
    //   return { error: 'Invalid date' };
    // }
    console.log('user answer from processoutput', userAnswers);
    const dateString = userAnswers.date_of_birth;
    if (dateString) {
      const ageResult = calculateAgeFromDate(dateString);
      results.AGE = ageResult.age;
      results.monthDifference = ageResult.m; // Calculate age here
    } else {
      console.error('Date of birth not provided');
    }
    console.log('results from process:', results);
    // console.log('age is:', age);
    // return {
    //   AGE: age,
    // };
  } else if (calculationId === 'asrs') {
    results = scoreASRS(userAnswers);
  } else {
    // Placeholder for other calculations
    outputDefinition.forEach((output) => {
      results[output.subresult_id] = userAnswers.reduce(
        (sum, answer) => sum + answer,
        0
      );
    });
  }

  return results;
}

function scoreAcroQoL(userAnswers) {
  // Convert the userAnswers object into an array of its values
  const answersArray = Object.keys(userAnswers).map((key) =>
    parseInt(userAnswers[key], 10)
  );

  // Splitting answers into scales
  let physicalScaleAnswers = answersArray.slice(0, 8); // first 8 items
  let psychologicalScaleAnswers = answersArray.slice(8); // next 14 items

  // Calculating scores
  let physicalScaleScore = calculateScaleScore(physicalScaleAnswers);
  let psychologicalScaleScore = calculateScaleScore(psychologicalScaleAnswers);

  console.log('Physical Scale Score:', physicalScaleScore); // Debugging log
  console.log('Psychological Scale Score:', psychologicalScaleScore); // Debugging log

  // Check if scores are numbers
  if (isNaN(physicalScaleScore) || isNaN(psychologicalScaleScore)) {
    console.error('Invalid score calculation. Scores:', {
      physicalScaleScore,
      psychologicalScaleScore,
    });
    return {
      globalScore: 'Error',
      physicalScaleScore: physicalScaleScore,
      psychologicalScaleScore: psychologicalScaleScore,
    };
  }

  let globalScore = (
    (parseFloat(physicalScaleScore) + parseFloat(psychologicalScaleScore)) /
    2
  ).toFixed(2);

  return {
    globalScore: globalScore,
    physicalScaleScore: physicalScaleScore,
    psychologicalScaleScore: psychologicalScaleScore,
  };
}

function scorePSS4(userAnswers) {
  const answersArray = Object.keys(userAnswers).map((key) =>
    parseInt(userAnswers[key], 10)
  );
  let totalScore = answersArray.reduce((acc, val) => acc + val, 0);

  return { totalScore: totalScore };
}

function calculateAgeFromDate(dateString) {
  // Split the date string by '/' to match the 'DD/MM/YYYY' format
  const parts = dateString.split('-');
  if (parts.length === 3) {
    // Construct a new date using the parts
    const birthDate = new Date(+parts[0], parts[1] - 1, +parts[2]); // plus sign to convert string to number
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
      m += 12;
    }

    return { age, m };
  } else {
    console.error('Invalid date format. Expecting YYYY-MM-DD:', dateString);
    return null; // Or handle the error as appropriate
  }
}

function scoreASRS(userAnswers) {
  const inattentiveItems = [
    'Q01',
    'Q02',
    'Q03',
    'Q04',
    'Q07',
    'Q08',
    'Q09',
    'Q10',
    'Q11',
  ];
  const motorHyperactiveItems = ['Q05', 'Q06', 'Q12', 'Q13', 'Q14'];
  const verbalHyperactiveItems = ['Q15', 'Q16', 'Q17', 'Q18'];

  let inattentiveScore = 0;
  let motorHyperactiveScore = 0;
  let verbalHyperactiveScore = 0;

  // Calculate scores for each item
  for (const [key, value] of Object.entries(userAnswers)) {
    // Adjusting the scoring based on the ASRS rules
    let adjustedValue = 0;
    if (
      ['Q01', 'Q02', 'Q03', 'Q09', 'Q12', 'Q16', 'Q18'].includes(key) &&
      value >= 2
    ) {
      adjustedValue = 1; // For these items, 'sometimes' (2) or higher counts as 1 point
    } else if (value >= 3) {
      adjustedValue = 1; // For the rest, 'often' (3) or 'very often' (4) counts as 1 point
    }

    if (inattentiveItems.includes(key)) {
      inattentiveScore += adjustedValue;
    } else if (motorHyperactiveItems.includes(key)) {
      motorHyperactiveScore += adjustedValue;
    } else if (verbalHyperactiveItems.includes(key)) {
      verbalHyperactiveScore += adjustedValue;
    }
  }

  // Calculate the total score
  const totalScore =
    inattentiveScore + motorHyperactiveScore + verbalHyperactiveScore;

  return {
    calculationId: 'asrs', // Add this line
    totalScore: totalScore,
    inattentiveScore: inattentiveScore,
    motorHyperactiveScore: motorHyperactiveScore,
    verbalHyperactiveScore: verbalHyperactiveScore,
  };
}

function defaultScoring(userAnswers) {
  const answersArray = Object.keys(userAnswers).map((key) =>
    parseInt(userAnswers[key], 10)
  );
  const totalScore = answersArray.reduce((acc, val) => acc + val, 0);
  return {
    totalScore: totalScore.toFixed(2),
  };
}

function displayResults(results) {
  console.log('Results', results);
  if ('totalScore' in results) {
    document.getElementById('totalScoreResult').textContent =
      'Total Score: ' + results.totalScore;
  } else if ('AGE' in results) {
    const age = results.AGE;
    document.getElementById(
      'ageResult'
    ).textContent = `Age: ${results.AGE} years and ${results.monthDifference} months`;
  }
  if (results.calculationId === 'asrs') {
    // Display ASRS scores
    document.getElementById('totalScoreResult').textContent =
      'Total ASRS Score: ' + results.totalScore;
    document.getElementById('inattentiveScoreResult').textContent =
      'Inattentive Score: ' + results.inattentiveScore;
    document.getElementById('motorHyperactiveScoreResult').textContent =
      'Motor Hyperactive/Impulsive Score: ' + results.motorHyperactiveScore;
    document.getElementById('verbalHyperactiveScoreResult').textContent =
      'Verbal Hyperactive/Impulsive Score: ' + results.verbalHyperactiveScore;
  } else {
    document.getElementById('globalScoreResult').textContent =
      'Global Score: ' + results.globalScore;
    document.getElementById('physicalScaleScoreResult').textContent =
      'Physical Scale Score: ' + results.physicalScaleScore;
    document.getElementById('psychologicalScaleScoreResult').textContent =
      'Psychological Scale Score: ' + results.psychologicalScaleScore;
  }
}
function calculateScaleScore(answers) {
  let sum = answers.reduce((acc, val) => acc + val, 0);
  let score = (sum / (5 * answers.length)) * 100;
  return score.toFixed(2); // Rounding to two decimal places for precision
}

// function getUserAnswers(inputDefinition) {
//   const answers = {};
//   inputDefinition.forEach((question) => {
//     const answerElement = document.getElementById(question.id);
//     console.log('answers from getuseranswers', answers[question.id]);
//     if (answerElement) {
//       if (question.input_type.type === 'date') {
//         const ageResult = calculateAgeFromDate(answerElement.value);
//         //   // Directly pass the date string to the calculateYearDifference function
//         answers[question.id] = ageResult.age;
//         console.log('answers from getuseranswers', answers[question.id]);
//       } else {
//         // Handle other types of inputs (like number, text)
//         answers[question.id] = parseInt(answerElement.value, 10);
//         console.log('answers from getuseranswers', answers[question.id]);
//       }
//     } else {
//       console.error('Answer element not found for question ID:', question.id);
//     }
//   });
//   return answers;
// }
function getUserAnswers(inputDefinition) {
  const answers = {};
  inputDefinition.forEach((question) => {
    const answerElement = document.getElementById(question.id);
    if (answerElement && answerElement.value) {
      if (question.id === 'date_of_birth') {
        // Assuming the ID for the date input is 'date_of_birth'
        answers[question.id] = answerElement.value;
      } else {
        // Handle other types of inputs
        answers[question.id] = parseInt(answerElement.value, 10);
      }
    } else {
      console.error('Answer element not found for question ID:', question.id);
    }
  });
  return answers;
}

function onCalculateResults() {
  if (currentCalculation) {
    const userAnswers = getUserAnswers(
      currentCalculation.calculation_blueprint.input_definition
    );
    const results = processOutputs(
      currentCalculation.calculation_id,
      userAnswers
    );
    displayResults(results);
  } else {
    console.error('No calculation selected');
  }
}
