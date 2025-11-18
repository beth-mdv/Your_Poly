// src/components/ChatBubble.js
import React from 'react';
import styles from '../styles/Chat.module.css';

const ChatBubble = ({ sender, children }) => {
  const isUser = sender === 'user';
  return (
    <div className={`${styles.chatBubble} ${isUser ? styles.userBubble : styles.polyBubble}`}>
      {children}
    </div>
  );
};

export default ChatBubble;