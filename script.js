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
    // if (
    //   !['chc_preop_brochure_triage', 'femmes_enceintes_triage'].includes(
    //     calculation.calculation_id
    //   )
    // )
    {
      const option = document.createElement('option');
      option.value = calculation.calculation_id;
      option.textContent =
        calculation.calculation_name.en || calculation.calculation_id;
      dropdown.appendChild(option);
    }
  });
}

let currentCalculation = null; // Global variable to store the current calculation

function displayCalculationName() {
  const dropdown = document.getElementById('calculationDropdown');
  const selectedId = dropdown.value;

  // Clear previous calculation data
  document.getElementById('selectedCalculationName').textContent = '';
  document.getElementById('questionsContainer').innerHTML = '';
  document.getElementById('calculationDescriptionContainer').innerHTML = '';
  document.getElementById('resultsContainer').style.display = 'none';

  fetchCalculations().then((calculations) => {
    console.log('Selected calculation ID:', selectedId);
    currentCalculation = calculations.find(
      (calculation) => calculation.calculation_id === selectedId
    );
    console.log('Fetched calculation:', currentCalculation);
    if (currentCalculation) {
      const nameDisplay = document.getElementById('selectedCalculationName');
      nameDisplay.textContent = currentCalculation.calculation_name.en;

      displayQuestions(
        currentCalculation.calculation_blueprint.input_definition
      );
      displayCalculationDescription(currentCalculation.calculation_description);
      document.getElementById('resultsContainer').style.display = 'block';
    } else {
      console.error('Calculation data for selected ID not found:', selectedId);
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
    let valueDisplay; // Element to display the slider's value
    if (question.input_type.allowed_answers) {
      // Dropdown for questions with predefined allowed answers
      input = document.createElement('select');
      input.id = question.id;
      question.input_type.allowed_answers.forEach((answer) => {
        if (answer.label && answer.label.en) {
          const option = document.createElement('option');
          option.value = answer.value;
          option.textContent = answer.label.en;
          input.appendChild(option);
        }
      });
    } else if (question.input_type.range) {
      // Number input for range-based questions
      input = document.createElement('input');
      input.type = 'number';
      input.id = question.id;
      input.min = question.id === 'weight' ? 0 : 0;
      input.max = question.id === 'weight' ? 300 : 200;

      // Determine the unit based on the question id
      let unit = question.id === 'weight' ? 'kg' : 'cm';
      // Create a span to display the number input's value with unit
      valueDisplay = document.createElement('span');

      valueDisplay.id = question.id + '_value';
      valueDisplay.textContent = '0 ' + unit; // Initialize with 0 and the unit

      // Append the label and input
      questionDiv.appendChild(label);
      questionDiv.appendChild(input);
      questionDiv.appendChild(valueDisplay);
      // Event listener to update the value display when the number value changes
      input.addEventListener('input', function () {
        // Correct the value if it's out of bounds
        if (this.valueAsNumber < this.min) {
          this.value = this.min;
        } else if (this.valueAsNumber > this.max) {
          this.value = this.max;
        }
        // Update the display span with the current value and unit
        valueDisplay.textContent = this.value + ' ' + unit;
      });
      // Append the value display span after the number input
      // questionDiv.appendChild(valueDisplay);
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
  } else if (calculationId === 'bmi') {
    results = calculateBMI(userAnswers);
  } else if (calculationId === 'bwcs') {
    results = scoreBWCS(userAnswers);
  } else if (calculationId === 'audit') {
    results = scoreAUDIT(userAnswers);
  } else if (calculationId === 'beck') {
    results = scoreBDI_II(userAnswers);
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
    calculationId: 'acro',
    acroglobalScore: globalScore,
    acrophysicalScaleScore: physicalScaleScore,
    acropsychologicalScaleScore: psychologicalScaleScore,
  };
}

function scorePSS4(userAnswers) {
  const answersArray = Object.keys(userAnswers).map((key) =>
    parseInt(userAnswers[key], 10)
  );
  let pss4totalScore = answersArray.reduce((acc, val) => acc + val, 0);

  return { calculationId: 'pss_4', pss4totalScore: pss4totalScore };
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
  const asrstotalScore =
    inattentiveScore + motorHyperactiveScore + verbalHyperactiveScore;

  return {
    calculationId: 'asrs', // Add this line
    asrstotalScore: asrstotalScore,
    inattentiveScore: inattentiveScore,
    motorHyperactiveScore: motorHyperactiveScore,
    verbalHyperactiveScore: verbalHyperactiveScore,
  };
}

function calculateBMI(userAnswers) {
  let weight = userAnswers.weight; // Assuming weight is in kilograms
  let height = userAnswers.height / 100; // Convert height from cm to meters

  let bmi = weight / (height * height);

  // Categorize BMI
  let category = '';
  if (bmi < 16.5) {
    category = 'Severely underweight';
  } else if (bmi < 18.5) {
    category = 'Underweight';
  } else if (bmi < 25) {
    category = 'Normal weight';
  } else if (bmi < 30) {
    category = 'Overweight';
  } else {
    category = 'Obesity';
  }

  return {
    calculationId: 'bmi',
    bmi: bmi.toFixed(2), // Round to 2 decimal places
    category: category,
  };
}
// function scoreAUDIT(userAnswers) {
//   let totalScore = 0;
//   // Questions 1 to 8: Scored from 0 to 4
//   for (let i = 1; i <= 8; i++) {
//     const questionKey = `Q${i}`;
//     totalScore += parseInt(userAnswers[questionKey], 10);
//   }
//   // Questions 9 and 10: Scored as 0, 2, or 4
//   for (let i = 9; i <= 10; i++) {
//     const questionKey = `Q${i}`;
//     const answerValue = parseInt(userAnswers[questionKey], 10);
//     if (answerValue === 1) {
//       totalScore += 2;
//     } else if (answerValue === 2) {
//       totalScore += 4;
//     }
//   }
//   return { auditScore: totalScore };
// }
function scoreAUDIT(userAnswers) {
  let audittotalScore = 0;
  let consumptionScore = 0;
  let dependenceScore = 0;
  let problemsScore = 0;

  // Calculate total and individual scores
  for (let i = 1; i <= 10; i++) {
    const questionKey = `AUDIT_Q0${i}`;
    const answerValue = parseInt(userAnswers[questionKey], 10);

    audittotalScore +=
      i <= 8 ? answerValue : answerValue > 0 ? 2 + 2 * (answerValue - 1) : 0;

    if (i <= 3) {
      // Consumption score
      consumptionScore += answerValue;
    } else if (i >= 4 && i <= 6) {
      // Dependence score
      dependenceScore += answerValue;
    } else if (i >= 7) {
      // Problems score
      problemsScore += answerValue > 0 ? 2 + 2 * (answerValue - 1) : 0;
    }
  }

  return {
    calculationId: 'audit',
    auditScore: audittotalScore,
    consumptionScore: consumptionScore,
    dependenceScore: dependenceScore,
    problemsScore: problemsScore,
  };
}

function scoreBWCS(userAnswers) {
  // Initialize the total score
  let totalScore = 0;

  // Sum the scores for each BWCS question
  for (let i = 1; i <= 5; i++) {
    const questionKey = `Q${i.toString().padStart(2, '0')}`;
    const answerValue = parseInt(userAnswers[questionKey], 10);
    // Ensure that non-numeric answers are treated as 0
    totalScore += isNaN(answerValue) ? 0 : answerValue;
  }

  // Return the total score
  return {
    calculationId: 'bwcs', // Identifier for the BWCS calculation
    totalScore: totalScore, // The total score for BWCS
  };
}

function scoreBDI_II(userAnswers) {
  let bditotalScore = 0;

  // Summing up the scores for all 21 questions
  for (let i = 1; i <= 21; i++) {
    const questionKey = `Q${i.toString().padStart(2, '0')}`; // Updated to match question IDs
    const answer = parseInt(userAnswers[questionKey], 10);
    if (!isNaN(answer)) {
      bditotalScore += answer;
    }
  }

  // Categorizing the total score
  let depressionLevel = '';
  if (bditotalScore <= 13) {
    depressionLevel = 'Minimal depression';
  } else if (bditotalScore <= 19) {
    depressionLevel = 'Mild depression';
  } else if (bditotalScore <= 28) {
    depressionLevel = 'Moderate depression';
  } else {
    depressionLevel = 'Severe depression';
  }

  return {
    calculationId: 'beck',
    bditotalScore: bditotalScore,
    depressionLevel: depressionLevel,
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

  // Clear previous results
  // document.getElementById('auditScoreResult').innerHTML = '';
  // document.getElementById('consumptionScoreResult').innerHTML = '';
  // document.getElementById('dependenceScoreResult').innerHTML = '';
  // document.getElementById('problemsScoreResult').innerHTML = '';
  // document.getElementById('bmiResult').innerHTML = '';
  // document.getElementById('totalScoreResult').innerHTML = '';
  // document.getElementById('ageResult').innerHTML = '';
  if ('totalScore' in results) {
    document.getElementById('totalScoreResult').textContent =
      'Total Score: ' + results.totalScore;
  } else if ('AGE' in results) {
    const age = results.AGE;
    document.getElementById(
      'ageResult'
    ).textContent = `Age: ${results.AGE} years and ${results.monthDifference} months`;
  } else if (results.calculationId === 'asrs') {
    // Display ASRS scores
    document.getElementById('asrstotalScoreResult').textContent =
      'Total ASRS Score: ' + results.asrstotalScore;
    document.getElementById('inattentiveScoreResult').textContent =
      'Inattentive Score: ' + results.inattentiveScore;
    document.getElementById('motorHyperactiveScoreResult').textContent =
      'Motor Hyperactive/Impulsive Score: ' + results.motorHyperactiveScore;
    document.getElementById('verbalHyperactiveScoreResult').textContent =
      'Verbal Hyperactive/Impulsive Score: ' + results.verbalHyperactiveScore;
  } else if (results.calculationId === 'pss_4') {
    // Display ASRS scores
    document.getElementById('pss4Result').textContent =
      'Total PSS_4 Score: ' + results.pss4totalScore;
  } else if (results.calculationId === 'bmi') {
    console.log(results.calculationId);
    document.getElementById('bmiResult').textContent =
      'BMI: ' + results.bmi + ' (' + results.category + ')';
  } else if (results.calculationId === 'bwcs') {
    document.getElementById('bwcsResult').textContent =
      'BWCS Total Score: ' + results.totalScore;
  } else if (results.calculationId === 'audit') {
    // Display AUDIT scores
    document.getElementById('auditScoreResult').textContent =
      'Total Audit Score: ' + results.auditScore;
    document.getElementById('consumptionScoreResult').textContent =
      'Consumption Score: ' + results.consumptionScore;
    document.getElementById('dependenceScoreResult').textContent =
      'Dependence Score: ' + results.dependenceScore;
    document.getElementById('problemsScoreResult').textContent =
      'Problems Score: ' + results.problemsScore;
  } else if (results.calculationId === 'beck') {
    // Display AUDIT scores
    document.getElementById('bdiIIScore').textContent =
      'Total BDI Score: ' + results.bditotalScore;
    document.getElementById('bdiIIDepressionLevel').textContent =
      'Depression level: ' + results.depressionLevel;
  } else if (results.calculationId === 'acro') {
    document.getElementById('acroglobalScoreResult').textContent =
      'Global Score: ' + results.acroglobalScore;
    document.getElementById('acrophysicalScaleScoreResult').textContent =
      'Physical Scale Score: ' + results.acrophysicalScaleScore;
    document.getElementById('acropsychologicalScaleScoreResult').textContent =
      'Psychological Scale Score: ' + results.acropsychologicalScaleScore;
  }
}
function calculateScaleScore(answers) {
  let sum = answers.reduce((acc, val) => acc + val, 0);
  let score = (sum / (5 * answers.length)) * 100;
  return score.toFixed(2); // Rounding to two decimal places for precision
}

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
