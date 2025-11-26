import React from 'react';
// ЗМІНА: Тепер імпортуємо стилі з App.module.css (якщо це модульний підхід)
// В реальному житті це може викликати попередження, але для мінімізації файлів - це ваш вибір.
import styles from '../styles/App.module.css'; 

const SuggestedQueries = ({ queries, onSelect }) => {
    if (!queries || queries.length === 0) return null;

    return (
        <div className={styles.sugContainer}> {/* Змінено на новий клас sugContainer */}
            {queries.map((query, index) => (
                <button
                    key={index}
                    // Змінено на новий клас sugButton
                    // Додано динамічний клас для імітації кольору.
                    className={`${styles.sugButton} ${styles[`sugButton-color-${(index % 3) + 1}`]}`} 
                    onClick={() => onSelect(query)}
                >
                    {query}
                </button>
            ))}
        </div>
    );
};

export default SuggestedQueries;