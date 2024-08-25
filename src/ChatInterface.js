// ChatInterface.js
import './App.css';
import React, { useState } from 'react';
import { askQuestion } from './api';

function ChatInterface({ token }) {
  const [message, setMessage] = useState('');

  const handleSendMessage = async () => {
    if (!token) {
      console.log('You must be logged in to send a message');
      return;
    }
    try {
      const response = await askQuestion(token, message);
      console.log('Response:', response);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="App">
      <aside className="sidemenu">
        <div className="side-menu-button">
          <span> + </span>
          New Chat
        </div>
      </aside>
      <section className="chatbox">
        <div className="chat-log">
          <div className="chat-message">
            <div className="chat-message-center">
              <div className="avatar"></div>
              <div className="message">Hello World</div>
            </div>
          </div>
          <div className="chat-message studymate">
            <div className="chat-message-center">
              <div className="avatar studymate"></div>
              <div className="message">I am an AI</div>
            </div>
          </div>
        </div>
        <div className="chat-input-holder">
          <textarea
            rows="1"
            className="chat-input-textarea"
            placeholder="Type your message here"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </section>
    </div>
  );
}

export default ChatInterface;
