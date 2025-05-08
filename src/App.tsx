import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';

interface Question {
  id: number;
  text: string;
  type: 'text' | 'choice';
  options?: string[];
}

interface Answer {
  questionId: number;
  question: string;
  answer: string;
  timestamp: string;
}

function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [hasFirstName, setHasFirstName] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');

  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  // Fetch questions and answers from backend on mount
  useEffect(() => {
    // Fetch questions
    axios
      .get(`${API_URL}/questions`)
      .then((response) => {
        console.log('Fetched questions:', response.data);
        setQuestions(response.data);
      })
      .catch((err) => {
        setError('Failed to load questions. Please try again later.');
        console.error('Error fetching questions:', err);
      });

    // Fetch answers
    axios
      .get(`${API_URL}/answers`)
      .then((response) => {
        console.log('Fetched answers:', response.data);
        setAnswers(response.data);
      })
      .catch((err) => {
        console.error('Error fetching answers:', err);
      });
  }, []);

  const handleSubmit = async (answer: string) => {
    if (!answer?.trim()) return;

    // Store answer
    const questionText = questions[currentQuestionIndex].text;
    const newAnswer = {
      questionId: questions[currentQuestionIndex].id,
      question: questionText,
      answer,
      timestamp: new Date().toISOString(),
    };
    console.log('Submitting answer:', newAnswer);

    // Update local answers, replacing if exists
    const updatedAnswers = answers.filter((a) => a.questionId !== newAnswer.questionId);
    updatedAnswers.push(newAnswer);
    setAnswers(updatedAnswers);

    // Send answer to backend
    try {
      await axios.post(`${API_URL}/answers`, newAnswer);
    } catch (err) {
      setError('Failed to save answer. Please try again.');
      console.error('Error saving answer:', err);
    }

    // Move to next question or show completion
    const nextQuestionIndex = currentQuestionIndex + 1;
    if (nextQuestionIndex < questions.length) {
      setCurrentQuestionIndex(nextQuestionIndex);
      setHasFirstName(false); // Reset for next question
    } else {
      setIsComplete(true);
    }

    setUserInput('');
    setFirstName('');
    setLastName('');
    setSelectedOption(null);
  };

  const handleFirstNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && firstName.trim()) {
      e.preventDefault();
      console.log('First name entered:', firstName);
      setHasFirstName(true);
    }
  };

  const handleLastNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && lastName.trim()) {
      e.preventDefault();
      console.log('Last name entered:', lastName);
      handleSubmit(`${firstName} ${lastName}`);
    }
  };

  const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(userInput);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      const prevAnswer = answers.find((a) => a.questionId === questions[currentQuestionIndex - 1].id);
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setHasFirstName(false); // Reset name input stage
      if (prevAnswer) {
        if (questions[currentQuestionIndex - 1].id === 6) {
          const [prevFirstName, prevLastName] = prevAnswer.answer.split(' ');
          setFirstName(prevFirstName || '');
          setLastName(prevLastName || '');
          setHasFirstName(!!prevLastName); // Show last name input if both were answered
        } else if (questions[currentQuestionIndex - 1].type === 'text') {
          setUserInput(prevAnswer.answer);
        } else {
          setSelectedOption(prevAnswer.answer);
        }
      } else {
        setUserInput('');
        setFirstName('');
        setLastName('');
        setSelectedOption(null);
      }
      console.log('Navigated to previous question:', currentQuestionIndex - 1);
    }
  };

  const handleEdit = () => {
    setEditingAnswer(true);
    const currentAnswer = answers[reviewIndex].answer;
    if (questions.find((q) => q.id === answers[reviewIndex].questionId)?.id === 6) {
      const [first, last] = currentAnswer.split(' ');
      setEditFirstName(first || '');
      setEditLastName(last || '');
    } else {
      setEditFirstName(currentAnswer);
    }
  };

  const handleSaveEdit = async () => {
    let newAnswer = editFirstName;
    if (questions.find((q) => q.id === answers[reviewIndex].questionId)?.id === 6) {
      if (!editFirstName.trim() || !editLastName.trim()) return;
      newAnswer = `${editFirstName} ${editLastName}`;
    } else if (!editFirstName.trim()) {
      return;
    }

    // Update answer
    const updatedAnswer = {
      questionId: answers[reviewIndex].questionId,
      question: answers[reviewIndex].question,
      answer: newAnswer,
      timestamp: new Date().toISOString(),
    };
    console.log('Saving edited answer:', updatedAnswer);

    // Update local answers
    const updatedAnswers = answers.map((a, i) => (i === reviewIndex ? updatedAnswer : a));
    setAnswers(updatedAnswers);

    // Send updated answer to backend
    try {
      await axios.put(`${API_URL}/answers/${updatedAnswer.questionId}`, updatedAnswer);
    } catch (err) {
      setError('Failed to save edited answer. Please try again.');
      console.error('Error saving edited answer:', err);
    }

    setEditingAnswer(false);
    setEditFirstName('');
    setEditLastName('');
  };

  const handleReviewNext = () => {
    if (reviewIndex < answers.length - 1) {
      setReviewIndex(reviewIndex + 1);
      setEditingAnswer(false);
      setEditFirstName('');
      setEditLastName('');
    } else {
      setIsReviewing(false);
      setIsComplete(true);
    }
  };

  const handleRestart = (restart: boolean) => {
    if (restart) {
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setIsComplete(false);
      setIsExiting(false);
      setIsReviewing(false);
      setReviewIndex(0);
      setEditingAnswer(false);
      setEditFirstName('');
      setEditLastName('');
      setUserInput('');
      setFirstName('');
      setLastName('');
      setHasFirstName(false);
      setSelectedOption(null);
    } else {
      setIsComplete(false);
      setIsExiting(true);
    }
  };

  const handleExit = () => {
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setIsComplete(false);
    setIsExiting(false);
    setIsReviewing(false);
    setReviewIndex(0);
    setEditingAnswer(false);
    setEditFirstName('');
    setEditLastName('');
    setUserInput('');
    setFirstName('');
    setLastName('');
    setHasFirstName(false);
    setSelectedOption(null);
  };

  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  // Customize question text for dropdown
  const getQuestionText = (question: Question) => {
    if (question.id === 1) {
      return ['I', 'purchase organic products'];
    } else if (question.id === 2) {
      return ['I am most interested in organic', ''];
    } else if (question.id === 3) {
      return ['It is', 'to have verified purity reports (e.g., QR-based) for organic products'];
    } else if (question.id === 4) {
      return ['I prefer to connect with', 'for organic products'];
    }
    return [question.text, ''];
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-blue-50 p-4 sm:p-8">
      <motion.div
        className="w-11/12 max-w-full sm:max-w-5xl bg-white rounded-2xl shadow-3xl p-8 sm:p-12 flex flex-col justify-between h-full sm:h-[90vh]"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-center mb-8 sm:mb-12 text-green-700">
            Organic Farming Survey
          </h1>
          {error && <p className="text-red-500 text-center mb-6">{error}</p>}
          {!isReviewing && !isExiting && (
            <div className="mb-8 sm:mb-12">
              <div className="w-full bg-gray-200 rounded-full h-4 sm:h-5 shadow-inner">
                <motion.div
                  className="bg-green-500 h-4 sm:h-5 rounded-full shadow-sm"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                ></motion.div>
              </div>
              <p className="text-sm sm:text-base text-gray-600 text-center mt-3 sm:mt-4">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!isComplete && !isReviewing && !isExiting && questions.length > 0 && (
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.4 }}
                className="w-full text-center"
              >
                {questions[currentQuestionIndex].type === 'text' ? (
                  <div className="flex flex-col items-center gap-6 sm:gap-8">
                    {questions[currentQuestionIndex].id === 6 ? (
                      <motion.div
                        key={hasFirstName ? 'lastName' : 'firstName'}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <p className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-4 sm:mb-6">
                          {hasFirstName ? `First name :${firstName}, last name` : 'Your first name'}
                        </p>
                        <motion.input
                          type="text"
                          value={hasFirstName ? lastName : firstName}
                          onChange={(e) => (hasFirstName ? setLastName(e.target.value) : setFirstName(e.target.value))}
                          onKeyDown={hasFirstName ? handleLastNameKeyDown : handleFirstNameKeyDown}
                          placeholder={hasFirstName ? 'Last name...' : 'First name...'}
                          className="w-full max-w-xs sm:max-w-lg p-3 sm:p-4 border border-gray-200 rounded-lg text-base sm:text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          whileFocus={{ scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                          disabled={questions.length === 0}
                          autoFocus
                        />
                      </motion.div>
                    ) : (
                      <>
                        <p className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-4 sm:mb-6">
                          {questions[currentQuestionIndex].text}
                        </p>
                        <motion.input
                          type="text"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          onKeyDown={handleTextInputKeyDown}
                          placeholder="Your answer..."
                          className="w-full max-w-xs sm:max-w-lg p-3 sm:p-4 border border-gray-200 rounded-lg text-base sm:text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          whileFocus={{ scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                          disabled={questions.length === 0}
                          autoFocus
                        />
                      </>
                    )}
                    {currentQuestionIndex > 0 && (
                      <motion.button
                        onClick={handlePrevious}
                        className="px-8 sm:px-12 py-3 sm:py-4 bg-gray-500 text-white rounded-xl text-base sm:text-lg font-medium shadow-md hover:bg-gray-600"
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        Previous
                      </motion.button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6 sm:gap-8">
                    <p className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-4 sm:mb-6 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                      <span>{getQuestionText(questions[currentQuestionIndex])[0]}</span>
                      <motion.select
                        value={selectedOption || ''}
                        onChange={(e) => {
                          setSelectedOption(e.target.value);
                          handleSubmit(e.target.value);
                        }}
                        className="p-2 sm:p-3 border border-gray-200 rounded-lg text-base sm:text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white min-w-[150px] sm:min-w-[200px]"
                        whileFocus={{ scale: 1.05 }}
                        transition={{ duration: 0.2 }}
                        autoFocus
                      >
                        <option value="" disabled>
                          Select...
                        </option>
                        {questions[currentQuestionIndex].options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </motion.select>
                      <span>{getQuestionText(questions[currentQuestionIndex])[1]}</span>
                    </p>
                    {currentQuestionIndex > 0 && (
                      <motion.button
                        onClick={handlePrevious}
                        className="px-8 sm:px-12 py-3 sm:py-4 bg-gray-500 text-white rounded-xl text-base sm:text-lg font-medium shadow-md hover:bg-gray-600"
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        Previous
                      </motion.button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
            {isComplete && !isReviewing && !isExiting && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.4 }}
                className="w-full text-center"
              >
                <p className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-6 sm:mb-8">
                  Thank you for your responses! Would you like to start over?
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8">
                  <motion.button
                    onClick={() => handleRestart(true)}
                    className="px-8 sm:px-12 py-3 sm:py-4 bg-green-500 text-white rounded-xl text-base sm:text-lg font-medium shadow-md hover:bg-green-600"
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    Yes
                  </motion.button>
                  <motion.button
                    onClick={() => handleRestart(false)}
                    className="px-8 sm:px-12 py-3 sm:py-4 bg-gray-500 text-white rounded-xl text-base sm:text-lg font-medium shadow-md hover:bg-gray-600"
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    No
                  </motion.button>
                  <motion.button
                    onClick={() => setIsReviewing(true)}
                    className="px-8 sm:px-12 py-3 sm:py-4 bg-blue-500 text-white rounded-xl text-base sm:text-lg font-medium shadow-md hover:bg-blue-600"
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    Review Answers
                  </motion.button>
                </div>
              </motion.div>
            )}
            {isExiting && (
              <motion.div
                key="exit"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.4 }}
                className="w-full text-center"
              >
                <p className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-6 sm:mb-8">
                  Thank you, you can exit the screen now
                </p>
                <motion.button
                  onClick={handleExit}
                  className="px-8 sm:px-12 py-3 sm:py-4 bg-red-500 text-white rounded-xl text-base sm:text-lg font-medium shadow-md hover:bg-red-600"
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  Exit
                </motion.button>
              </motion.div>
            )}
            {isReviewing && (
              <motion.div
                key={`review-${reviewIndex}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.4 }}
                className="w-full text-center"
              >
                <p className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-4">
                  Q{reviewIndex + 1}: {answers[reviewIndex].question}
                </p>
                {editingAnswer ? (
                  <div className="flex flex-col items-center gap-6 sm:gap-8">
                    {questions.find((q) => q.id === answers[reviewIndex].questionId)?.id === 6 ? (
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full max-w-xs sm:max-w-lg">
                        <motion.input
                          type="text"
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                          placeholder="First name..."
                          className="w-full p-3 sm:p-4 border border-gray-200 rounded-lg text-base sm:text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          whileFocus={{ scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                          autoFocus
                        />
                        <motion.input
                          type="text"
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                          placeholder="Last name..."
                          className="w-full p-3 sm:p-4 border border-gray-200 rounded-lg text-base sm:text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          whileFocus={{ scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                    ) : questions.find((q) => q.id === answers[reviewIndex].questionId)?.type === 'text' ? (
                      <motion.input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        className="w-full max-w-xs sm:max-w-lg p-3 sm:p-4 border border-gray-200 rounded-lg text-base sm:text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        whileFocus={{ scale: 1.05 }}
                        transition={{ duration: 0.2 }}
                        autoFocus
                      />
                    ) : (
                      <motion.select
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="w-full max-w-xs sm:max-w-lg p-3 sm:p-4 border border-gray-200 rounded-lg text-base sm:text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        whileFocus={{ scale: 1.05 }}
                        transition={{ duration: 0.2 }}
                        autoFocus
                      >
                        <option value="" disabled>
                          Select...
                        </option>
                        {questions
                          .find((q) => q.id === answers[reviewIndex].questionId)
                          ?.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                      </motion.select>
                    )}
                    <motion.button
                      onClick={handleSaveEdit}
                      className="px-8 sm:px-12 py-3 sm:py-4 bg-green-500 text-white rounded-xl text-base sm:text-lg font-medium shadow-md hover:bg-green-600"
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      Save
                    </motion.button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6 sm:gap-8">
                    <p className="text-lg sm:text-xl text-gray-800">A: {answers[reviewIndex].answer}</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8">
                      <motion.button
                        onClick={handleEdit}
                        className="px-8 sm:px-12 py-3 sm:py-4 bg-blue-500 text-white rounded-xl text-base sm:text-lg font-medium shadow-md hover:bg-blue-600"
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        Edit
                      </motion.button>
                      <motion.button
                        onClick={handleReviewNext}
                        className="px-8 sm:px-12 py-3 sm:py-4 bg-green-500 text-white rounded-xl text-base sm:text-lg font-medium shadow-md hover:bg-green-600"
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        {reviewIndex < answers.length - 1 ? 'Next' : 'Done'}
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            {!isComplete && !isReviewing && !isExiting && questions.length === 0 && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full text-center"
              >
                <p className="text-2xl sm:text-3xl font-semibold text-gray-800">Loading questions...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default App;