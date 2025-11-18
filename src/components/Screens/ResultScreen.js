// src/components/Screens/ResultScreen.js
import React from 'react';
import ChatBubble from '../ChatBubble';
import styles from '../../styles/App.module.css';

const ResultScreen = ({ userQuery, polyResponseData, onAcknowledge }) => {
  const { building, floor, details } = polyResponseData;
  
  return (
    <div className={styles.resultScreen}>
      {/* Запит користувача */}
      <ChatBubble sender="user">{userQuery}</ChatBubble> 

      {/* Відповідь Poly */}
      <div className={styles.polyResponseBox}>
        <p className={styles.polyText}>
          Got it! Room 114 is in **{building}**, on the **{floor}**, next to the stairs.
        </p>
        <p className={styles.polyTextSmall}>
          Check the map below and **follow the arrows to get there**.
        </p>
        <div className={styles.mapPlaceholder}>
          
        </div>
      </div>
      
      {/* Спеціальна кнопка "Thanks!" (Як окремий елемент, що імітує поле) */}
      <button 
          className={styles.resultActionButton} 
          onClick={() => onAcknowledge("Thanks!")}
      >
          Thanks!
      </button>
    </div>
  );
};

export default ResultScreen;