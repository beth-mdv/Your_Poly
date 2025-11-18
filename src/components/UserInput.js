// src/components/UserInput.js
import React, { useState } from 'react';
import { Mic } from 'lucide-react'; 
import styles from '../styles/Chat.module.css';

// Тепер це завжди текстове поле
const UserInput = ({ onSubmit, placeholder = 'Ask anything...', isDisabled = false }) => {
  const [inputValue, setInputValue] = useState('');
  
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (inputValue.trim() && !isDisabled) {
      onSubmit(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className={styles.inputContainer}>
      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className={styles.inputField}
          disabled={isDisabled} 
        />
        <button 
          type="submit" 
          className={styles.submitButton}
          disabled={isDisabled || !inputValue.trim()} // Вимикаємо кнопку, якщо поле порожнє
        >
          <Mic size={24} style={{ opacity: isDisabled ? 0.5 : 1 }} /> 
        </button>
      </form>
    </div>
  );
};

export default UserInput;