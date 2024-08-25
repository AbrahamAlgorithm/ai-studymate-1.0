import React, { useState } from 'react';
import { askQuestion } from './api';

function AskQuestion({ token }) {
  const [question, setQuestion] = useState('');

  const handleAskQuestion = async () => {
    if (!token) {
      console.log('You must be logged in to ask a question');
      return;
    }
    try {
      const response = await askQuestion(token, question);
      console.log('Response from AI:', response);
    } catch (error) {
      console.error('Failed to ask question:', error);
    }
  };

  return (
    <div>
      <h2>Ask a Question</h2>
      <textarea 
        placeholder="Type your question here" 
        value={question} 
        onChange={(e) => setQuestion(e.target.value)} 
      />
      <button onClick={handleAskQuestion}>Ask</button>
    </div>
  );
}

export default AskQuestion;
