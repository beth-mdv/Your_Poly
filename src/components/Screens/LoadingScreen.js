// src/components/Screens/LoadingScreen.js
import React from 'react';
import styles from '../../styles/App.module.css';
import ChatBubble from '../ChatBubble';

const LoadingScreen = ({ userQuery }) => {
  return (
    <div className={styles.loadingScreen}>
      <ChatBubble sender="user">{userQuery}</ChatBubble>
      <p className={styles.loadingMessage}>One moment, I'm looking for your classroom...</p>
      {/* Тут можна додати кнопку зупинки, якщо потрібно */}
    </div>
  );
};

export default LoadingScreen;