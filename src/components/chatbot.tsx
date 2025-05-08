import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
  id: number;
  text: string;
  type: 'text' | 'choice';
  options?: string[];
}

function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<{ sender: string; message: string; isEditable?: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editInput, setEditInput] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  // Fetch questions from backend on mount
  useEffect(() => {
    axios
      .get('http://localhost:3001/questions')
      .then((response) => {
        setQuestions(response.data);
        if (response.data.length > 0) {
          setChatHistory([{ sender: 'bot', message: response.data[0].text }]);
        }
      })
      .catch((err) => {
        setError('Failed to load questions. Please try again later.');
        console.error(err);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const answer = questions[currentQuestionIndex].type === 'text' ? userInput : selectedOption;
    if (!answer?.trim()) return;

    // Add user's response to chat history
    setChatHistory([...chatHistory, { sender: 'user', message: answer, isEditable: true }]);

    // Send answer to backend
    try {
      await axios.post('http://localhost:3001/answers', {
        questionId: questions[currentQuestionIndex].id,
        question: questions[currentQuestionIndex].text,
        answer,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError('Failed to save answer. Please try again.');
      console.error(err);
    }

    // Move to next question or show completion message
    const nextQuestionIndex = currentQuestionIndex + 1;
    if (nextQuestionIndex < questions.length) {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'bot', message: questions[nextQuestionIndex].text },
      ]);
      setCurrentQuestionIndex(nextQuestionIndex);
    } else {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'bot', message: 'Thank you for your responses! Would you like to start over?' },
      ]);
      setIsComplete(true);
    }

    setUserInput('');
    setSelectedOption(null);
  };

  const handleEdit = (index: number, message: string) => {
    setEditingIndex(index);
    setEditInput(message);
  };

  const handleSaveEdit = async (index: number) => {
    if (!editInput.trim()) return;

    // Update chat history
    const updatedHistory = [...chatHistory];
    updatedHistory[index].message = editInput;
    setChatHistory(updatedHistory);

    // Send updated answer to backend
    try {
      await axios.post('http://localhost:3001/answers', {
        questionId: questions[currentQuestionIndex - 1].id,
        question: questions[currentQuestionIndex - 1].text,
        answer: editInput,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError('Failed to save edited answer. Please try again.');
      console.error(err);
    }

    setEditingIndex(null);
    setEditInput('');
  };

  const handleRestart = (restart: boolean) => {
    if (restart) {
      setChatHistory([{ sender: 'bot', message: questions[0].text }]);
      setCurrentQuestionIndex(0);
      setIsComplete(false);
    } else {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'bot', message: 'Thank you for participating! Feel free to start again anytime.' },
      ]);
      setIsComplete(false);
    }
  };

  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-green-600">Organic Farming Survey</h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 text-center mt-2">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>
        <div className="min-h-[200px] mb-6">
          <AnimatePresence mode="wait">
            {chatHistory.length > 0 && !isComplete && (
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <p className="text-lg font-semibold text-gray-800 mb-4">
                  {chatHistory[chatHistory.length - 1].message}
                </p>
                {questions[currentQuestionIndex]?.type === 'text' ? (
                  <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Your answer..."
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={questions.length === 0}
                    />
                    <button
                      type="submit"
                      className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
                      disabled={questions.length === 0 || !userInput.trim()}
                    >
                      Submit
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      {questions[currentQuestionIndex]?.options?.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSelectedOption(option)}
                          className={`px-4 py-2 rounded-lg border ${
                            selectedOption === option
                              ? 'bg-green-500 text-white border-green-500'
                              : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
                      disabled={!selectedOption}
                    >
                      Submit
                    </button>
                  </form>
                )}
              </motion.div>
            )}
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <p className="text-lg font-semibold text-gray-800 mb-4">
                  {chatHistory[chatHistory.length - 1].message}
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => handleRestart(true)}
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleRestart(false)}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    No
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="h-48 overflow-y-auto p-4 bg-gray-50 rounded-lg">
          {chatHistory.map((chat, index) => (
            <div
              key={index}
              className={`mb-2 ${chat.sender === 'bot' ? 'text-left' : 'text-right'} flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {editingIndex === index ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editInput}
                    onChange={(e) => setEditInput(e.target.value)}
                    className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={() => handleSaveEdit(index)}
                    className="px-2 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <span
                    className={`inline-block p-2 rounded-lg ${
                      chat.sender === 'bot' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                    }`}
                  >
                    {chat.message}
                  </span>
                  {chat.isEditable && (
                    <button
                      onClick={() => handleEdit(index, chat.message)}
                      className="ml-2 text-gray-500 hover:text-green-500"
                    >
                      ✏️
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;