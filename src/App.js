import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Registration from './Registration';
import Login from './Login';
import AskQuestion from './AskQuestion';
import ChatInterface from './ChatInterface';

function App() {
  const [token, setToken] = useState('');

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/register" 
            element={<Registration />} 
          />
          <Route 
            path="/login" 
            element={<Login setToken={setToken} />} 
          />
          <Route 
            path="/ask" 
            element={<AskQuestion token={token} />} 
          />
          <Route 
            path="/chat" 
            element={<ChatInterface token={token} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
